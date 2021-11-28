import { Record, RecordSet, RecordHandler } from 'src/record';
import symbols from 'src/symbols';
import {
  deepClone,
  parseModelKey,
  parseModelField,
  parseModelRelationship,
  validateName,
  validateModelMethod,
  validateModelContains,
  applyModelFieldRetrofill,
} from 'src/utils';

const {
  $fields,
  $key,
  $keyType,
  $defaultValue,
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
    key = 'id',
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
    this.#key = parseModelKey(this.name, key, this.#fields);

    // Add methods, checking for duplicates and invalids
    this.#methods = new Map();
    Object.keys(methods).forEach(methodName => {
      this.addMethod(methodName, methods[methodName]);
    });

    // Add scopes, checking for duplicates and invalids
    Object.keys(scopes).forEach(scopeName => {
      this.addScope(scopeName, scopes[scopeName]);
    });

    // Add relationships, checking for duplicates and invalids
    this.#relationships = new Map();
    Object.keys(relationships).forEach(relationName => {
      this.addRelationship(relationName, relationships[relationName]);
    });

    // Add validators, checking for duplicates and invalids
    this.#validators = new Map();
    Object.keys(validators).forEach(validatorName => {
      this.addValidator(validatorName, validators[validatorName]);
    });
  }

  addField(fieldOptions, retrofill) {
    const field = parseModelField(
      this.name,
      fieldOptions,
      this.#fields,
      this.#key
    );
    this.#fields.set(fieldOptions.name, field);

    // Retrofill records with new fields
    applyModelFieldRetrofill(this.name, field, this.#records, retrofill);
  }

  removeField(name) {
    this.#fields.delete(validateModelContains('Field', name, this.#fields));
  }

  updateField(name, field) {
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

  addRelationship(relationshipOptions) {
    const [relationship, relationshipField] = parseModelRelationship(
      this.name,
      relationshipOptions,
      this.#fields,
      this.#key
    );
    this.#fields.set(relationship.name, relationshipField);
    this.#relationships.set(relationship.name, relationship);
  }

  add(record) {
    if (!record) throw new Error('Record is required');

    let newRecordKey = record[this.#key.name];
    if (this.#key[$keyType] === 'string' && !this.#key.typeCheck(newRecordKey))
      throw new Error(
        `${this.name} record has invalid value for key ${this.#key.name}.`
      );
    if (this.#key[$keyType] === 'auto') newRecordKey = this.#key[$defaultValue];
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
