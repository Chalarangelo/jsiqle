import validators from 'src/utils/typeValidation';
import isValidName from 'src/utils/nameValidation';
import { symbolize } from 'src/utils/symbols';

const $isValidKey = symbolize('isValidKey');

class Field {
  constructor(
    { name, type, required = false, defaultValue = null } = {
      required: false,
      defaultValue: null,
    }
  ) {
    // Verify name
    const [validName, error] = isValidName(name);
    if (!validName) throw `Field name ${error}.`;
    this.name = name;

    // Set required
    this.required = Boolean(required);

    // Verify type, wrap in optional if not required
    if (typeof type !== 'function')
      throw new Error('Field type must be a function.');
    this.type = this.required ? type : validators.optional(type);

    // Ensure default value is of correct type and not null or undefined if required
    if (this.required && validators.nil(defaultValue))
      throw new Error('Default value cannot be null or undefined.');
    if (!this.validate(defaultValue))
      throw new Error('Default value must be valid.');
    this.defaultValue = defaultValue;
  }

  validate(value) {
    return this.type(value);
  }

  get [$isValidKey]() {
    if (!this.required) return [false, 'is not required'];
    if ([validators.number, validators.string].includes(this.type))
      return [true, null];
    return [false, 'type must be a number or string'];
  }
}

export default Field;
