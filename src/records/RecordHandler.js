import { symbolize } from 'src/utils/symbols';
import validators from 'src/utils/typeValidation';

const $fields = symbolize('fields');
const $methods = symbolize('methods');
const $recordValue = symbolize('recordValue');
const $recordModel = symbolize('recordModel');

export const recordToObject = (record, model) => {
  const recordValue = record[$recordValue];
  const fields = model[$fields];
  const object = {};
  fields.forEach(field => {
    const value = recordValue[field.name];
    if (value !== undefined) object[field.name] = recordValue[field.name];
  });
  // TODO: Add support for relations
  return () => object;
};

export class RecordHandler {
  constructor(model) {
    this.model = model;
  }

  get(record, property) {
    const recordValue = record[$recordValue];
    if (this.model[$fields].has(property)) return recordValue[property];
    if (this.model[$methods].has(property))
      return this.model[$methods].get(property)(recordValue);
    if (property === 'toObject') return recordToObject(record, this.model);
    if (property === $recordModel) return record[$recordModel];
  }

  set(record, property, value) {
    const recordValue = record[$recordValue];
    if (this.model[$fields].has(property)) {
      const field = this.model[$fields].get(property);
      const isFieldNil = validators.nil(recordValue[property]);
      // Set the default value if the field is null or undefined
      if (field.required && isFieldNil)
        recordValue[field.name] = field.defaultValue;
      // Throw an error if the field value is invalid
      if (!field.validate(recordValue[field.name])) {
        throw new Error(
          `${this.name} record has invalid value for field ${field.name}.`
        );
      }
    } else {
      console.warn(`${this.name} record has extra field: ${property}.`);
    }
    recordValue[property] = value;
  }
}
