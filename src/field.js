import symbols from 'src/symbols';
import { ValidationError } from 'src/errors';
import { Validator } from 'src/validator';
import { validateName, capitalize } from 'src/utils';
import types, { standardTypes } from 'src/types';

const { $defaultValue, $validators } = symbols;

class Field {
  #name;
  #defaultValue;
  #required;
  #type;
  #validators;

  constructor({
    name,
    type,
    required = false,
    defaultValue = null,
    validators = {},
  }) {
    this.#name = validateName('Field', name);
    this.#required = Field.#validateFieldRequired(required);
    this.#type = Field.#validateFieldType(type, required);
    this.#defaultValue = Field.#validateFieldDefaultValue(
      defaultValue,
      this.#type,
      this.#required
    );
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

  get required() {
    return this.#required;
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

  static #validateFieldType(type, required) {
    if (typeof type !== 'function') {
      throw new TypeError('Field type must be a function.');
    }
    return required ? type : types.optional(type);
  }

  static #validateFieldRequired(required) {
    if (typeof required !== 'boolean') {
      throw new TypeError('Field required must be a boolean.');
    }
    return required;
  }

  static #validateFieldDefaultValue(defaultValue, type, required) {
    if (required && types.nil(defaultValue))
      throw new ValidationError('Default value cannot be null or undefined.');
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
  const { type, defaultValue: typeDefaultValue } = standardType;

  Field[typeName] = options => {
    if (typeof options === 'string') return new Field({ name: options, type });
    return new Field({ ...options, type });
  };
  Field[`${typeName}Required`] = options => {
    if (typeof options === 'string')
      return new Field({
        name: options,
        type,
        required: true,
        defaultValue: typeDefaultValue,
      });
    const defaultValue = options.defaultValue || typeDefaultValue;
    return new Field({ ...options, type, required: true, defaultValue });
  };
});

// Enum is special, handle it separately
Field.enum = ({ name, values }) =>
  new Field({ name, type: types.enum(...values) });
Field.enumRequired = ({ name, values, defaultValue = values[0] }) =>
  new Field({
    name,
    type: types.enum(...values),
    required: true,
    defaultValue,
  });

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
    required: true,
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
