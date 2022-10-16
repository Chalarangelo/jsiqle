import Record from './record';
import { DuplicationError } from 'src/errors';
import { isUndefined, recordId } from 'src/types';
import symbols from 'src/symbols';
import { deepClone } from 'src/utils';

const {
  $fields,
  // $defaultValue,
  $properties,
  $cachedProperties,
  $methods,
  $relationships,
  $recordValue,
  $wrappedRecordValue,
  $recordModel,
  $recordTag,
  $isRecord,
  $get,
} = symbols;

// Collection/static responsibilities:
// 1. Create a new record
// 2. Update the record
// 3. Delete the record
//
// Record instance responsibilities:
// 1. Provide a getter for the record
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
    // Clone record data
    const clonedRecord = deepClone(recordData);
    const newRecordData = { id: newRecordId };

    this.#model[$fields].forEach((field, fieldName) => {
      const value = clonedRecord[fieldName];
      const isRelationship = this.#hasRelationshipField(fieldName);
      const recordValue =
        !isRelationship && isUndefined(value)
          ? field.createDefaultValue()
          : value;
      if (!isRelationship) {
        if (!field.typeCheck(recordValue))
          // Throw an error if the field value is invalid
          throw new TypeError(
            `${modelName} record has invalid value for field ${field.name}.`
          );
        if (!field.prevalidate('create', { value: recordValue }))
          // Throw an error if the field value is invalid
          throw new TypeError(
            `${modelName} record has invalid value for field ${field.name}.`
          );
      }
      newRecordData[fieldName] = recordValue;
    });

    // All prevalidations passing, let's add values to unique sets
    this.#model[$fields].forEach((field, fieldName) => {
      if (this.#hasRelationshipField(fieldName)) return;
      field.addValue(newRecordData[fieldName]);
    });

    const newRecord = new Record(newRecordData, this);
    return [newRecordId, newRecord];
  }

  updateRecord(record, diffData) {
    if (typeof diffData !== 'object')
      throw new TypeError('Record data must be an object.');
    const modelName = this.#getModelName();

    const clonedPreviousRecord = deepClone(
      RecordHandler.#recordToObject(record, this.#model)()
    );
    const clonedDiffData = deepClone(diffData);
    const newRecordData = { id: record.id };

    this.#model[$fields].forEach((field, fieldName) => {
      const previous = clonedPreviousRecord[fieldName];
      const value = clonedDiffData[fieldName];
      const isRelationship = this.#hasRelationshipField(fieldName);
      const recordValue = !isUndefined(value) ? value : previous;
      if (!isRelationship) {
        if (!field.typeCheck(recordValue))
          // Throw an error if the field value is invalid
          throw new TypeError(
            `${modelName} record has invalid value for field ${field.name}.`
          );
        if (!field.prevalidate('update', { value: recordValue, previous }))
          // Throw an error if the field value is invalid
          throw new TypeError(
            `${modelName} record has invalid value for field ${field.name}.`
          );
      }
      newRecordData[fieldName] = recordValue;
    });

    // All prevalidations passing, let's add values to unique sets
    this.#model[$fields].forEach((field, fieldName) => {
      if (this.#hasRelationshipField(fieldName)) return;
      field.updateValue(
        clonedPreviousRecord[fieldName],
        newRecordData[fieldName]
      );
    });

    const newRecord = new Record(newRecordData, this);
    record.makeObsolete;
    return [record.id, newRecord];
  }

  deleteRecord(record) {
    const recordId = record.id;
    this.#model[$fields].forEach((field, fieldName) => {
      const value = record[fieldName];
      const isRelationship = this.#hasRelationshipField(fieldName);
      if (!isRelationship) {
        field.deleteValue(value);
      }
    });
    record.makeObsolete;
    return recordId;
  }

  /*  ======  Trap definitions  ======  */

  get(record, property) {
    // TODO: We can fast query and reference the new value of the record via
    // the model itself
    if (record.isObsolete && property !== 'id') {
      throw new ReferenceError(
        `Record ${this.getRecordId(record)} is obsolete.`
      );
    }
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

  set() {
    throw new TypeError(
      `Cannot alter record of model ${this.#getModelName()}. Use an appropriate API method to update the record.`
    );
  }

  // Private methods

  static #recordToObject(record, model) {
    const recordValue = record[$recordValue];
    const fields = model[$fields];
    const object = {
      id: recordValue.id,
    };

    fields.forEach((field, fieldName) => {
      const value = recordValue[fieldName];
      if (value !== undefined) object[fieldName] = recordValue[fieldName];
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
        record[$wrappedRecordValue]
      );
      record[$cachedProperties].set(property, value);
      return value;
    }
    return this.#model[$properties].get(property)(record[$wrappedRecordValue]);
  }

  #hasMethod(method) {
    return this.#model[$methods].has(method);
  }

  #getMethod(record, method) {
    const methodFn = this.#model[$methods].get(method);
    return (...args) => methodFn(record[$wrappedRecordValue], ...args);
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
    return [
      $recordModel,
      $recordTag,
      $recordValue,
      $isRecord,
      'makeObsolete',
      'isObsolete',
    ].includes(property);
  }

  #getKnownSymbol(record, property) {
    if (property === $isRecord) return true;
    return record[property];
  }
}

export default RecordHandler;
