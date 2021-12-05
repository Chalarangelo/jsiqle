import EventEmitter from 'events';
import { Schema } from 'src/schema';
import { Field } from 'src/field';
import { RecordSet, RecordHandler } from 'src/record';
import { NameError, DuplicationError, DefaultValueError } from 'src/errors';
import symbols from 'src/symbols';
import { standardTypes, key } from 'src/types';
import { validateObjectWithUniqueName, validateName } from 'src/utils';

const {
  $fields,
  $defaultValue,
  $key,
  $keyType,
  $methods,
  $scopes,
  $relationships,
  $validators,
  $recordHandler,
  $addScope,
  $addRelationshipAsField,
  $addRelationshipAsMethod,
  $getField,
  $getMethod,
  $removeScope,
  $instances,
  $handleExperimentalAPIMessage,
} = symbols;

const allStandardTypes = [
  ...Object.keys(standardTypes),
  ...Object.keys(standardTypes).map(type => `${type}Required`),
  'enum',
  'enumRequired',
  'auto',
];

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
    validators = {},
    // TODO: V2 Enhancements
    // Adding a hooks parameter would be an interesting idea. There's a blind
    // spot currently where we can't listen for events on model creation.
  } = {}) {
    super();
    this.name = validateName('Model', name);

    if (Model.#instances.has(name))
      throw new DuplicationError(`A model named ${name} already exists.`);

    // Create the record storage and handler
    // This needs to be initialized before fields to allow for retrofilling
    this.#records = new RecordSet();
    this.#recordHandler = new RecordHandler(this);

    // Check and create the key field, no need to check for duplicate fields
    this.#key = Model.#parseKey(this.name, key);

    // Initialize private fields
    this.#fields = new Map();
    this.#methods = new Map();
    this.#relationships = new Map();
    this.#validators = new Map();

    // Add fields, checking for duplicates and invalids
    fields.forEach(field => this.addField(field));

    // Add methods, checking for duplicates and invalids
    Object.entries(methods).forEach(([methodName, method]) => {
      this.addMethod(methodName, method);
    });

    // Add scopes, checking for duplicates and invalids
    Object.entries(scopes).forEach(([scopeName, scope]) => {
      this.addScope(scopeName, scope);
    });

    // Add validators, checking for duplicates and invalids
    Object.entries(validators).forEach(([validatorName, validator]) => {
      this.addValidator(validatorName, validator);
    });

    // Add the model to the instances map
    Model.#instances.set(this.name, this);
  }

  addField(fieldOptions, retrofill) {
    if (!this.#updatingField)
      this.emit('beforeAddField', { field: fieldOptions, model: this });
    const field = Model.#parseField(this.name, fieldOptions, [
      ...this.#fields.keys(),
      this.#key.name,
      ...this.#methods.keys(),
    ]);
    this.#fields.set(fieldOptions.name, field);
    if (!this.#updatingField) this.emit('fieldAdded', { field, model: this });
    // Retrofill records with new fields
    // TODO: V2 enhancements
    // This before might be erroneous if the retrofill is non-existent. We could
    // check for that and skip emitting the event if it's not there.
    this.emit('beforeRetrofillField', { field, retrofill, model: this });
    Model.#applyFieldRetrofill(field, this.#records, retrofill);
    this.emit('fieldRetrofilled', { field, retrofill, model: this });
    if (!this.#updatingField)
      this.emit('change', { type: 'fieldAdded', field, model: this });
    return field;
  }

  removeField(name) {
    if (!Model.#validateContains(this.name, 'Field', name, this.#fields))
      return false;
    const field = this.#fields.get(name);
    if (!this.#updatingField)
      this.emit('beforeRemoveField', { field, model: this });
    this.#fields.delete(name);
    if (!this.#updatingField) {
      this.emit('fieldRemoved', { field: { name }, model: this });
      this.emit('change', { type: 'fieldRemoved', field, model: this });
    }
    return true;
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
    const methodName = validateName('Method', name);
    this.#methods.set(
      methodName,
      Model.#validateMethod('Method', name, method, [
        ...this.#fields.keys(),
        this.#key.name,
        ...this.#methods.keys(),
      ])
    );
    this.emit('methodAdded', {
      method: { name: methodName, body: method },
      model: this,
    });
    this.emit('change', {
      type: 'methodAdded',
      method: { name: methodName, body: method },
      model: this,
    });
  }

  removeMethod(name) {
    if (!Model.#validateContains(this.name, 'Method', name, this.#methods))
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
    const scopeName = validateName('Scope', name);
    this.#records[$addScope](scopeName, scope);
    this.emit('scopeAdded', {
      scope: { name: scopeName, body: scope },
      model: this,
    });
    this.emit('change', {
      type: 'scopeAdded',
      scope: { name: scopeName, body: scope },
      model: this,
    });
  }

  removeScope(name) {
    if (
      !Model.#validateContains(this.name, 'Scope', name, this.#records[$scopes])
    )
      return false;
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
    return true;
  }

  addValidator(name, validator) {
    this.emit('beforeAddValidator', {
      validator: { name, body: validator },
      model: this,
    });
    // Validators are not name-validated by design.
    this.#validators.set(
      name,
      Model.#validateMethod('Validator', name, validator, this.#validators)
    );
    this.emit('validatorAdded', {
      validator: { name, body: validator },
      model: this,
    });
    this.emit('change', {
      type: 'validatorAdded',
      validator: { name, body: validator },
      model: this,
    });
  }

  removeValidator(name) {
    if (
      !Model.#validateContains(this.name, 'Validator', name, this.#validators)
    )
      return false;
    const validator = this.#validators.get(name);
    this.emit('beforeRemoveValidator', {
      validator: { name, body: validator },
      model: this,
    });
    this.#validators.delete(name);
    this.emit('validatorRemoved', {
      validator: { name },
      model: this,
    });
    this.emit('change', {
      type: 'validatorRemoved',
      validator: { name, body: validator },
      model: this,
    });
    return true;
  }

  // Record operations do not emit 'change' events by design
  createRecord(record) {
    this.emit('beforeCreateRecord', { record, model: this });
    const [newRecordKey, newRecord] = this.#recordHandler.createRecord(record);
    this.#records.set(newRecordKey, newRecord);
    this.emit('recordCreated', { newRecord, model: this });
    return newRecord;
  }

  removeRecord(recordKey) {
    if (!this.#records.has(recordKey)) {
      console.warn(`Record ${recordKey} does not exist.`);
      return false;
    }
    const record = this.#records.get(recordKey);
    this.emit('beforeRemoveRecord', { record, model: this });
    this.#records.delete(record.key);
    this.emit('recordRemoved', {
      record: { [this.#key.name]: recordKey },
      model: this,
    });
    return true;
  }

  updateRecord(recordKey, record) {
    if (!this.#records.has(recordKey)) {
      throw new ReferenceError(`Record ${recordKey} does not exist.`);
    }
    const oldRecord = this.#records.get(recordKey);
    this.emit('beforeUpdateRecord', {
      record: oldRecord,
      newRecord: { [this.#key.name]: recordKey, ...record },
      model: this,
    });
    Object.entries(record).forEach(([fieldName, fieldValue]) => {
      oldRecord[fieldName] = fieldValue;
    });
    this.emit('recordUpdated', {
      record: oldRecord,
      model: this,
    });
    return oldRecord;
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

  [$addRelationshipAsField](relationship) {
    const { name, type, fieldName, field } = relationship[$getField]();
    const relationshipName = `${name}.${fieldName}`;
    this.emit('beforeAddRelationship', {
      relationship: { name, type },
      model: this,
    });
    if (
      [
        ...this.#fields.keys(),
        this.#key.name,
        ...this.#methods.keys(),
      ].includes(fieldName)
    )
      throw new NameError(`Relationship field ${fieldName} is already in use.`);
    if (this.#relationships.has(relationshipName))
      throw new NameError(
        `Relationship ${relationshipName} is already in use.`
      );

    this.#fields.set(fieldName, field);
    this.#relationships.set(relationshipName, relationship);

    this.emit('relationshipAdded', {
      relationship: { name, type },
      model: this,
    });
    this.emit('change', {
      type: 'relationshipAdded',
      relationship: {
        relationship: { name, type },
        model: this,
      },
      model: this,
    });
  }

  [$addRelationshipAsMethod](relationship) {
    const { name, type, methodName, method } = relationship[$getMethod]();
    const relationshipName = `${name}.${methodName}`;
    this.emit('beforeAddRelationship', {
      relationship: { name, type },
      model: this,
    });
    if (
      [
        ...this.#fields.keys(),
        this.#key.name,
        ...this.#methods.keys(),
      ].includes(methodName)
    )
      throw new NameError(
        `Relationship method ${methodName} is already in use.`
      );
    if (this.#relationships.has(relationshipName))
      throw new NameError(`Relationship ${name} is already in use.`);

    this.#methods.set(methodName, method);
    this.#relationships.set(relationshipName, relationship);

    this.emit('relationshipAdded', {
      relationship: { name, type },
      model: this,
    });
    this.emit('change', {
      type: 'relationshipAdded',
      relationship: {
        relationship: { name, type },
        model: this,
      },
      model: this,
    });
  }

  // Private

  static #createKey(options) {
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
  }

  static #parseKey(modelName, key) {
    if (typeof key !== 'string' && typeof key !== 'object')
      throw new TypeError(`${modelName} key ${key} is not a string or object.`);

    if (typeof key === 'object' && !key.name)
      throw new TypeError(`${modelName} key ${key} is missing a name.`);

    if (typeof key === 'object' && !['auto', 'string'].includes(key.type))
      throw new TypeError(
        `${modelName} key ${key} type must be either "string" or "auto".`
      );

    const _key = Model.#createKey(key);
    return _key;
  }

  static #parseField(modelName, field, restrictedNames) {
    validateObjectWithUniqueName(
      {
        objectType: 'Field',
        parentType: 'Model',
        parentName: modelName,
      },
      field,
      restrictedNames
    );

    const isStandardType = allStandardTypes.includes(field.type);

    if (isStandardType) return Field[field.type](field);
    else if (typeof field.type === 'function') {
      Schema[$handleExperimentalAPIMessage](
        `The provided type for ${field.name} is not part of the standard types. Function types are experimental and may go away in a later release.`
      );
    }
    return new Field(field);
  }

  static #validateMethod(
    callbackType,
    callbackName,
    callback,
    restrictedNames
  ) {
    if (typeof callback !== 'function')
      throw new TypeError(`${callbackType} ${callbackName} is not a function.`);

    if (restrictedNames.includes(callbackName))
      throw new DuplicationError(
        `${callbackType} ${callbackName} already exists.`
      );

    return callback;
  }

  static #validateContains(modelName, objectType, objectName, objects) {
    if (!objects.has(objectName)) {
      console.warn(
        `Model ${modelName} does not contain a ${objectType.toLowerCase()} named ${objectName}.`
      );
      return false;
    }
    return true;
  }

  static #applyFieldRetrofill(field, records, retrofill) {
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
  }
}

export default Model;
