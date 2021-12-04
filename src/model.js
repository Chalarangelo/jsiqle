import EventEmitter from 'events';
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
  $scopes,
  $relationships,
  $relationshipField,
  $validators,
  $recordHandler,
  $addScope,
  $removeScope,
  $instances,
} = symbols;

// TODO: When adding methods, we must check if a field exists with the same name
// or the key has the same name. Similarly, when adding fields, we must check if
// a method exists with the same name. We just need a good old getter to grab
// all names real quick, otherwise it's complete chaos.
// Also methods might want to be name validated.
export class Model extends EventEmitter {
  #records;
  #recordHandler;
  #fields;
  #key;
  #methods;
  #relationships;
  #validators;
  #updatingField = false;

  static #instances = new Map();

  constructor({
    name,
    fields = [],
    key = 'id',
    methods = {},
    scopes = {},
    relationships = {},
    validators = {},
    // Actually add named listeners here and store them in a symbol
    // so that it's easier to detach them when we want to.
    // hooks,
  } = {}) {
    super();
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
    if (!this.#updatingField)
      this.emit('beforeAddField', { field: fieldOptions, model: this });
    const field = parseModelField(
      this.name,
      fieldOptions,
      this.#fields,
      this.#key
    );
    this.#fields.set(fieldOptions.name, field);
    if (!this.#updatingField) this.emit('fieldAdded', { field, model: this });
    // Retrofill records with new fields
    // TODO: This before might be erroneous if the retrofill is non-existent
    // Evaluate for V2, we might want to check and not emit events.
    this.emit('beforeRetrofillField', { field, retrofill, model: this });
    applyModelFieldRetrofill(field, this.#records, retrofill);
    this.emit('fieldRetrofilled', { field, retrofill, model: this });
    if (!this.#updatingField)
      this.emit('change', { type: 'fieldAdded', field, model: this });
    return field;
  }

  removeField(name) {
    if (!validateModelContains(this.name, 'Field', name, this.#fields)) return;
    const field = this.#fields.get(name);
    if (!this.#updatingField)
      this.emit('beforeRemoveField', { field, model: this });
    this.#fields.delete(name);
    if (!this.#updatingField) {
      this.emit('fieldRemoved', { field: { name }, model: this });
      this.emit('change', { type: 'fieldRemoved', field, model: this });
    }
  }

  updateField(name, field, retrofill) {
    if (field.name !== name)
      throw new NameError(`Field name ${field.name} does not match ${name}.`);
    const prevField = this.#fields.get(name);
    // Ensure that only update events are emitted, not add/remove ones.
    this.#updatingField = true;
    this.emit('beforeUpdateField', { prevField, field, model: this });
    this.removeField(name);
    const newField = this.addField(field, retrofill);
    this.emit('fieldUpdated', { field: newField, model: this });
    this.#updatingField = false;
    this.emit('change', { type: 'fieldUpdated', field: newField, model: this });
  }

  addMethod(name, method) {
    this.emit('beforeAddMethod', {
      method: { name, body: method },
      model: this,
    });
    this.#methods.set(
      name,
      validateModelMethod('Method', name, method, this.#methods)
    );
    this.emit('methodAdded', {
      method: { name, body: method },
      model: this,
    });
    this.emit('change', {
      type: 'methodAdded',
      method: { name, body: method },
      model: this,
    });
  }

  removeMethod(name) {
    if (!validateModelContains(this.name, 'Method', name, this.#methods))
      return;
    const method = this.#methods.get(name);
    this.emit('beforeRemoveMethod', {
      method: { name, body: method },
      model: this,
    });
    this.#methods.delete(name);
    this.emit('methodRemoved', {
      method: { name },
      model: this,
    });
    this.emit('change', {
      type: 'methodRemoved',
      method: { name, body: method },
      model: this,
    });
  }

  addScope(name, scope) {
    this.emit('beforeAddScope', {
      scope: { name, body: scope },
      model: this,
    });
    this.#records[$addScope](name, scope);
    this.emit('scopeAdded', {
      scope: { name, body: scope },
      model: this,
    });
    this.emit('change', {
      type: 'scopeAdded',
      scope: { name, body: scope },
      model: this,
    });
  }

  removeScope(name) {
    if (
      !validateModelContains(this.name, 'Scope', name, this.#records[$scopes])
    )
      return;
    const scope = this.#records[$scopes].get(name);
    this.emit('beforeRemoveScope', {
      scope: { name, body: scope },
      model: this,
    });
    this.#records[$removeScope](name);
    this.emit('scopeRemoved', {
      scope: { name },
      model: this,
    });
    this.emit('change', {
      type: 'scopeRemoved',
      scope: { name, body: scope },
      model: this,
    });
  }

  // TODO: Internalize!
  addRelationship([relationshipName, relationshipField], relationship) {
    this.emit('beforeAddRelationship', {
      relationship: {
        name: relationshipName,
        type: relationship.getType(this.modelName, relationshipName),
      },
      model: this,
    });
    this.#fields.set(relationshipName, relationshipField);
    this.emit('relationshipAdded', {
      relationship: {
        name: relationshipName,
        type: relationship.getType(this.modelName, relationshipName),
      },
      model: this,
    });
    this.emit('change', {
      type: 'relationshipAdded',
      relationship: {
        name: relationshipName,
        type: relationship.getType(this.modelName, relationshipName),
      },
      model: this,
    });
    this.#relationships.set(relationshipName, relationship);
  }

  // TODO: Evaluate these a bit more
  // TODO: No remove? fishy!
  // Most likely createRelationship should only be exposed from the schema and
  // not the model!!!
  createRelationship(relationshipOptions) {
    this.emit('beforeAddRelationship', relationshipOptions);
    const relationship = parseModelRelationship(
      this.name,
      relationshipOptions,
      this.#fields,
      this.#key
    );
    this.#fields.set(relationship.name, relationship[$relationshipField]);
    this.#relationships.set(relationship.name, relationship);
    this.emit('relationshipAdd', relationshipOptions);
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

  // Protected (package internal-use only)

  static get [$instances]() {
    return Model.#instances;
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
