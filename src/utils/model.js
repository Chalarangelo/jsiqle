import { Field } from 'src/field';
import { Relationship } from 'src/relationship';
import { DuplicationError, DefaultValueError } from 'src/errors';
import { standardTypes, key } from 'src/types';
import { validateObjectWithUniqueName } from './common';
import symbols from 'src/symbols';

const { $defaultValue, $keyType } = symbols;

const allStandardTypes = [
  ...Object.keys(standardTypes),
  ...Object.keys(standardTypes).map(type => `${type}Required`),
  'enum',
  'enumRequired',
  'auto',
];

// TODO: Refactor fields, key to one argument, make an internal API for them

const createKey = options => {
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
        throw new DefaultValueError(
          `Key field ${name} does not have a default value.`
        );
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
  validateObjectWithUniqueName(
    {
      objectType: 'Field',
      parentType: 'Model',
      parentName: modelName,
    },
    field,
    [...fields.keys(), key]
  );

  const isStandardType = allStandardTypes.includes(field.type);

  if (isStandardType) return Field[field.type](field);
  else if (typeof field.type === 'function')
    console.warn(
      `The provided type for ${field.name} is not part of the standard types. Function types are experimental and may go away in a later release.`
    );
  return new Field(field);
};

export const parseModelRelationship = (
  modelName,
  relationship,
  fields,
  key
) => {
  validateObjectWithUniqueName(
    {
      objectType: 'Relationship',
      parentType: 'Model',
      parentName: modelName,
    },
    relationship,
    [...fields.keys(), key]
  );
  return new Relationship(relationship);
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

export const validateModelContains = (
  modelName,
  objectType,
  objectName,
  objects
) => {
  if (!objects.has(objectName)) {
    console.warn(
      `Model ${modelName} does not contain a ${objectType.toLowerCase()} named ${objectName}.`
    );
    return false;
  }
  return true;
};

export const applyModelFieldRetrofill = (field, records, retrofill) => {
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
  });
};
