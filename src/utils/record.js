import { DuplicationError } from 'src/errors';
import types from 'src/types';
import symbols from 'src/symbols';
const { $fields, $key, $keyType, $recordValue, $defaultValue } = symbols;

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
    throw new ReferenceError(`${objectType} ${objectName} does not exist.`);
  return objectName;
};

export const setRecordField = (modelName, record, field, value) => {
  // Set the default value if the field is null or undefined
  const recordValue =
    field.required && types.nil(value) ? field[$defaultValue] : value;
  if (!field.typeCheck(recordValue))
    // Throw an error if the field value is invalid
    throw new TypeError(
      `${modelName} record has invalid value for field ${field.name}.`
    );
  record[field.name] = recordValue;
};

export const recordToObject = (record, model, handler) => {
  const recordValue = record[$recordValue];
  const fields = model[$fields];
  const key = model[$key].name;
  const object = {
    [key]: recordValue[key],
  };

  fields.forEach(field => {
    const value = recordValue[field.name];
    if (value !== undefined) object[field.name] = recordValue[field.name];
  });

  const toObject = ({ include = [] } = {}) => {
    let result = object;

    // e.g. include: ['category', 'siblings.category']
    const included = include.map(name => {
      const [field, ...props] = name.split('.');
      return [field, props.join('.')];
    });

    included.forEach(([includedField, props]) => {
      if (object[includedField]) {
        if (Array.isArray(object[includedField])) {
          const records = handler.get(record, includedField);
          object[includedField] = records.map(record =>
            record.toObject({ include: [props] })
          );
        } else {
          object[includedField] = handler
            .get(record, includedField)
            .toObject({ include: [props] });
        }
      }
    });
    return result;
  };

  return toObject;
};

export const validateNewRecordKey = (
  modelName,
  modelKey,
  recordKey,
  records
) => {
  let newRecordKey = recordKey;
  if (modelKey[$keyType] === 'string' && !modelKey.typeCheck(newRecordKey))
    throw new TypeError(
      `${modelName} record has invalid value for key ${modelKey.name}.`
    );
  if (modelKey[$keyType] === 'auto') newRecordKey = modelKey[$defaultValue];
  if (records.has(newRecordKey))
    throw new DuplicationError(
      `${modelName} record with key ${newRecordKey} already exists.`
    );
  return newRecordKey;
};
