import { ValidationError } from 'src/errors';
import { Validator } from 'src/validator';
import types from 'src/types';
import { capitalize } from 'src/utils';

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

export const parseFieldValidator = (fieldName, validator) => {
  if (typeof validator !== 'object')
    throw new TypeError(`Validator ${validator} is not an object.`);

  const { type, ...args } = validator;
  if (Validator[type] === undefined)
    throw new TypeError(`Validator ${type} is not defined.`);
  return [`${fieldName}${capitalize(type)}`, Validator[type](fieldName, args)];
};
