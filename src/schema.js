import EventEmitter from 'events';
import { validateName, parseModel } from 'src/utils';

export class Schema extends EventEmitter {
  #models;

  static #schemas = new Map();

  constructor({ name, models = [] } = {}) {
    super();
    this.name = validateName('Schema', name);
    this.#models = new Map();

    models.forEach(model => this.addModel(model));
  }

  addModel(modelData) {
    const model = parseModel(this.name, modelData, this.#models);

    this.#models.set(model.name, model);

    // TODO: make the model an event emitter probably
    // model.on('change', () => {
    //   this.emit('change');
    // });

    this.emit('modelAdded', model);
    return model;
  }

  getModel(name) {
    return this.#models.get(name);
  }

  removeModel(name) {
    if (!this.#models.has(name)) {
      throw new ReferenceError(
        `Model ${name} does not exist in schema ${this.name}.`
      );
    }
    this.#models.delete(name);
    // TODO: Figure out a cascade for relationships
    this.emit('modelRemoved', name);
  }

  get models() {
    return this.#models;
  }

  static create(name) {
    return new Schema(name);
  }

  static get(name) {
    return Schema.#schemas.get(name);
  }

  get(pathName) {
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

    return rest.reduce((acc, key) => acc[key], record);
  }
}

export default Schema;
