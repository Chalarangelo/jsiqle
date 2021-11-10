import RecordSet from 'src/records/RecordSet';
import Field from 'src/Field';
import Key from 'src/Key';
import { symbolize } from 'src/utils/symbols';
import { deepClone } from 'src/utils/deepClone';
import validateName from 'src/validation/nameValidation';
import validators from 'src/utils/typeValidation';
import { Record } from 'src/records/Record';
import { RecordHandler } from 'src/records/RecordHandler';

const $fields = symbolize('fields');
const $key = symbolize('key');
const $methods = symbolize('methods');
const $scopes = symbolize('scopes');
const $records = symbolize('records');
const $recordHandler = symbolize('recordHandler');
const $defaultValue = symbolize('defaultValue');

// Validate key's existence and type
const validateKey = (modelName, key, fields) => {
  if (!(key instanceof Key)) throw new Error(`Key ${key} is not a Key.`);
  if (fields.has(key))
    throw new Error(`Model ${modelName} already has a field named ${key}.`);
  return key;
};

const validateCallback = (callbackType, callbackName, callback, callbacks) => {
  if (typeof callback !== 'function')
    throw new Error(`${callbackType} ${callbackName} is not a function.`);
  if (callbacks.has(callbackName))
    throw new Error(`${callbackType} ${callbackName} already exists.`);
  return callback;
};

const validateExistence = (objectType, objectName, objects) => {
  if (!objects.has(objectName))
    throw new Error(`${objectType} ${objectName} does not exist.`);
  return objectName;
};

class Model {
  constructor({
    name,
    fields,
    key,
    methods = {},
    scopes = {},
    // relations,
    // hooks,
    // validations,
    // indexes,
  } = {}) {
    this.name = validateName('Model', name);

    // Create the record storage and handler
    // This needs to be initialized before fields to allow for retrofilling
    this[$records] = new RecordSet();
    this[$recordHandler] = new RecordHandler(this);

    // Add fields, checking for duplicates and invalids
    this[$fields] = new Map();
    fields.forEach(field => this.addField(field));

    // Check and create the key field
    this[$key] = validateKey(this.name, key, this[$fields]);

    // Add methods, checking for duplicates and invalids
    this[$methods] = new Map();
    Object.keys(methods).forEach(methodName => {
      this.addMethod(methodName, methods[methodName]);
    });

    // Add scopes, checking for duplicates and invalids
    this[$scopes] = new Set();
    Object.keys(scopes).forEach(scopeName => {
      this.addScope(scopeName, scopes[scopeName]);
    });
  }

  addField(field, retrofill) {
    if (!(field instanceof Field))
      throw new Error(`Field ${field} is not a Field.`);
    if (this[$fields].has(field.name))
      throw new Error(`Duplicate field name ${field.name}.`);

    this[$fields].set(field.name, field);

    // Retrofill records with new fields
    const isRetrofillFunction = typeof retrofill === 'function';
    this[$records].forEach(record => {
      record[field.name] = isRetrofillFunction ? retrofill(record) : retrofill;
      if (!field.validate(record[field.name])) {
        throw new Error(
          `${this.name} record has invalid value for field ${field.name}.`
        );
      }
    });
  }

  removeField(name) {
    this[$fields].delete(validateExistence('Field', name, this[$fields]));
  }

  updateField(name, field) {
    if (!(field instanceof Field))
      throw new Error(`Field ${field} is not a Field.`);
    if (field.name !== name)
      throw new Error(`Field name ${field.name} does not match ${name}.`);
    this.removeField(name);
    this.addField(field);
  }

  addMethod(name, method) {
    this[$methods].set(
      name,
      validateCallback('Method', name, method, this[$methods])
    );
  }

  removeMethod(name) {
    this[$methods].delete(validateExistence('Method', name, this[$methods]));
  }

  addScope(name, scope) {
    validateCallback('Scope', name, scope, this[$scopes]);
    if (this[name]) throw new Error(`Scope name ${name} is already in use.`);

    this[$scopes].add(name);
    Object.defineProperty(this, name, {
      get: () => {
        return this.where(scope);
      },
    });
  }

  removeScope(name) {
    this[$scopes].delete(validateExistence('Scope', name, this[$scopes]));
    delete this[name];
  }

  add(record) {
    if (!record) throw new Error('Record is required');

    const newRecordKey = record[this[$key].name];
    if (newRecordKey === undefined)
      throw new Error(`${this.name} record has no key.`);
    if (this[$records].has(newRecordKey))
      throw new Error(
        `${this.name} record with key ${newRecordKey} already exists.`
      );

    const newRecord = deepClone(record);
    const newRecordFields = new Set(Object.keys(newRecord));
    this[$fields].forEach(field => {
      const isFieldNil = validators.nil(newRecord[field.name]);
      // Set the default value if the field is null or undefined
      if (field.required && isFieldNil)
        newRecord[field.name] = field[$defaultValue];
      // Throw an error if the field value is invalid
      if (!field.validate(newRecord[field.name])) {
        throw new Error(
          `${this.name} record has invalid value for field ${field.name}.`
        );
      }
      newRecordFields.delete(field.name);
    });

    if (newRecordFields.size > 0)
      console.warn(
        `${this.name} record has extra fields: ${[...newRecordFields].join(
          ', '
        )}.`
      );

    this[$records].set(newRecordKey, newRecord);
    return new Record(newRecord, this[$recordHandler]);
  }

  get(key) {
    return new Record(this[$records].get(key), this[$recordHandler]);
  }

  delete(key) {
    if (!this[$records].has(key))
      throw new Error(`${this.name} record with key ${key} does not exist.`);

    this[$records].delete(key);
  }

  get records() {
    return this[$records].map(
      object => new Record(object, this[$recordHandler])
    );
  }

  clear() {
    this[$records].clear();
  }

  get first() {
    return this[$records].first;
  }

  get last() {
    return this[$records].last;
  }

  get count() {
    return this[$records].size;
  }

  where(callbackFn) {
    const records = this.records;
    return records.reduce((recordSet, record, key) => {
      if (callbackFn(record, key, records)) recordSet.set(key, record);
      return recordSet;
    }, new RecordSet());
  }

  whereNot(callbackFn) {
    const records = this.records;
    return records.reduce((recordSet, record, key) => {
      if (!callbackFn(record, key, records)) recordSet.set(key, record);
      return recordSet;
    }, new RecordSet());
  }

  find(key) {
    return this.get(key);
  }

  findBy(callbackFn) {
    const records = this.records;
    return records.find(callbackFn);
  }

  // Iterator
  // Batch iterator (configurable batch size)
  // Limit
  // Offset
}

export default Model;
