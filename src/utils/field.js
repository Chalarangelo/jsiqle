import { ValidationError } from 'src/errors';
import types from 'src/types';

export const validateFieldType = (type, required) => {
  if (typeof type !== 'function') {
    throw new TypeError('Field type must be a function.');
  }
  return required ? type : types.optional(type);
};

export const validateFieldRequired = required => {
  if (typeof required !== 'boolean') {
    throw new TypeError('Field required must be a boolean.');
  }
  return required;
};

export const validateFieldDefaultValue = (defaultValue, type, required) => {
  if (required && types.nil(defaultValue))
    throw new ValidationError('Default value cannot be null or undefined.');
  if (!type(defaultValue))
    throw new ValidationError('Default value must be valid.');
  return defaultValue;
};
