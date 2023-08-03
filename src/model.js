import { Field } from 'src/field';
import { RecordSet, RecordHandler } from 'src/record';
import { NameError, DuplicationError } from 'src/errors';
import symbols from 'src/symbols';
import { standardTypes } from 'src/types';
import { validateName } from 'src/utils';

const {
  $fields,
  $properties,
  $cachedProperties,
  $clearCachedProperties,
  $methods,
  $relationships,
  $scopes,
  $recordHandler,
  $emptyRecordTemplate,
  $addScope,
  $addRelationshipAsField,
  $addRelationshipAsProperty,
  $getField,
  $getProperty,
  $instances,
  $set,
  $delete,
} = symbols;

const allStandardTypes = Object.keys(standardTypes);

export class Model {
  #records;
  #recordHandler;
  #fields;
  #properties;
  #methods;
  #relationships;
  #cachedProperties;
  #scopes;
  #emptyRecordTemplate;

  static #instances = new Map();

  constructor({
    name,
    fields = {},
    properties = {},
    methods = {},
    scopes = {},
  } = {}) {
    this.name = name;

    if (Model.#instances.has(name))
      throw new DuplicationError(`A model named ${name} already exists.`);

    // Instantiate this before the record storage, so it can be
    // queried if needed.
    this.#scopes = new Map();

    // Create the record storage and handler
    this.#records = new RecordSet({ model: this });
    this.#recordHandler = new RecordHandler(this);

    // Initialize private fields
    this.#fields = new Map();
    this.#properties = new Map();
    this.#methods = new Map();
    this.#relationships = new Map();
    this.#cachedProperties = new Set();

    // Add fields, checking for duplicates and invalids
    Object.entries(fields).forEach(([fieldName, fieldType]) => {
      this.#addField(fieldType, fieldName);
    });

    this.#emptyRecordTemplate = this.#generateEmptyRecordTemplate();

    // Add properties, checking for duplicates and invalids
    Object.entries(properties).forEach(([propertyName, property]) => {
      if (typeof property === 'object')
        this.#addProperty({ name: propertyName, ...property });
      else
        this.#addProperty({
          name: propertyName,
          body: property,
        });
    });

    // Add methods, checking for duplicates and invalids
    Object.entries(methods).forEach(([methodName, method]) => {
      this.#addMethod(methodName, method);
    });

    // Add scopes, checking for duplicates and invalids
    Object.entries(scopes).forEach(([scopeName, scope]) => {
      this.#addScope(scopeName, ...Model.#parseScope(scope));
    });

    // Add the model to the instances map
    Model.#instances.set(this.name, this);
  }

  createRecord(record) {
    const [newRecordId, newRecord] = this.#recordHandler.createRecord(record);
    this.#records[$set](newRecordId, newRecord);
    return newRecord;
  }

  removeRecord(recordId) {
    if (!this.#records.has(recordId)) {
      console.warn(`Record ${recordId} does not exist.`);
      return false;
    }
    this.#records[$delete](recordId);
    return true;
  }

  updateRecord(recordId, record) {
    if (typeof record !== 'object')
      throw new TypeError('Record data must be an object.');
    if (!this.#records.has(recordId))
      throw new ReferenceError(`Record ${recordId} does not exist.`);
    const oldRecord = this.#records.get(recordId);
    Object.entries(record).forEach(([fieldName, fieldValue]) => {
      oldRecord[fieldName] = fieldValue;
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

  get [$cachedProperties]() {
    return this.#cachedProperties;
  }

  get [$methods]() {
    return this.#methods;
  }

  get [$relationships]() {
    return this.#relationships;
  }

  get [$scopes]() {
    return this.#scopes;
  }

  get [$emptyRecordTemplate]() {
    return this.#emptyRecordTemplate;
  }

  [$addRelationshipAsField](relationship) {
    const { name, fieldName, field } = relationship[$getField]();
    const relationshipName = `${name}.${fieldName}`;
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
    this.#emptyRecordTemplate[fieldName] = undefined;
  }

  [$addRelationshipAsProperty](relationship) {
    const { name, propertyName, property } = relationship[$getProperty]();
    const relationshipName = `${name}.${propertyName}`;
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
  }

  [$clearCachedProperties]() {
    this.#cachedProperties.clear();
  }

  // Private

  #addField(type, name) {
    const isStandardType = allStandardTypes.includes(type);

    if (typeof type !== 'string' || !isStandardType)
      throw new TypeError(`Field ${name} is not a standard type.`);
    this.#fields.set(name, Field[type](name));
  }

  #addProperty({ name, body, cache = false, inverse = null }) {
    if (typeof body !== 'function')
      throw new TypeError(`Property ${name} is not a function.`);
    this.#properties.set(name, body);

    const hasInverse = typeof inverse === 'string' && inverse.length > 0;

    if (hasInverse) {
      if (this.#properties.has(inverse))
        throw new NameError(`Property ${inverse} is already in use.`);
      const inverseBody = (...args) => !body(...args);
      this.#properties.set(inverse, inverseBody);
    }

    if (cache) {
      this.#cachedProperties.add(name);
      if (hasInverse) this.#cachedProperties.add(inverse);
    }
  }

  #addMethod(name, method) {
    if (typeof method !== 'function')
      throw new TypeError(`Method ${name} is not a function.`);
    this.#methods.set(name, method);
  }

  #addScope(name, scope, sortFn) {
    if (typeof scope !== 'function')
      throw new TypeError(`Scope ${name} is not a function.`);
    if (sortFn && typeof sortFn !== 'function')
      throw new TypeError(
        `Scope ${name} comparator function is not a function.`
      );

    const scopeName = validateName(name);
    if (
      this.#records[scopeName] ||
      Object.getOwnPropertyNames(RecordSet.prototype).includes(scopeName)
    )
      throw new NameError(`Scope name ${scopeName} is already in use.`);

    this.#scopes.set(name, [scope, sortFn]);
    this.#records[$addScope](scopeName);
  }

  #generateEmptyRecordTemplate() {
    const emptyRecordTemplate = {};
    this.#fields.forEach(field => {
      emptyRecordTemplate[field.name] = null;
    });
    return emptyRecordTemplate;
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
}
