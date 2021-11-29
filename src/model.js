import { RecordSet, RecordHandler } from 'src/record';
import { NameError } from 'src/errors';
import symbols from 'src/symbols';
import {
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
  $methods,
  $relationships,
  $relationshipField,
  $validators,
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
    Object.entries(methods).forEach(([methodName, method]) => {
      this.addMethod(methodName, method);
    });

    // Add scopes, checking for duplicates and invalids
    Object.entries(scopes).forEach(([scopeName, scope]) => {
      this.addScope(scopeName, scope);
    });

    // Add relationships, checking for duplicates and invalids
    this.#relationships = new Map();
    Object.entries(relationships).forEach(
      ([relationshipName, relationship]) => {
        this.addRelationship(relationshipName, relationship);
      }
    );

    // Add validators, checking for duplicates and invalids
    this.#validators = new Map();
    Object.entries(validators).forEach(([validatorName, validator]) => {
      this.addValidator(validatorName, validator);
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
      throw new NameError(`Field name ${field.name} does not match ${name}.`);
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
    const relationship = parseModelRelationship(
      this.name,
      relationshipOptions,
      this.#fields,
      this.#key
    );
    this.#fields.set(relationship.name, relationship[$relationshipField]);
    this.#relationships.set(relationship.name, relationship);
  }

  add(record) {
    const [newRecordKey, newRecord] = this.#recordHandler.createRecord(record);
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

  get [$validators]() {
    return this.#validators;
  }
}

export default Model;
