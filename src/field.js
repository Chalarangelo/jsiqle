import symbols from 'src/symbols';
import { ValidationError } from 'src/errors';
import { isUndefined, isOptional, isEnum, standardTypes } from 'src/types';

const { $defaultValue } = symbols;

class Field {
  #name;
  #defaultValue;
  #type;

  constructor({ name, type, defaultValue = null }) {
    this.#name = name;
    this.#type = Field.#validateType(type);
    this.#defaultValue = Field.#validateDefaultValue(defaultValue, this.#type);
  }

  get name() {
    return this.#name;
  }

  typeCheck(value) {
    return this.#type(value);
  }

  // Protected (package internal-use only)

  get [$defaultValue]() {
    return this.#defaultValue;
  }

  // Private

  static #validateType(type) {
    if (typeof type !== 'function')
      throw new TypeError('Field type must be a function.');
    return isOptional(type);
  }

  static #validateDefaultValue(defaultValue, type) {
    if (isUndefined(defaultValue)) return null;
    if (!type(defaultValue))
      throw new ValidationError('Default value must be valid.');
    return defaultValue;
  }
}

// Create convenience static methods on the Field class
Object.entries(standardTypes).forEach(([typeName, standardType]) => {
  const { type } = standardType;

  Field[typeName] = options => {
    if (typeof options === 'string') return new Field({ name: options, type });
    return new Field({ ...options, type });
  };
});

// Enum is special, handle it separately
Field.enum = ({ name, values }) => new Field({ name, type: isEnum(...values) });

export { Field };
