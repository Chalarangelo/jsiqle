import EventEmitter from 'events';
import { DuplicationError } from 'src/errors';
import { Model } from 'src/model';
import { validateName } from 'src/utils';

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
    if (typeof modelData !== 'object')
      throw new TypeError(`Model ${modelData} is not an object.`);

    if (this.#models.has(modelData.name)) {
      throw new DuplicationError(
        `Model ${modelData.name} already exists in schema ${this.name}.`
      );
    }

    const model = new Model(modelData);

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
}

export default Schema;
