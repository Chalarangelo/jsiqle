import symbols from 'src/symbols';
import { ValidationError } from 'src/errors';
import { Validator } from 'src/validator';
import { validateName, capitalize } from 'src/utils';
import types, { standardTypes } from 'src/types';

const { $defaultValue, $validators } = symbols;

class Field {
  #name;
  #defaultValue;
  #type;
  #validators;

  constructor({ name, type, defaultValue = null, validators = {} }) {
    this.#name = validateName('Field', name);
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
    return types.optional(type);
  }

  static #validateDefaultValue(defaultValue, type) {
    if (types.undefined(defaultValue)) return null;
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
Field.enum = ({ name, values }) =>
  new Field({ name, type: types.enum(...values) });

// Auto-field is special, handle it separately
Field.auto = options => {
  const name = typeof options === 'string' ? options : options.name;
  // Generator function to generate a new value each time
  function* autoGenerator() {
    let i = 0;
    while (true) yield i++;
  }
  const generator = autoGenerator();
  let currentValue = 0;
  // Create the field
  const autoField = new Field({
    name,
    type: value => value === currentValue,
    defaultValue: currentValue,
  });
  // Override the default value to be the next value in the sequence
  Object.defineProperty(autoField, $defaultValue, {
    get() {
      const value = generator.next().value;
      currentValue = value;
      return value;
    },
  });
  return autoField;
};

export { Field };
