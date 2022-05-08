import symbols from 'src/symbols';
import { ValidationError } from 'src/errors';
import { Validator } from 'src/validator';
import { capitalize } from 'src/utils';
import { isUndefined, isOptional, isEnum, standardTypes } from 'src/types';

const { $defaultValue, $validators } = symbols;

class Field {
  #name;
  #defaultValue;
  #type;
  #validators;

  constructor({ name, type, defaultValue = null, validators = {} }) {
    this.#name = name;
    this.#type = Field.#validateType(type);
    this.#defaultValue = Field.#validateDefaultValue(defaultValue, this.#type);
    this.#validators = new Map();
    Object.entries(validators).forEach(([validatorName, validator]) => {
      this.addValidator(validatorName, validator);
    });
  }

  addValidator(validatorName, validator) {
    this.#validators.set(
      ...Field.#parseFieldValidator(this.#name, validatorName, validator)
    );
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

  get [$validators]() {
    return this.#validators;
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

  static #parseFieldValidator(fieldName, validatorName, validator) {
    if (Validator[validatorName] !== undefined)
      return [
        `${fieldName}${capitalize(validatorName)}`,
        Validator[validatorName](fieldName, validator),
      ];
    if (typeof validator !== 'function')
      throw new TypeError(`Validator ${validatorName} is not defined.`);
    return [
      `${fieldName}${capitalize(validatorName)}`,
      Validator.custom(fieldName, validator),
    ];
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
