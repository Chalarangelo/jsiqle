import Field from './field';
import { DefaultValueError } from 'src/errors';
import { key } from 'src/types';
import symbols from 'src/symbols';

const { $defaultValue, $keyType } = symbols;

export const createKey = options => {
  let name = 'id';
  let type = 'string';
  if (typeof options === 'string') name = options;
  else if (typeof options === 'object') {
    name = options.name || name;
    type = options.type || type;
  }

  let keyField;

  if (type === 'string') {
    keyField = new Field({
      name,
      type: key,
      required: true,
      defaultValue: '__emptyKey__',
    });
    // Override the default value to throw an error
    Object.defineProperty(keyField, $defaultValue, {
      get() {
        throw new DefaultValueError('Key field does not have a default value.');
      },
    });
  } else if (type === 'auto') keyField = Field.auto(name);
  // Additional property to get the type from the model
  Object.defineProperty(keyField, $keyType, {
    get() {
      return type;
    },
  });

  return keyField;
};
