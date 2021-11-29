import { RecordSet, RecordHandler } from 'src/record';
import { NameError, DuplicationError } from 'src/errors';
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
  $instances,
} = symbols;

export class Model {
  #records;
  #recordHandler;
  #fields;
  #key;
  #methods;
  #relationships;
  #validators;

  static #instances = new Map();

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

    if (Model.#instances.has(name))
      throw new DuplicationError(`A model named ${name} already exists.`);

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

    // Add the model to the instances map
    Model.#instances.set(this.name, this);
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
    applyModelFieldRetrofill(field, this.#records, retrofill);
  }

  removeField(name) {
    if (validateModelContains(this.name, 'Field', name, this.#fields))
      this.#fields.delete(name);
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
    if (validateModelContains(this.name, 'Method', name, this.#methods))
      this.#methods.delete(name);
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
    if (validateModelContains(this.name, 'Validator', name, this.#validators))
      this.#validators.delete(name);
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

  static get [$instances]() {
    return Model.#instances;
  }
}

export default Model;
