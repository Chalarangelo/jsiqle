import symbols from 'src/symbols';
import {
  validateName,
  validateFieldType,
  validateFieldRequired,
  validateFieldDefaultValue,
} from 'src/validation';

const { $defaultValue } = symbols;

class Field {
  #name;
  #defaultValue;
  #required;
  #type;

  constructor({ name, type, required = false, defaultValue = null }) {
    this.#name = validateName('Field', name);
    this.#required = validateFieldRequired(required);
    this.#type = validateFieldType(type, required);
    this.#defaultValue = validateFieldDefaultValue(
      defaultValue,
      this.#type,
      this.#required
    );
  }

  get name() {
    return this.#name;
  }

  get required() {
    return this.#required;
  }

  get [$defaultValue]() {
    return this.#defaultValue;
  }
  typeCheck(value) {
    return this.#type(value);
  }
}

export default Field;
