import EventEmitter from 'events';
import { Model } from 'src/model';
import { Relationship } from 'src/relationship';
import { ExperimentalAPIUsageError } from 'src/errors';
import {
  capitalize,
  validateObjectWithUniqueName,
  validateName,
} from 'src/utils';
import symbols from 'src/symbols';

const {
  $addRelationshipAsField,
  $addRelationshipAsMethod,
  $handleExperimentalAPIMessage,
  $key,
  $keyType,
} = symbols;

/**
 * A Schema is a collection of models.
 * @extends EventEmitter
 * @param {Object} options Schema options
 * @param {String} options.name The name of the schema
 * @param {Array<Object>} options.models An object containing initial models for
 * the schema.
 */
export class Schema extends EventEmitter {
  #name;
  #models;

  static defaultConfig = {
    experimentalAPIMessages: 'warn',
  };

  static config = {
    ...Schema.defaultConfig,
  };

  static #schemas = new Map();

  constructor({ name, models = [], config = {} } = {}) {
    super();
    this.#name = validateName('Schema', name);
    this.#models = new Map();
    Schema.#parseConfig(config);
    Schema.#schemas.set(this.#name, this);

    models.forEach(model => this.createModel(model));
  }

  /**
   * Creates a model and adds it to the schema.
   * @param {Object} modelData Data for the model to be added.
   * @returns The newly created model.
   */
  createModel(modelData) {
    this.emit('beforeCreateModel', { model: modelData, schema: this });
    const model = Schema.#parseModel(this.#name, modelData, this.#models);

    this.#models.set(model.name, model);

    model.on('change', ({ type, ...eventData }) => {
      this.emit('change', {
        type: `model${capitalize(type)}`,
        ...eventData,
        schema: this,
      });
    });

    this.emit('modelCreated', { model, schema: this });
    this.emit('change', { type: 'modelCreated', model, schema: this });
    return model;
  }

  /**
   * Retrieves a model from the schema.
   * @param {String} name The name of the model to retrieve.
   * @returns The model or `undefined` if it does not exist.
   */
  getModel(name) {
    return this.#models.get(name);
  }

  /**
   * Removes a model from the schema.
   * @param {String} name The name of the model to remove.
   */
  removeModel(name) {
    const model = this.getModel(name);
    this.emit('beforeRemoveModel', { model, schema: this });

    if (!this.#models.has(name))
      throw new ReferenceError(
        `Model ${name} does not exist in schema ${this.#name}.`
      );
    this.#models.delete(name);

    // TODO: V2 enhancements
    // Figure out a way to add cascade for relationships

    this.emit('modelRemoved', { model: { name }, schema: this });
    this.emit('change', { type: 'modelRemoved', model, schema: this });
  }

  /**
   * EXPERIMENTAL
   * Creates a relationship between two models and adds it to the schema.
   * @param {Object} relationshipData Data for the relationship to be added.
   * @returns The newly created relationship.
   */
  createRelationship(relationshipData) {
    this.emit('beforeCreateRelationship', {
      relationship: relationshipData,
      schema: this,
    });
    const relationship = Schema.#applyRelationship(
      this.#name,
      relationshipData,
      this.#models
    );

    this.emit('relationshipCreated', { relationship, schema: this });
    this.emit('change', {
      type: 'relationshipCreated',
      relationship,
      schema: this,
    });
    return relationship;
  }

  /**
   * Gets the schema's name.
   */
  get name() {
    return this.#name;
  }

  /**
   * Gets all models in the schema.
   */
  get models() {
    return this.#models;
  }

  // TODO: Make users use this instead of the constructor, using a private flag.
  // Use another private flag to throw if more than one schema is created
  // (not supported for this release).
  /**
   * Creates a new schema with the given name and options.
   * @param {Object} schemaData Data for the schema to be created.
   * @returns The newly created schema.
   */
  static create(schemaData) {
    return new Schema(schemaData);
  }

  // TODO: V2 enhancements
  // Check validity of this. Currently it's not mentioned anywhere in the docs.
  static get(name) {
    return Schema.#schemas.get(name);
  }

  /**
   * Retrieves the data specified by the given pathName
   * @param {String} pathName A '.'-delimited path to the data.
   * @returns The value at the specified path.
   */
  get(pathName) {
    this.emit('beforeGet', { pathName, schema: this });
    const [modelName, recordKey, ...rest] = pathName.split('.');
    const model = this.getModel(modelName);

    if (!model)
      throw new ReferenceError(
        `Model ${modelName} does not exist in schema ${this.#name}.`
      );

    if (recordKey === undefined) return model;
    const keyType = model[$key][$keyType];
    const record = model.records.get(
      keyType === 'string' ? recordKey : Number.parseInt(recordKey)
    );

    if (!rest.length) return record;

    if (!record)
      throw new ReferenceError(
        `Record ${recordKey} does not exist in model ${modelName}.`
      );

    const result = rest.reduce((acc, key) => acc[key], record);
    this.emit('got', { pathName, result, schema: this });
    return result;
  }

  // Protected (package internal-use only)
  /* istanbul ignore next */
  static [$handleExperimentalAPIMessage](message) {
    const { experimentalAPIMessages } = Schema.config;
    if (experimentalAPIMessages === 'warn') {
      console.warn(message);
    } else if (experimentalAPIMessages === 'error') {
      throw new ExperimentalAPIUsageError(message);
    }
  }

  // Private

  static #parseModel(schemaName, modelData, models) {
    validateObjectWithUniqueName(
      {
        objectType: 'Model',
        parentType: 'Schema',
        parentName: schemaName,
      },
      modelData,
      [...models.keys()]
    );
    return new Model(modelData);
  }

  static #applyRelationship(schemName, relationshipData, models) {
    const { from, to, type /* , cascade */ } = relationshipData;
    [from, to].forEach(model => {
      if (!['string', 'object'].includes(typeof model))
        throw new TypeError(`Invalid relationship model: ${model}.`);
    });

    const fromModelName = typeof from === 'string' ? from : from.model;
    const toModelName = typeof to === 'string' ? to : to.model;

    const fromModel = models.get(fromModelName);
    const toModel = models.get(toModelName);
    if (!fromModel)
      throw new ReferenceError(
        `Model ${fromModelName} not found in schema ${schemName} when attempting to create a relationship.`
      );
    if (!toModel)
      throw new ReferenceError(
        `Model ${toModelName} not found in schema ${schemName} when attempting to create a relationship.`
      );

    const relationship = new Relationship({ from, to, type });

    fromModel[$addRelationshipAsField](relationship);
    toModel[$addRelationshipAsMethod](relationship);

    return relationship;
  }

  static #parseConfig(config = {}) {
    if (!config) return;
    ['experimentalAPIMessages'].forEach(key => {
      if (config[key] !== undefined) {
        if (['warn', 'error', 'off'].includes(config[key]))
          Schema.config[key] = config[key];
      }
    });
  }

  // TODO: V2 enhancements
  // Add a mechanism here so that plugins can hook up to the schema via the
  // event API or other stuff. Generally, the Schema is the de facto entrypoint
  // of the library, so we should make sure that all plugins interface with it.
  //
  // Alternatively, we could have a wrapper around the Schema, which might be
  // preferable as we can have multiple schemas and hook up events more easily.
  //
  // We also need a way to modularize and granularize the logging/erroring. A
  // wrapper would allow us to specify this across.
}

export default Schema;
