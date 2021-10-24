import { symbolize } from './utils/symbols.js';
import validators from './utils/typeValidation.js';

const $fields = symbolize('fields');
const $methods = symbolize('methods');
const $recordValue = symbolize('recordValue');
const $recordHandler = symbolize('recordHandler');
const $key = symbolize('key');

const recordToObject = (record, model) => {
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

export class Record {
  #recordValue;
  #recordHandler;

  constructor(value, handler) {
    this.#recordValue = value;
    this.#recordHandler = handler;
    return new Proxy(this, this.#recordHandler);
  }

  get [$recordHandler]() {
    return this.#recordHandler;
  }

  get [$recordValue]() {
    return this.#recordValue;
  }

  get [Symbol.toStringTag]() {
    const model = this[$recordHandler].model;
    const key = model[$key];
    return `${model.name}#${this[$recordValue][key]}`;
  }
}
