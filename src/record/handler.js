import Record from './record';
import Schema from '../schema';
import { DuplicationError } from 'src/errors';
import { isUndefined, recordId } from 'src/types';
import symbols from 'src/symbols';
import { deepClone } from 'src/utils';

const {
  $fields,
  $properties,
  $cachedProperties,
  $methods,
  $relationships,
  $recordValue,
  $wrappedRecordValue,
  $emptyRecordTemplate,
  $recordModel,
  $recordTag,
  $isRecord,
  $get,
  $schemaObject,
} = symbols;

class RecordHandler {
  #model;

  constructor(model) {
    this.#model = model;
  }

  get model() {
    return this.#model;
  }

  createRecord(recordData) {
    if (!recordData) throw new TypeError('Record data cannot be empty.');
    if (typeof recordData !== 'object')
      throw new TypeError('Record data must be an object.');
    const modelName = this.#getModelName();
    // Validate record id
    const newRecordId = RecordHandler.#validateNewRecordId(
      modelName,
      recordData.id,
      this.#model.records
    );

    // Create a new record from the template with the new id
    const newRecord = new Record(
      {
        id: newRecordId,
        ...this.#getEmptyRecordTemplate(),
      },
      this
    );

    // Set fields and skip validation
    this.#getFieldNames().forEach(field => {
      if (recordData[field] === undefined) return;
      this.set(newRecord, field, deepClone(recordData[field]), newRecord);
    });

    return [newRecordId, newRecord];
  }

  /*  ======  Trap definitions  ======  */

  get(record, property) {
    // Check relationships first to avoid matching them as fields
    if (this.#hasRelationshipField(property))
      return this.#getRelationship(record, property);
    // Id or field, return as-is
    if (this.#isRecordId(property) || this.#hasField(property))
      return this.#getFieldValue(record, property);
    // Property, get and call, this also matches relationship reverses (properties)
    if (this.#hasProperty(property)) return this.#getProperty(record, property);
    // Method, get and call
    if (this.#hasMethod(property)) return this.#getMethod(record, property);
    // Serialize method, call and return
    if (this.#isCallToSerialize(property))
      return RecordHandler.#recordToObject(record, this.#model, this);
    // Call toString method, return key value
    if (this.#isCallToString(property)) return () => this.getRecordId(record);
    // Known symbol, handle as required
    if (this.#isKnownSymbol(property))
      return this.#getKnownSymbol(record, property);
    // Unknown property, return undefined
    return undefined;
  }

  set(record, property, value) {
    // Receiver is the same as record but never used (API compatibility)
    const recordId = this.getRecordId(record);
    // Throw an error when trying to set a property, also catches
    // relationship reverses, safeguarding against issues there.
    if (this.#hasProperty(property))
      throw new TypeError(
        `${this.#getModelName()} record ${recordId} cannot set property ${property}.`
      );
    // Throw an error when trying to set a method.
    if (this.#hasMethod(property))
      throw new TypeError(
        `${this.#getModelName()} record ${recordId} cannot set method ${property}.`
      );
    // Validate and set field, warn if field is not defined
    /* istanbul ignore else*/
    if (this.#hasField(property)) {
      const field = this.#getField(property);
      RecordHandler.#setRecordField(
        this.#model.name,
        record,
        field,
        value,
        this.#hasRelationshipField(property)
      );
    }
    return true;
  }

  // Private methods

  static #setRecordField(modelName, record, field, value, isRelationship) {
    // Set the default value if the field is null or undefined
    const recordValue = !isRelationship && isUndefined(value) ? null : value;
    if (!isRelationship && !field.typeCheck(recordValue))
      // Throw an error if the field value is invalid
      throw new TypeError(
        `${modelName} record has invalid value for field ${field.name}.`
      );
    // We check for $wrappedRecordValue to ensure the record is wrapped in a
    // handler (i.e. initialized) and not a plain object (i.e. initializing).
    if (record[$wrappedRecordValue]) record[$cachedProperties].clear();
    record[$recordValue][field.name] = recordValue;
  }

  static #recordToObject(record, model) {
    const recordValue = record[$recordValue];
    const fields = model[$fields];
    const object = {
      id: recordValue.id,
    };

    fields.forEach(field => {
      const value = recordValue[field.name];
      if (value !== undefined) object[field.name] = recordValue[field.name];
    });

    return () => object;
  }

  static #validateNewRecordId = (modelName, id, records) => {
    let newRecordId = id;

    if (!recordId(newRecordId))
      throw new TypeError(`${modelName} record has invalid id.`);

    if (records.has(newRecordId))
      throw new DuplicationError(
        `${modelName} record with id ${newRecordId} already exists.`
      );
    return newRecordId;
  };

  /*  ======  Utility methods  ======  */

  #getModelName() {
    return this.#model.name;
  }

  #getFieldNames() {
    return [...this.#model[$fields].keys()];
  }

  #getEmptyRecordTemplate() {
    return this.#model[$emptyRecordTemplate];
  }

  #isRecordId(property) {
    return property === 'id';
  }

  getRecordId(record) {
    return record[$recordValue].id;
  }

  #hasField(property) {
    return this.#model[$fields].has(property);
  }

  #getField(property) {
    return this.#model[$fields].get(property);
  }

  #getFieldValue(record, property) {
    return record[$recordValue][property];
  }

  #hasProperty(property) {
    return this.#model[$properties].has(property);
  }

  #getProperty(record, property) {
    if (this.#model[$cachedProperties].has(property)) {
      if (record[$cachedProperties] && record[$cachedProperties].has(property))
        return record[$cachedProperties].get(property);
      const value = this.#model[$properties].get(property)(
        record[$wrappedRecordValue],
        Schema[$schemaObject]
      );
      record[$cachedProperties].set(property, value);
      return value;
    }
    return this.#model[$properties].get(property)(
      record[$wrappedRecordValue],
      Schema[$schemaObject]
    );
  }

  #hasMethod(method) {
    return this.#model[$methods].has(method);
  }

  #getMethod(record, method) {
    const methodFn = this.#model[$methods].get(method);
    return (...args) =>
      methodFn(record[$wrappedRecordValue], ...args, Schema[$schemaObject]);
  }

  #hasRelationshipField(property) {
    // A relationship field exists if a field with the same name exists and
    // a relationship exists named `${property}.${property}`. This is due to
    // relationships being stored as a `.`-delimited tuple of the relationship
    // name and the field/property name. In the case of the field name, it's the
    // same as the actual relationship name.
    if (!this.#hasField(property)) return false;
    return this.#model[$relationships].has(`${property}.${property}`);
  }

  #getRelationship(record, property) {
    // Get the relationship from the field only. The field name matches that of
    // the relationship, so the relationship key is ${property}.${property}`.
    return this.#model[$relationships]
      .get(`${property}.${property}`)
      [$get](this.#getModelName(), property, record[$recordValue]);
  }

  #isCallToSerialize(property) {
    return property === 'toObject' || property === 'toJSON';
  }

  #isCallToString(property) {
    return property === 'toString';
  }

  #isKnownSymbol(property) {
    return [$recordModel, $recordTag, $recordValue, $isRecord].includes(
      property
    );
  }

  #getKnownSymbol(record, property) {
    if (property === $isRecord) return true;
    return record[property];
  }
}

export default RecordHandler;
