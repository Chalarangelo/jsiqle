import { DuplicationError } from 'src/errors';
import { createKey } from 'src/field';

export const validateModelKey = (modelName, key, fields) => {
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
