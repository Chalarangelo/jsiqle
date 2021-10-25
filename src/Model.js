import RecordSet from 'src/records/RecordSet';
import Field from 'src/Field';
import { symbolize } from 'src/utils/symbols';
import { deepClone } from 'src/utils/deepClone';
import validateName from 'src/validation/nameValidation';
import validators from 'src/utils/typeValidation';
import { Record } from 'src/records/Record';
import { RecordHandler } from 'src/records/RecordHandler';

const $fields = symbolize('fields');
const $key = symbolize('key');
const $methods = symbolize('methods');
const $records = symbolize('records');
const $recordHandler = symbolize('recordHandler');
const $isValidKey = symbolize('isValidKey');
const $defaultValue = symbolize('defaultValue');

class Model {
  constructor({
    name,
    fields,
    key,
    methods = {},
    // scopes,
    // relations,
    // hooks,
    // validations,
    // indexes,
  } = {}) {
    if (validateName('Model', name)) this.name = name;

    // Create the record storage and handler
    // This needs to be initialized before fields to allow for retrofilling
    this[$records] = new RecordSet();
    this[$recordHandler] = new RecordHandler(this);

    // Add fields, checking for duplicates and invalids
    this[$fields] = new Map();
    fields.forEach(field => this.addField(field));

    // Check and create the key field
    if (!this[$fields].has(key))
      throw new Error(`Model ${this.name} has no key field ${key}.`);
    const [validKey, keyError] = this[$fields].get(key)[$isValidKey];
    if (!validKey)
      throw new Error(`Model ${this.name} key field ${key} ${keyError}.`);
    this[$key] = key;

    // Add methods, checking for duplicates and invalids
    this[$methods] = new Map();
    Object.keys(methods).forEach(methodName => {
      this.addMethod(methodName, methods[methodName]);
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
    if (!this[$fields].has(name))
      throw new Error(`Field ${name} does not exist.`);

    this[$fields].delete(name);
  }

  updateField(name, field) {
    if (!(field instanceof Field))
      throw new Error(`Field ${field} is not a Field.`);
    this.removeField(name);
    this.addField(field);
  }

  addMethod(name, method) {
    if (typeof method !== 'function')
      throw new Error(`Method ${name} is not a function.`);
    if (this[$methods].has(name))
      throw new Error(`Method ${name} already exists.`);

    this[$methods].set(name, method);
  }

  removeMethod(name) {
    if (!this[$methods].has(name))
      throw new Error(`Method ${name} does not exist.`);

    this[$methods].delete(name);
  }

  add(record) {
    if (!record) throw new Error('Record is required');

    const newRecordKey = record[this[$key]];
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

  find(key) {
    return this.get(key);
  }

  findBy(callbackFn) {
    const records = this.records;
    return records.find(callbackFn);
  }

  // Iterator
  // Batch iterator (configurable batch size)
}

export default Model;
