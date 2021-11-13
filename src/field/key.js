import Field from './field';
import { DefaultValueError } from 'src/errors';
import { key } from 'src/types';
import symbols from 'src/symbols';

const { $defaultValue } = symbols;

class Key extends Field {
  constructor(name = 'id') {
    super({
      name,
      type: key,
      required: true,
      defaultValue: '__emptyKey__',
    });
  }

  get [$defaultValue]() {
    throw new DefaultValueError('Key field does not have a default value.');
  }
}

export default Key;
