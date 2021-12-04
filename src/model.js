import EventEmitter from 'events';
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
  $removeScope,
  $instances,
} = symbols;

const allStandardTypes = [
  ...Object.keys(standardTypes),
  ...Object.keys(standardTypes).map(type => `${type}Required`),
  'enum',
  'enumRequired',
  'auto',
];

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

    // Check and create the key field, no need to check for duplicate fields
    this.#key = Model.#parseModelKey(this.name, key);

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

    // Add relationships, checking for duplicates and invalids
    Object.entries(relationships).forEach(
      ([relationshipName, relationship]) => {
        this.addRelationship(relationshipName, relationship);
      }
    );

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
    const field = Model.#parseModelField(this.name, fieldOptions, [
      ...this.#fields.keys(),
      this.#key.name,
      ...this.#methods.keys(),
    ]);
    this.#fields.set(fieldOptions.name, field);
    if (!this.#updatingField) this.emit('fieldAdded', { field, model: this });
    // Retrofill records with new fields
    // TODO: This before might be erroneous if the retrofill is non-existent
    // Evaluate for V2, we might want to check and not emit events.
    this.emit('beforeRetrofillField', { field, retrofill, model: this });
    Model.#applyModelFieldRetrofill(field, this.#records, retrofill);
    this.emit('fieldRetrofilled', { field, retrofill, model: this });
    if (!this.#updatingField)
      this.emit('change', { type: 'fieldAdded', field, model: this });
    return field;
  }

  removeField(name) {
    if (!Model.#validateModelContains(this.name, 'Field', name, this.#fields))
      return;
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
      Model.#validateModelMethod('Method', name, method, [
        ...this.#fields.keys(),
        this.#key.name,
        ...this.#methods.keys(),
      ])
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
    if (!Model.#validateModelContains(this.name, 'Method', name, this.#methods))
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
      !Model.#validateModelContains(
        this.name,
        'Scope',
        name,
        this.#records[$scopes]
      )
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
    if (
      [
        ...this.#fields.keys(),
        this.#key.name,
        ...this.#methods.keys(),
      ].includes(relationshipName)
    )
      throw new NameError(
        `Relationship field ${relationshipField} is already in use.`
      );
    if (this.#relationships.has(relationshipName))
      throw new NameError(
        `Relationship ${relationshipName} is already in use.`
      );

    this.#fields.set(relationshipName, relationshipField);
    this.#relationships.set(relationshipName, relationship);
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
  }

  add(record) {
    const [newRecordKey, newRecord] = this.#recordHandler.createRecord(record);
    this.#records.set(newRecordKey, newRecord);
    return newRecord;
  }

  addValidator(name, validator) {
    this.#validators.set(
      name,
      Model.#validateModelMethod('Validator', name, validator, this.#validators)
    );
  }

  removeValidator(name) {
    if (
      Model.#validateModelContains(
        this.name,
        'Validator',
        name,
        this.#validators
      )
    )
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

  static #parseModelKey(modelName, key) {
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

  static #parseModelField(modelName, field, restrictedNames) {
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
    else if (typeof field.type === 'function')
      console.warn(
        `The provided type for ${field.name} is not part of the standard types. Function types are experimental and may go away in a later release.`
      );
    return new Field(field);
  }

  static #validateModelMethod(
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

  static #validateModelContains(modelName, objectType, objectName, objects) {
    if (!objects.has(objectName)) {
      console.warn(
        `Model ${modelName} does not contain a ${objectType.toLowerCase()} named ${objectName}.`
      );
      return false;
    }
    return true;
  }

  static #applyModelFieldRetrofill(field, records, retrofill) {
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
