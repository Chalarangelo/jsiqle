import { Model } from './model.js';
import { Relationship } from './relationship.js';
import { Serializer } from './serializer.js';
import { ExperimentalAPIUsageError } from './errors.js';
import { validateObjectWithUniqueName, validateName } from './utils.js';
import symbols from './symbols.js';

const {
  $addRelationshipAsField,
  $addRelationshipAsProperty,
  $handleExperimentalAPIMessage,
  $clearCachedProperties,
  $clearSchemaForTesting,
  $schemaObject,
} = symbols;

export class Schema {
  static #models = new Map();
  static #serializers = new Map();
  static #schemaObject = {};
  static #instantiated = false;

  static defaultConfig = {
    experimentalAPIMessages: 'warn',
  };

  static config = {
    ...Schema.defaultConfig,
  };

  /**
   * Creates a new schema with the given name and options.
   * @param {Object} schemaData Data for the schema to be created.
   * @returns The schema singleton.
   */
  static create({
    models = [],
    relationships = [],
    serializers = [],
    config = {},
  } = {}) {
    if (Schema.#instantiated)
      throw new Error('Only one schema can be created.');

    Schema.#parseConfig(config);

    models.forEach(modelData => {
      // Perform name validation for fields, properties and methods here
      // to exit if something is wrong.
      const { fields = {}, properties = {}, methods = {} } = modelData;
      const names = [
        ...Object.keys(fields),
        ...Object.keys(properties),
        ...Object.keys(methods),
      ];
      const uniqueNames = new Set(names);
      if (uniqueNames.size !== names.length)
        throw new Error(
          `Model ${modelData.name} has duplicate field, property or method names.`
        );
      names.forEach(name => validateName(name));

      Schema.#createModel(modelData);
    });

    relationships.forEach(relationship =>
      Schema.#createRelationship(relationship)
    );

    serializers.forEach(serializer => Schema.#createSerializer(serializer));

    // Lazy properties, models and serializers require initial set up as they
    // depend on other models or serializers.
    Schema.#schemaObject = {
      models: Object.fromEntries([...Schema.#models.entries()]),
      serializers: Object.fromEntries([...Schema.#serializers.entries()]),
    };

    Schema.#instantiated = true;

    return Schema;
  }

  /**
   * Clears all cached properties of all models.
   * @returns The schema singleton.
   */
  static clearPropertyCache() {
    Schema[$handleExperimentalAPIMessage](
      'Clearing the property cache of all models should only be done if something is known to have caused the cache to contain stale data. Please use with caution.'
    );
    Schema.#models.forEach(model => model[$clearCachedProperties]());

    return Schema;
  }

  /**
   * Retrieves a model from the schema.
   * @param {String} name The name of the model to retrieve.
   * @returns The model or `undefined` if it does not exist.
   */
  static getModel(name) {
    return Schema.#models.get(name);
  }

  /**
   * Retrieves a serializer from the schema.
   * @param {String} name The name of the serializer to retrieve.
   * @returns The serializer or `undefined` if it does not exist.
   */
  static getSerializer(name) {
    return Schema.#serializers.get(name);
  }

  /**
   * Gets all models in the schema.
   */
  static get models() {
    return Schema.#models;
  }

  static get [$schemaObject]() {
    return Schema.#schemaObject;
  }

  /**
   * Retrieves the data specified by the given pathName
   * @param {String} pathName A '.'-delimited path to the data.
   * @returns The value at the specified path.
   */
  static get(pathName) {
    const [modelName, recordId, ...rest] = pathName.split('.');
    const model = Schema.getModel(modelName);

    if (!model)
      throw new ReferenceError(
        `Model ${modelName} does not exist in the schema.`
      );

    if (recordId === undefined) return model;
    const record = model.records.get(recordId);

    if (!rest.length) return record;

    if (!record)
      throw new ReferenceError(
        `Record ${recordId} does not exist in model ${modelName}.`
      );

    const result = rest.reduce((acc, key) => acc[key], record);
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

  /* istanbul ignore next */
  static [$clearSchemaForTesting]() {
    Schema.#models.clear();
    Schema.#serializers.clear();
    Schema.#schemaObject = {};
    Schema.#instantiated = false;
  }

  // Private

  static #createModel(modelData) {
    const modelName = validateName(modelData.name);
    validateObjectWithUniqueName(
      { objectType: 'Model', parentType: 'Schema' },
      modelData,
      [...Schema.#models.keys()]
    );
    const model = new Model(modelData);
    Schema.#models.set(modelName, model);
  }

  static #createSerializer(serializerData) {
    const serializerName = validateName(serializerData.name);
    validateObjectWithUniqueName(
      { objectType: 'Serializer', parentType: 'Schema' },
      serializerData,
      [...Schema.#serializers.keys()]
    );
    const serializer = new Serializer(serializerData);
    Schema.#serializers.set(serializerName, serializer);
  }

  static #createRelationship(relationshipData) {
    const { from, to, type /* , cascade */ } = relationshipData;
    [from, to].forEach(model => {
      if (!['string', 'object'].includes(typeof model))
        throw new TypeError(`Invalid relationship model: ${model}.`);
    });

    const fromModelName = typeof from === 'string' ? from : from.model;
    const toModelName = typeof to === 'string' ? to : to.model;

    const fromModel = Schema.#models.get(fromModelName);
    const toModel = Schema.#models.get(toModelName);
    if (!fromModel)
      throw new ReferenceError(
        `Model ${fromModelName} not found in schema when attempting to create a relationship.`
      );
    if (!toModel)
      throw new ReferenceError(
        `Model ${toModelName} not found in schema when attempting to create a relationship.`
      );

    const relationship = new Relationship({ from, to, type });

    fromModel[$addRelationshipAsField](relationship);
    toModel[$addRelationshipAsProperty](relationship);
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
}

export default Schema;
