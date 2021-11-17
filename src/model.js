import { Field, RelationshipField } from 'src/field';
import { Relationship } from 'src/relationship';
import { Record, RecordSet, RecordHandler } from 'src/record';
import symbols from 'src/symbols';
import { deepClone } from 'src/utils';
import {
  validateName,
  validateModelKey,
  validateModelMethod,
  validateModelContains,
} from 'src/validation';

const {
  $fields,
  $key,
  $methods,
  $relationships,
  $recordHandler,
  $addScope,
  $removeScope,
} = symbols;

export class Model {
  #records;
  #recordHandler;
  #fields;
  #key;
  #methods;
  #relationships;
  #validators;

  constructor({
    name,
    fields,
    key,
    methods = {},
    scopes = {},
    relationships = {},
    validators = {},
    // hooks,
  } = {}) {
    this.name = validateName('Model', name);

    // Create the record storage and handler
    // This needs to be initialized before fields to allow for retrofilling
    this.#records = new RecordSet();
    this.#recordHandler = new RecordHandler(this);

    // Add fields, checking for duplicates and invalids
    this.#fields = new Map();
    fields.forEach(field => this.addField(field));

    // Check and create the key field
    this.#key = validateModelKey(this.name, key, this.#fields);

    // Add methods, checking for duplicates and invalids
    this.#methods = new Map();
    Object.keys(methods).forEach(methodName => {
      this.addMethod(methodName, methods[methodName]);
    });

    // Add scopes, checking for duplicates and invalids
    Object.keys(scopes).forEach(scopeName => {
      this.addScope(scopeName, scopes[scopeName]);
    });

    this.#relationships = new Map();
    Object.keys(relationships).forEach(relationName => {
      this.addRelationship(relationName, relationships[relationName]);
    });

    this.#validators = new Map();
    Object.keys(validators).forEach(validatorName => {
      this.addValidator(validatorName, validators[validatorName]);
    });
  }

  addField(field, retrofill) {
    if (!(field instanceof Field))
      throw new Error(`Field ${field} is not a Field.`);
    if (this.#fields.has(field.name))
      throw new Error(`Duplicate field name ${field.name}.`);

    this.#fields.set(field.name, field);

    // Retrofill records with new fields
    const isRetrofillFunction = typeof retrofill === 'function';
    this.#records.forEach(record => {
      record[field.name] = isRetrofillFunction ? retrofill(record) : retrofill;
      if (!field.validate(record[field.name])) {
        throw new Error(
          `${this.name} record has invalid value for field ${field.name}.`
        );
      }
    });
  }

  removeField(name) {
    this.#fields.delete(validateModelContains('Field', name, this.#fields));
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
    this.#methods.set(
      name,
      validateModelMethod('Method', name, method, this.#methods)
    );
  }

  removeMethod(name) {
    this.#methods.delete(validateModelContains('Method', name, this.#methods));
  }

  addScope(name, scope) {
    this.#records[$addScope](name, scope);
  }

  removeScope(name) {
    this.#records[$removeScope](name);
  }

  addRelationship(relationship) {
    if (!(relationship instanceof Relationship))
      throw new Error(`Relation ${relationship} is not a Relation.`);
    const { name } = relationship;
    if (this.#fields.has(name))
      throw new Error(`Field ${name} already exists.`);
    this.#fields.set(name, new RelationshipField(relationship));
    this.#relationships.set(name, relationship);
  }

  add(record) {
    if (!record) throw new Error('Record is required');

    const newRecordKey = record[this.#key.name];
    if (newRecordKey === undefined)
      throw new Error(`${this.name} record has no key.`);
    if (this.#records.has(newRecordKey))
      throw new Error(
        `${this.name} record with key ${newRecordKey} already exists.`
      );

    const clonedRecord = deepClone(record);
    const extraFields = Object.keys(clonedRecord).filter(
      key => !this.#fields.has(key) && key !== this.#key.name
    );

    if (extraFields.length > 0) {
      console.warn(
        `${this.name} record has extra fields: ${extraFields.join(', ')}.`
      );
    }

    const newRecord = new Record(
      {
        [this.#key.name]: newRecordKey,
        ...extraFields.reduce(
          (obj, key) => ({ ...obj, [key]: clonedRecord[key] }),
          {}
        ),
      },
      this.#recordHandler
    );
    this.#fields.forEach(field => {
      newRecord[field.name] = clonedRecord[field.name];
    });

    this.#validators.forEach((validator, validatorName) => {
      if (!validator(newRecord, this.#records))
        throw new Error(
          `${this.name} record with key ${newRecordKey} failed validation for ${validatorName}.`
        );
    });

    this.#records.set(newRecordKey, newRecord);
    return newRecord;
  }

  addValidator(name, validator) {
    this.#validators.set(
      name,
      validateModelMethod('Validator', name, validator, this.#validators)
    );
  }

  removeValidator(name) {
    this.#validators.delete(
      validateModelContains('Validator', name, this.#validators)
    );
  }

  get records() {
    return this.#records;
  }

  getField(name) {
    if (name === this.#key.name) return this.#key;
    return this.#fields.get(name);
  }

  hasField(name) {
    return this.#key.name === name || this.#fields.has(name);
  }

  get [$recordHandler]() {
    return this.#recordHandler;
  }

  get [$fields]() {
    return this.#fields;
  }

  get [$key]() {
    return this.#key;
  }

  get [$methods]() {
    return this.#methods;
  }

  get [$relationships]() {
    return this.#relationships;
  }
}

export default Model;
