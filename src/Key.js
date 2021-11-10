import Field from 'src/Field';
import validators from 'src/utils/typeValidation';
import { symbolize } from 'src/utils/symbols';
import { ValidationError } from 'src/Error';

const $defaultValue = symbolize('defaultValue');

const keyValidator = value =>
  validators.string(value) && value.trim().length !== 0;

class Key extends Field {
  #type;

  constructor(name = 'id') {
    super({
      name,
      type: keyValidator,
      required: true,
      defaultValue: '__emptyKey__',
    });
  }

  validate(value) {
    return this.#type(value);
  }

  get [$defaultValue]() {
    throw new ValidationError('Key field does not have a default value.');
  }
}

export default Key;
