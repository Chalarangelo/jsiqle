import EventEmitter from 'events';
import { validateName, parseModel } from 'src/utils';

/**
 * A Schema is a collection of models.
 * @extends EventEmitter
 * @param {Object} options Schema options
 * @param {String} options.name The name of the schema
 * @param {Array<Object>} options.models An object containing initial models for
 * the schema.
 */
export class Schema extends EventEmitter {
  #models;

  static #schemas = new Map();

  constructor({ name, models = [] } = {}) {
    super();
    this.name = validateName('Schema', name);
    this.#models = new Map();

    models.forEach(model => this.createModel(model));
  }

  /**
   * Creates a model and adds it to the schema.
   * @param {Object} modelData Data for the model to be added.
   * @returns The newly created model.
   */
  createModel(modelData) {
    this.emit('beforeCreateModel', { model: modelData, schema: this });
    const model = parseModel(this.name, modelData, this.#models);

    this.#models.set(model.name, model);

    // TODO: make the model an event emitter probably
    // model.on('change', () => {
    //   this.emit('change');
    // });

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
        `Model ${name} does not exist in schema ${this.name}.`
      );
    this.#models.delete(name);

    // TODO: Figure out a cascade for relationships

    this.emit('modelRemoved', { model: { name }, schema: this });
    this.emit('change', { type: 'modelRemoved', model, schema: this });
  }

  /**
   * Gets all models in the schema.
   */
  get models() {
    return this.#models;
  }

  static create(name) {
    return new Schema(name);
  }

  static get(name) {
    return Schema.#schemas.get(name);
  }

  /**
   * Retrieves the data specified by the given pathName
   * @param {String} pathName A '.'-delimited path to the data.
   * @returns The value at the specified path.
   */
  get(pathName) {
    // TODO: Decide upon `.` or `/` as path separator
    this.emit('beforeGet', { pathName, schema: this });
    const [modelName, recordKey, ...rest] = pathName.split('.');
    const model = this.getModel(modelName);

    if (!model)
      throw new ReferenceError(
        `Model ${modelName} does not exist in schema ${this.name}.`
      );

    if (recordKey === undefined) return model;
    const record = model.records.get(recordKey);

    if (!record) {
      if (rest.length)
        throw new ReferenceError(
          `Record ${recordKey} does not exist in model ${modelName}.`
        );
      return record;
    }

    const result = rest.reduce((acc, key) => acc[key], record);
    this.emit('got', { pathName, result, schema: this });
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
