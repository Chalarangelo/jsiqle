import symbols from 'src/symbols';
import { RelationshipField } from 'src/field';
import { setRecordField, recordToObject } from './utils';

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

  get(record, property) {
    const recordValue = record[$recordValue];
    if (this.model[$key].name === property) return recordValue[property];
    if (
      this.model[$fields].has(property) &&
      !(this.model[$fields].get(property) instanceof RelationshipField)
    )
      return recordValue[property];
    if (this.model[$methods].has(property))
      return this.model[$methods].get(property)(recordValue);
    if (this.model[$relationships].has(property))
      return this.model[$relationships].get(property).get(recordValue);
    if (property === 'toObject' || property === 'toJSON')
      return recordToObject(record, this.model, this);
    if (property === $recordModel) return record[$recordModel];
    if (property === $recordTag) return record[$recordTag];
    if (property === $isRecord) return true;
    if (property === $key) return recordValue[this.model[$key].name];
    if (property === 'toString')
      return () => recordValue[this.model[$key].name];
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
