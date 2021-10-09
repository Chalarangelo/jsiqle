import validators from './typeValidation.js';

const isNil = val => val === null || val === undefined;

const parseType = type => {
  if (typeof type === 'string') return validators[type];
  if (typeof type === 'object') {
    const typeKeys = Object.keys(type);
    if (typeKeys.length !== 1) throw new Error('Invalid type object');
    const typeKey = typeKeys[0];
    const typeValue = type[typeKey];
    if (typeKey === 'oneOf') {
      const types = typeValue.map(parseType);
      return validators.oneOf(...types);
    } else if (typeKey === 'enum') {
      return validators.enum(...typeValue);
    } else if (typeKey === 'arrayOf') {
      return validators.arrayOf(parseType(typeValue));
    } else if (typeKey === 'objectOf') {
      return validators.objectOf(parseType(typeValue));
    } else if (typeKey === 'object') {
      const keys = Object.keys(typeValue);
      const shape = keys.reduce((acc, key) => {
        acc[key] = parseType(typeValue[key]);
        return acc;
      }, {});
      return validators.object(shape);
    } else {
      throw new Error('Invalid type object');
    }
  }
  throw new Error('Type must be a string or object');
};

class Field {
  constructor(
    { name, type, required = false, defaultValue = null } = {
      required: false,
      defaultValue: null,
    }
  ) {
    if (!name || typeof name !== 'string')
      throw new Error('Field name is required');
    if (!type) throw Error('Field type is required');
    if (required && !isNil(defaultValue))
      throw Error('Field cannot be required and have a default value');
    this.name = name;
    this.type = type;
    this.validators = parseType(type);
    this.required = required;
    this.defaultValue = defaultValue;
  }

  validate(value) {
    return this.validators(value);
  }

  toString() {
    return `${this.name}: ${JSON.stringify(this.type)}${
      this.required ? ' (required)' : ' (optional)'
    }${
      !isNil(this.defaultValue)
        ? ` (default: ${JSON.stringify(this.defaultValue)})`
        : ''
    }`;
  }
}

export default Field;
