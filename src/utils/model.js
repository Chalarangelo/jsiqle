import { Field, createKey } from 'src/field';
import { DuplicationError } from 'src/errors';
import { standardTypes } from 'src/types';
import symbols from 'src/symbols';

const { $defaultValue } = symbols;

const allStandardTypes = [
  ...Object.keys(standardTypes),
  ...Object.keys(standardTypes).map(type => `${type}Required`),
];

const fieldTypes = [...allStandardTypes, 'enum', 'enumRequired', 'auto'];

export const parseModelKey = (modelName, key, fields) => {
  if (typeof key !== 'string' && typeof key !== 'object')
    throw new TypeError(`Key ${key} is not a string or object.`);

  if (typeof key === 'object' && !key.name)
    throw new TypeError(`Key ${key} is missing a name.`);

  if (typeof key === 'object' && !['auto', 'string'].includes(key.type))
    throw new TypeError(`Key ${key} type must be either "string" or "auto".`);

  const _key = createKey(key);
  if (fields.has(_key.name))
    throw new DuplicationError(
      `Model ${modelName} already has a field named ${_key.name}.`
    );
  return _key;
};

export const parseModelField = (modelName, field, fields, key) => {
  if (typeof field !== 'object')
    throw new TypeError(`Field ${field} is not an object.`);

  if (!field.name) throw new TypeError(`Field ${field} is missing a name.`);

  if (!fieldTypes.includes(field.type) & (typeof field.type !== 'function'))
    throw new TypeError(
      `Field ${field.name} has an invalid type ${field.type}.`
    );

  if (fields.has(field.name) || key === field.name)
    throw new DuplicationError(
      `Model ${modelName} already has a field named ${field.name}.`
    );

  if (allStandardTypes.includes(field.type)) return Field[field.type](field);
  return new Field(field);
};

export const validateModelMethod = (
  callbackType,
  callbackName,
  callback,
  callbacks
) => {
  if (typeof callback !== 'function')
    throw new TypeError(`${callbackType} ${callbackName} is not a function.`);
  if (callbacks.has(callbackName))
    throw new DuplicationError(
      `${callbackType} ${callbackName} already exists.`
    );
  return callback;
};

export const validateModelContains = (objectType, objectName, objects) => {
  if (!objects.has(objectName))
    throw new Error(`${objectType} ${objectName} does not exist.`);
  return objectName;
};

export const applyModelFieldRetrofill = (
  modelName,
  field,
  records,
  retrofill
) => {
  if (!field.required && retrofill === undefined) return;

  const retrofillFunction =
    retrofill !== undefined
      ? typeof retrofill === 'function'
        ? retrofill
        : () => retrofill
      : record =>
          record[field.name] ? record[field.name] : field[$defaultValue];

  records.forEach(record => {
    record[field.name] = retrofillFunction(record);
    if (!field.typeCheck(record[field.name]))
      throw new Error(
        `${modelName} record has invalid value for field ${field.name}.`
      );
  });
};
