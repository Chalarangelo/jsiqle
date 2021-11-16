import { DuplicationError } from 'src/errors';

export const validateRecordSetMethod = (
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

export const validateRecordSetContains = (objectType, objectName, objects) => {
  if (!objects.has(objectName))
    throw new Error(`${objectType} ${objectName} does not exist.`);
  return objectName;
};
