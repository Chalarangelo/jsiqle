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
  $properties,
  $cachedProperties,
  $methods,
  $scopes,
  $relationships,
  $validators,
  $recordHandler,
  $addScope,
  $addRelationshipAsField,
  $addRelationshipAsProperty,
  $getField,
  $getProperty,
  $removeScope,
  $instances,
  $handleExperimentalAPIMessage,
  $setRecordKey,
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
  #properties;
  #methods;
  #relationships;
  #validators;
  #updatingField = false;
  #cachedProperties;

  static #instances = new Map();

  constructor({
    name,
    fields = [],
    key = 'id',
    properties = {},
    methods = {},
    scopes = {},
    validators = {},
    cacheProperties = [],
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
    this.#records[$setRecordKey](key);

    // Initialize private fields
    this.#fields = new Map();
    this.#properties = new Map();
    this.#methods = new Map();
    this.#relationships = new Map();
    this.#validators = new Map();
    this.#cachedProperties = new Set();

    // Add fields, checking for duplicates and invalids
    fields.forEach(field => this.addField(field));

    // Add properties, checking for duplicates and invalids
    Object.entries(properties).forEach(([propertyName, property]) => {
      if (typeof property === 'object')
        this.addProperty({ name: propertyName, ...property });
      else
        this.addProperty({
          name: propertyName,
          body: property,
          cache: cacheProperties.includes(propertyName),
        });
    });

    // Add methods, checking for duplicates and invalids
    Object.entries(methods).forEach(([methodName, method]) => {
      this.addMethod(methodName, method);
    });

    // Add scopes, checking for duplicates and invalids
    Object.entries(scopes).forEach(([scopeName, scope]) => {
      this.addScope(scopeName, ...Model.#parseScope(scope));
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
      ...this.#properties.keys(),
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
    if (!Model.#validateContains(this.name, 'Field', name, this.#fields))
      throw new ReferenceError(`Field ${name} does not exist.`);
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

  addProperty({ name, body, cache = false }) {
    this.emit('beforeAddProperty', {
      property: { name, body },
      model: this,
    });
    const propertyName = validateName('Property', name);
    this.#properties.set(
      propertyName,
      Model.#validateFunction('Property', name, body, [
        ...this.#fields.keys(),
        this.#key.name,
        ...this.#properties.keys(),
        ...this.#methods.keys(),
      ])
    );
    if (cache) this.#cachedProperties.add(propertyName);
    this.emit('propertyAdded', {
      property: { name: propertyName, body },
      model: this,
    });
    this.emit('change', {
      type: 'propertyAdded',
      property: { name: propertyName, body },
      model: this,
    });
  }

  removeProperty(name) {
    if (!Model.#validateContains(this.name, 'Property', name, this.#properties))
      return false;
    const property = this.#properties.get(name);
    this.emit('beforeRemoveProperty', {
      property: { name, body: property },
      model: this,
    });
    this.#properties.delete(name);
    if (this.#cachedProperties.has(name)) this.#cachedProperties.delete(name);
    this.emit('propertyRemoved', {
      property: { name },
      model: this,
    });
    this.emit('change', {
      type: 'propertyRemoved',
      property: { name, body: property },
      model: this,
    });
    return true;
  }

  addMethod(name, method) {
    this.emit('beforeAddMethod', {
      method: { name, body: method },
      model: this,
    });
    const methodName = validateName('Method', name);
    this.#methods.set(
      methodName,
      Model.#validateFunction('Method', name, method, [
        ...this.#fields.keys(),
        this.#key.name,
        ...this.#properties.keys(),
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
      return false;
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
    return true;
  }

  addScope(name, scope, sortFn) {
    this.emit('beforeAddScope', {
      scope: { name, body: scope },
      model: this,
    });
    const scopeName = validateName('Scope', name);
    this.#records[$addScope](scopeName, scope, sortFn);
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
      Model.#validateFunction('Validator', name, validator, [
        ...this.#validators.keys(),
      ])
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

  // TODO: V2 Enhancements
  // If loading records from a storage, the key is already populated. This will
  // cause problems when validating auto-incrementing key values and could
  // result in random keys for the same object between runs.
  //
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
    this.#records.delete(recordKey);
    this.emit('recordRemoved', {
      record: { [this.#key.name]: recordKey },
      model: this,
    });
    return true;
  }

  updateRecord(recordKey, record) {
    if (typeof record !== 'object')
      throw new TypeError('Record data must be an object.');
    if (!this.#records.has(recordKey))
      throw new ReferenceError(`Record ${recordKey} does not exist.`);
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

  get [$properties]() {
    return this.#properties;
  }

  // TODO: V2 Enhancements
  // Add a method to the model, so that it's possible to reset caches for all
  // records. This removes some uncertainty and allows for recalculation without
  // hacks. Also update the docs to reflect this.
  get [$cachedProperties]() {
    return this.#cachedProperties;
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
        ...this.#properties.keys(),
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

  [$addRelationshipAsProperty](relationship) {
    const { name, type, propertyName, property } = relationship[$getProperty]();
    const relationshipName = `${name}.${propertyName}`;
    this.emit('beforeAddRelationship', {
      relationship: { name, type },
      model: this,
    });
    if (
      [
        ...this.#fields.keys(),
        this.#key.name,
        ...this.#properties.keys(),
        ...this.#methods.keys(),
      ].includes(propertyName)
    )
      throw new NameError(
        `Relationship property ${propertyName} is already in use.`
      );
    if (this.#relationships.has(relationshipName))
      throw new NameError(`Relationship ${name} is already in use.`);

    this.#properties.set(propertyName, property);
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
      // Don't worry about these two being uncovered, they are a safeguard
      // that should never be reached under normal circumstances.
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
        /* istanbul ignore next */
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

  static #parseScope(scope) {
    if (typeof scope === 'function') return [scope];
    if (typeof scope === 'object') {
      const { matcher, sorter } = scope;
      if (typeof matcher !== 'function')
        throw new TypeError(
          `The provided matcher for the scope is not a function.`
        );
      if (sorter && typeof sorter !== 'function')
        throw new TypeError(
          `The provided sorter for the scope is not a function.`
        );
      return [matcher, sorter];
    }
    throw new TypeError(
      `The provided scope is not a function or valid object.`
    );
  }

  static #validateFunction(
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
