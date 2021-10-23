import EventEmitter from 'events';
import Model from './Model.js';

class Schema extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.models = new Map();
  }

  static schemas = new Map();

  static create(name) {
    return new Schema(name);
  }

  static get(name) {
    return Schema.schemas.get(name);
  }

  addModel(model) {
    if (!(model instanceof Model)) {
      throw new Error('Model must be an instance of Model');
    }
    if (this.models.has(model.name)) {
      throw new Error(
        `Model ${model.name} already exists in schema ${this.name}.`
      );
    }
    this.models.set(model.name, model);

    // TODO: make the model an event emitter probably
    // model.on('change', () => {
    //   this.emit('change');
    // });

    this.emit('modelAdded', model);
  }

  removeModel(name) {
    if (!this.models.has(name)) {
      throw new Error(`Model ${name} does not exist in schema ${this.name}.`);
    }
    this.models.delete(name);
    this.emit('modelRemoved', name);
  }

  getModel(name) {
    return this.models.get(name);
  }

  getModels() {
    return this.models;
  }

  getModelNames() {
    return Array.from(this.models.keys());
  }
}

export default Schema;
