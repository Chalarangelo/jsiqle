import validators from 'src/utils/typeValidation';
import validateName from 'src/validation/nameValidation';
import { symbolize } from 'src/utils/symbols';
import { ValidationError } from 'src/Error';

const $defaultValue = symbolize('defaultValue');

// Ensure type is a function, wrap in optional if not required
const validateType = (type, required) => {
  if (typeof type !== 'function') {
    throw new TypeError('Field type must be a function.');
  }
  return required ? type : validators.optional(type);
};

// Ensure required is a boolean
const validateRequired = required => {
  if (typeof required !== 'boolean') {
    throw new TypeError('Field required must be a boolean.');
  }
  return required;
};

// Ensure default value is of correct type and not null or undefined if required
const validateDefaultValue = (defaultValue, type, required) => {
  if (required && validators.nil(defaultValue))
    throw new ValidationError('Default value cannot be null or undefined.');
  if (!type(defaultValue))
    throw new ValidationError('Default value must be valid.');
  return defaultValue;
};

class Field {
  #name;
  #defaultValue;
  #required;
  #type;

  constructor(
    { name, type, required = false, defaultValue = null } = {
      required: false,
      defaultValue: null,
    }
  ) {
    this.#name = validateName('Field', name);
    this.#required = validateRequired(required);
    this.#type = validateType(type, required);
    this.#defaultValue = validateDefaultValue(
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

  validate(value) {
    return this.#type(value);
  }
}

export default Field;
