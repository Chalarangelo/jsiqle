import validators from 'src/utils/typeValidation';
import validateName from 'src/validation/nameValidation';
import { symbolize } from 'src/utils/symbols';
import { ValidationError } from 'src/Error';

const $defaultValue = symbolize('defaultValue');
const $isValidKey = symbolize('isValidKey');

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
    if (validateName('Field', name)) this.#name = name;

    // Set required
    this.#required = Boolean(required);

    // Verify type, wrap in optional if not required
    if (typeof type !== 'function')
      throw new TypeError('Field type must be a function.');
    this.#type = this.#required ? type : validators.optional(type);

    // Ensure default value is of correct type and not null or undefined if required
    if (this.#required && validators.nil(defaultValue))
      throw new ValidationError('Default value cannot be null or undefined.');
    if (!this.validate(defaultValue))
      throw new ValidationError('Default value must be valid.');
    this.#defaultValue = defaultValue;
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

  get [$isValidKey]() {
    if (!this.#required) return [false, 'is not required'];
    if ([validators.number, validators.string].includes(this.#type))
      return [true, null];
    return [false, 'type must be a number or string'];
  }
}

export default Field;
