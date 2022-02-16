import EventEmitter from 'events';
import { Schema } from 'src/schema';
import { Field } from 'src/field';
import { RecordSet, RecordHandler } from 'src/record';
import { NameError, DuplicationError } from 'src/errors';
import symbols from 'src/symbols';
import { standardTypes } from 'src/types';
import { validateObjectWithUniqueName, validateName } from 'src/utils';

const {
  $fields,
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
} = symbols;

const allStandardTypes = [...Object.keys(standardTypes), 'enum'];

export class Model extends EventEmitter {
  #records;
  #recordHandler;
  #fields;
  #properties;
  #methods;
  #relationships;
  #validators;
  #cachedProperties;

  static #instances = new Map();

  constructor({
    name,
    fields = {},
    properties = {},
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
    this.#records = new RecordSet();
    this.#recordHandler = new RecordHandler(this);

    // Initialize private fields
    this.#fields = new Map();
    this.#properties = new Map();
    this.#methods = new Map();
    this.#relationships = new Map();
    this.#validators = new Map();
    this.#cachedProperties = new Set();

    // Add fields, checking for duplicates and invalids
    Object.entries(fields).forEach(([fieldName, field]) => {
      if (typeof field === 'object')
        this.addField({ name: fieldName, ...field });
      else this.addField({ name: fieldName, type: field });
    });

    // Add properties, checking for duplicates and invalids
    Object.entries(properties).forEach(([propertyName, property]) => {
      if (typeof property === 'object')
        this.addProperty({ name: propertyName, ...property });
      else
        this.addProperty({
          name: propertyName,
          body: property,
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

  addField(fieldOptions) {
    this.emit('beforeAddField', { field: fieldOptions, model: this });
    const field = Model.#parseField(this.name, fieldOptions, [
      'id',
      ...this.#fields.keys(),
      ...this.#properties.keys(),
      ...this.#methods.keys(),
    ]);
    this.#fields.set(fieldOptions.name, field);
    this.emit('fieldAdded', { field, model: this });
    this.emit('change', { type: 'fieldAdded', field, model: this });
    return field;
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
        'id',
        ...this.#fields.keys(),
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

  addMethod(name, method) {
    this.emit('beforeAddMethod', {
      method: { name, body: method },
      model: this,
    });
    const methodName = validateName('Method', name);
    this.#methods.set(
      methodName,
      Model.#validateFunction('Method', name, method, [
        'id',
        ...this.#fields.keys(),
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

  // Record operations do not emit 'change' events by design
  createRecord(record) {
    this.emit('beforeCreateRecord', { record, model: this });
    const [newRecordId, newRecord] = this.#recordHandler.createRecord(record);
    this.#records.set(newRecordId, newRecord);
    this.emit('recordCreated', { newRecord, model: this });
    return newRecord;
  }

  removeRecord(recordId) {
    if (!this.#records.has(recordId)) {
      console.warn(`Record ${recordId} does not exist.`);
      return false;
    }
    const record = this.#records.get(recordId);
    this.emit('beforeRemoveRecord', { record, model: this });
    this.#records.delete(recordId);
    this.emit('recordRemoved', {
      record: { id: recordId },
      model: this,
    });
    return true;
  }

  updateRecord(recordId, record) {
    if (typeof record !== 'object')
      throw new TypeError('Record data must be an object.');
    if (!this.#records.has(recordId))
      throw new ReferenceError(`Record ${recordId} does not exist.`);
    const oldRecord = this.#records.get(recordId);
    this.emit('beforeUpdateRecord', {
      record: oldRecord,
      newRecord: { id: recordId, ...record },
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
        'id',
        ...this.#fields.keys(),
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
        'id',
        ...this.#fields.keys(),
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
}
