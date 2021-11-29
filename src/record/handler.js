import symbols from 'src/symbols';
import { setRecordField, recordToObject } from 'src/utils';

const {
  $fields,
  $key,
  $methods,
  $relationships,
  $recordValue,
  $recordModel,
  $recordTag,
  $isRecord,
} = symbols;

class RecordHandler {
  constructor(model) {
    this.model = model;
  }

  isModelKey(property) {
    return this.model[$key].name === property;
  }

  getKey(record) {
    return record[$recordValue][this.model[$key].name];
  }

  hasField(property) {
    return this.model[$fields].has(property);
  }

  getField(record, property) {
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

  getRelationship(record, property) {
    return this.model[$relationships].get(property).get(record[$recordValue]);
  }

  isCallToSerialize(property) {
    return property === 'toObject' || property === 'toJSON';
  }

  isCallToString(property) {
    return property === 'toString';
  }

  isKnownSymbol(property) {
    return [$recordModel, $recordTag, $isRecord, $key].includes(property);
  }

  getKnownSymbol(record, property) {
    if (property === $isRecord) return true;
    if (property === $key) this.getKey(record);
    return record[property];
  }

  get(record, property) {
    // Check relationships first to avoid matching them as fields
    if (this.hasRelationship(property)) this.getRelationship(record, property);
    // Key or field, return as-is
    if (this.isModelKey(property) || this.hasField(property))
      return this.getField(record, property);
    // Method, get and call
    if (this.hasMethod(property)) return this.getMethod(record, property);
    // Serialize method, call and return
    if (this.isCallToSerialize(property))
      return recordToObject(record, this.model, this);
    // Call toString method, return key value
    if (this.isCallToString(property)) return this.getKey(record);
    // Known symbol, handle as required
    if (this.isKnownSymbol(property))
      return this.getKnownSymbol(record, property);
    // Unknown property, return undefined
    return undefined;
  }

  set(record, property, value) {
    const recordValue = record[$recordValue];
    if (this.model[$fields].has(property)) {
      setRecordField(
        this.model.name,
        recordValue,
        this.model[$fields].get(property),
        value
      );
    } else {
      console.warn(`${this.name} record has extra field: ${property}.`);
      recordValue[property] = value;
    }
    return true;
  }
}

export default RecordHandler;
