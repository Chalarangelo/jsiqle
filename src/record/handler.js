import Record from './record';
import { DuplicationError } from 'src/errors';
import types from 'src/types';
import symbols from 'src/symbols';
import { deepClone } from 'src/utils';

const {
  $fields,
  $defaultValue,
  $key,
  $keyType,
  $methods,
  $relationships,
  $validators,
  $recordValue,
  $recordModel,
  $recordTag,
  $isRecord,
} = symbols;

class RecordHandler {
  constructor(model) {
    this.model = model;
  }

  createRecord(recordData) {
    if (!recordData) throw new TypeError('Record data cannot be empty.');
    const modelName = this.getModelName();
    // Validate record key
    const newRecordKey = RecordHandler.#validateNewRecordKey(
      modelName,
      this.getKey(),
      recordData[this.getKey().name],
      this.model.records
    );
    // Clone record data, check for extra properties
    const clonedRecord = deepClone(recordData);
    const extraProperties = Object.keys(clonedRecord).filter(
      property => !this.hasField(property) && !this.isModelKey(property)
    );
    if (extraProperties.length > 0) {
      console.warn(
        `${modelName} record has extra fields: ${extraProperties.join(', ')}.`
      );
    }
    // Create record with key and extra properties only
    const newRecord = new Record(
      {
        [this.getKey().name]: newRecordKey,
        ...extraProperties.reduce(
          (obj, property) => ({ ...obj, [property]: clonedRecord[property] }),
          {}
        ),
      },
      this
    );
    // Set fields and skip validation
    this.getFieldNames().forEach(field => {
      this.set(newRecord, field, clonedRecord[field], newRecord, true);
    });
    // Validate record just once
    this.getValidators().forEach((validator, validatorName) => {
      if (!validator(newRecord, this.model.records))
        throw new RangeError(
          `${modelName} record with key ${newRecordKey} failed validation for ${validatorName}.`
        );
    });

    return [newRecordKey, newRecord];
  }

  /*  ======  Utility methods  ======  */

  getModelName() {
    return this.model.name;
  }

  getFieldNames() {
    return [...this.model[$fields].keys()];
  }

  getValidators() {
    return this.model[$validators];
  }

  isModelKey(property) {
    return this.model[$key].name === property;
  }

  getKey() {
    return this.model[$key];
  }

  getKeyValue(record) {
    return record[$recordValue][this.model[$key].name];
  }

  hasField(property) {
    return this.model[$fields].has(property);
  }

  getField(property) {
    return this.model[$fields].get(property);
  }

  getFieldValue(record, property) {
    return record[$recordValue][property];
  }

  hasMethod(property) {
    return this.model[$methods].has(property);
  }

  getMethod(record, property) {
    return this.model[$methods].get(property)(record[$recordValue]);
  }

  hasRelationshipField(property) {
    // A relationship field exists if a field with the same name exists and
    // a relationship exists named `${property}.${property}`. This is due to
    // relationships being stored as a `.`-delimited tuple of the relationship
    // name and the field/method name. In the case of the field name, it's the
    // same as the actual relationship name.
    if (!this.hasField(property)) return false;
    return this.model[$relationships].has(`${property}.${property}`);
  }

  getRelationship(record, property) {
    // Get the relationship from the field only. The field name matches that of
    // the relationship, so the relationship key is ${property}.${property}`.
    return this.model[$relationships]
      .get(`${property}.${property}`)
      .get(this.getModelName(), property, record[$recordValue]);
  }

  isCallToSerialize(property) {
    return property === 'toObject' || property === 'toJSON';
  }

  isCallToString(property) {
    return property === 'toString';
  }

  isKnownSymbol(property) {
    return [$recordModel, $recordTag, $recordValue, $isRecord, $key].includes(
      property
    );
  }

  getKnownSymbol(record, property) {
    if (property === $isRecord) return true;
    if (property === $key) this.getKey();
    return record[property];
  }

  /*  ======  Trap definitions  ======  */

  get(record, property) {
    // Check relationships first to avoid matching them as fields
    if (this.hasRelationshipField(property))
      return this.getRelationship(record, property);
    // Key or field, return as-is
    if (this.isModelKey(property) || this.hasField(property))
      return this.getFieldValue(record, property);
    // Method, get and call, this also matches relationship reverses (methods)
    if (this.hasMethod(property)) return this.getMethod(record, property);
    // Serialize method, call and return
    if (this.isCallToSerialize(property))
      return RecordHandler.#recordToObject(record, this.model, this);
    // Call toString method, return key value
    if (this.isCallToString(property)) return this.getKeyValue(record);
    // Known symbol, handle as required
    if (this.isKnownSymbol(property))
      return this.getKnownSymbol(record, property);
    // Unknown property, return undefined
    return undefined;
  }

  set(record, property, value, receiver, skipValidation) {
    // Receiver is the same as record but never used (API compatibility)
    const recordValue = record[$recordValue];
    const recordKey = this.getKeyValue(record);
    const otherRecords = this.model.records.except(recordKey);
    // Throw an error when trying to set a method, also catches
    // relationship reverses, safeguarding against issues there.
    if (this.hasMethod(property))
      throw new TypeError(
        `${this.getModelName()} record ${recordKey} cannot set method ${property}.`
      );
    // Validate and set field, warn if field is not defined
    if (this.hasField(property)) {
      const field = this.getField(property);
      RecordHandler.#setRecordField(this.model.name, recordValue, field, value);
      // Never skip individual field validation
      field[$validators].forEach((validator, validatorName) => {
        if (!validator(recordValue, otherRecords))
          throw new RangeError(
            `${this.getModelName()} record with key ${recordKey} failed validation for ${validatorName}.`
          );
      });
    } else {
      console.warn(`${this.name} record has extra field: ${property}.`);
      recordValue[property] = value;
    }
    // Perform model validations
    // The last argument, `skipValidation`, is used to skip validation
    // and should only ever be set to `true` by the by the handler itself.
    if (!skipValidation) {
      this.getValidators().forEach((validator, validatorName) => {
        if (!validator(recordValue, otherRecords))
          throw new RangeError(
            `${this.getModelName()} record with key ${recordKey} failed validation for ${validatorName}.`
          );
      });
    }
    return true;
  }

  // Private methods

  static #setRecordField(modelName, record, field, value) {
    // Set the default value if the field is null or undefined
    const recordValue =
      field.required && types.nil(value) ? field[$defaultValue] : value;
    if (!field.typeCheck(recordValue))
      // Throw an error if the field value is invalid
      throw new TypeError(
        `${modelName} record has invalid value for field ${field.name}.`
      );
    record[field.name] = recordValue;
  }

  static #recordToObject(record, model, handler) {
    const recordValue = record[$recordValue];
    const fields = model[$fields];
    const key = model[$key].name;
    const object = {
      [key]: recordValue[key],
    };

    fields.forEach(field => {
      const value = recordValue[field.name];
      if (value !== undefined) object[field.name] = recordValue[field.name];
    });

    const toObject = ({ include = [] } = {}) => {
      let result = object;

      // e.g. include: ['category', 'siblings.category']
      const included = include.map(name => {
        const [field, ...props] = name.split('.');
        return [field, props.join('.')];
      });

      included.forEach(([includedField, props]) => {
        if (object[includedField]) {
          if (Array.isArray(object[includedField])) {
            const records = handler.get(record, includedField);
            object[includedField] = records.map(record =>
              record.toObject({ include: [props] })
            );
          } else {
            object[includedField] = handler
              .get(record, includedField)
              .toObject({ include: [props] });
          }
        }
      });
      return result;
    };

    return toObject;
  }

  static #validateNewRecordKey = (modelName, modelKey, recordKey, records) => {
    let newRecordKey = recordKey;

    if (modelKey[$keyType] === 'string' && !modelKey.typeCheck(newRecordKey))
      throw new TypeError(
        `${modelName} record has invalid value for key ${modelKey.name}.`
      );
    if (modelKey[$keyType] === 'auto') newRecordKey = modelKey[$defaultValue];

    if (records.has(newRecordKey))
      throw new DuplicationError(
        `${modelName} record with key ${newRecordKey} already exists.`
      );
    return newRecordKey;
  };
}

export default RecordHandler;
