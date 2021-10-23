import { symbolize } from './utils/symbols.js';
import validators from './utils/typeValidation.js';

const $fields = symbolize('fields');
const $methods = symbolize('methods');
const $recordValue = symbolize('recordValue');
const $recordHandler = symbolize('recordHandler');

export class RecordHandler {
  constructor(model) {
    this.model = model;
  }

  get(record, property) {
    if (this.model[$fields].has(property)) return record[property];
    if (this.model[$methods].has(property))
      return this.model[$methods].get(property)(record);
  }

  set(record, property, value) {
    if (this.model[$fields].has(property)) {
      const field = this.model[$fields].get(property);
      const isFieldNil = validators.isNil(record[property]);
      // Set the default value if the field is null or undefined
      if (field.required && isFieldNil) record[field.name] = field.defaultValue;
      // Throw an error if the field value is invalid
      if (!field.validate(record[field.name])) {
        throw new Error(
          `${this.name} record has invalid value for field ${field.name}.`
        );
      }
    } else {
      console.warn(`${this.name} record has extra field: ${property}.`);
    }
    record[property] = value;
  }
}

export class Record extends Proxy {
  constructor(value, handler) {
    super(value, handler);
    this[$recordValue] = value;
    this[$recordHandler] = handler;
  }

  toObject() {
    const model = this[$recordHandler].model;
    const object = {};
    model[$fields].forEach(field => {
      object[field.name] = this[$recordValue][field.name];
    });
    // TODO: Evalute if methods should actually be included in the object
    model[$methods].forEach(method => {
      object[method.name] = this[method.name];
    });
    // TODO: Add support for relations
    return object;
  }
}
