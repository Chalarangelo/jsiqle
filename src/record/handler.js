import Record from './record';
import symbols from 'src/symbols';
import {
  deepClone,
  setRecordField,
  recordToObject,
  validateNewRecordKey,
} from 'src/utils';

const {
  $fields,
  $key,
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
    const newRecordKey = validateNewRecordKey(
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

  hasRelationship(property) {
    return this.model[$relationships].has(property);
  }

  isRelationshipReceiver(property) {
    return this.model[$relationships]
      .get(property)
      .isReceiver(this.getModelName(), property);
  }

  getRelationship(record, property) {
    return this.model[$relationships]
      .get(property)
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
    if (this.hasRelationship(property))
      return this.getRelationship(record, property);
    // Key or field, return as-is
    if (this.isModelKey(property) || this.hasField(property))
      return this.getFieldValue(record, property);
    // Method, get and call
    if (this.hasMethod(property)) return this.getMethod(record, property);
    // Serialize method, call and return
    if (this.isCallToSerialize(property))
      return recordToObject(record, this.model, this);
    // Call toString method, return key value
    if (this.isCallToString(property)) return this.getKeyValue(record);
    // Known symbol, handle as required
    if (this.isKnownSymbol(property))
      return this.getKnownSymbol(record, property);
    // Unknown property, return undefined
    return undefined;
  }

  set(record, property, value, receiver, initCall) {
    // Receiver is the same as record but never used (API compatibility)
    const recordValue = record[$recordValue];
    const recordKey = this.getKeyValue(record);
    const otherRecords = this.model.records.except(recordKey);
    if (this.hasRelationship(property)) {
      if (this.isRelationshipReceiver(property) && !initCall) {
        throw new TypeError(
          `Cannot set ${this.getModelName()} record ${recordKey} relationship ${property} to ${value}. This model is a relationship receiver, please apply this update in reverse.`
        );
        // TODO: V2 enhancements
        // Probably figure out a clean way to implement the reverse relationship
        // update. Very expensive, but otherwise we'd have to remove symmetry
        // and implement a method to get the reverse relationship. Which might
        // not be the worst idea in the world!
      } else {
        const field = this.getField(property);
        setRecordField(this.model.name, recordValue, field, value);
      }
    }
    // Validate and set field, warn if field is not defined
    if (this.hasField(property)) {
      const field = this.getField(property);
      setRecordField(this.model.name, recordValue, field, value);
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
    // The last argument, `initCall`, is used to skip validation
    // and should only ever be set to `true` by the by the handler itself.
    if (!initCall) {
      this.getValidators().forEach((validator, validatorName) => {
        if (!validator(recordValue, otherRecords))
          throw new RangeError(
            `${this.getModelName()} record with key ${recordKey} failed validation for ${validatorName}.`
          );
      });
    }
    return true;
  }
}

export default RecordHandler;
