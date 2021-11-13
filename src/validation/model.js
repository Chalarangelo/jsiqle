import { DuplicationError } from 'src/errors';
import { Key } from 'src/field';

export const validateModelKey = (modelName, key, fields) => {
  if (!(key instanceof Key)) throw new TypeError(`Key ${key} is not a Key.`);
  if (fields.has(key))
    throw new DuplicationError(
      `Model ${modelName} already has a field named ${key}.`
    );
  return key;
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
