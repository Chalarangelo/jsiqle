import { Field } from 'src/field';
import { Relationship } from 'src/relationship';
import { DuplicationError, DefaultValueError } from 'src/errors';
import { standardTypes, key } from 'src/types';
import symbols from 'src/symbols';

const { $defaultValue, $keyType } = symbols;

const allStandardTypes = [
  ...Object.keys(standardTypes),
  ...Object.keys(standardTypes).map(type => `${type}Required`),
];

const fieldTypes = [...allStandardTypes, 'enum', 'enumRequired', 'auto'];

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

export const parseModelRelationship = (
  modelName,
  relationship,
  fields,
  key
) => {
  if (typeof relationship !== 'object')
    throw new TypeError(`Relationship ${relationship} is not an object.`);

  if (!relationship.name)
    throw new TypeError(`Relationship ${relationship} is missing a name.`);

  if (fields.has(relationship.name) || key === relationship.name)
    throw new DuplicationError(
      `Model ${modelName} already has a field named ${relationship.name}.`
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
  });
};
