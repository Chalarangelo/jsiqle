import QMap from './QMap.js';

const $keyPrefix = Symbol('keyPrefix');
const $keyCounter = Symbol('keyCounter');
const $objects = Symbol('objects');
const $requiredFields = Symbol('requiredFields');
const $optionalFields = Symbol('optionalFields');

class Model {
  constructor(
    {
      name,
      fields,
      // methods,
      // relations,
      // options,
      // hooks,
      // validations,
      // indexes,
      // plugins,
      // ...rest
    } = {
      fields: [],
    }
  ) {
    if (!name || typeof name !== 'string')
      throw new Error('Model name is required');
    this.name = name;

    this.fields = fields || [];
    this[$requiredFields] = this.fields.filter(field => field.required);
    this[$optionalFields] = this.fields.filter(field => !field.required);

    this[$keyPrefix] = `[${this.name}]:#`;
    this[$keyCounter] = 0;

    this[$objects] = new QMap();
  }

  get nextKey() {
    this[$keyCounter] += 1;
    return `${this[$keyPrefix]}${this[$keyCounter]}`;
  }

  add(object) {
    if (!object) throw new Error('Object is required');

    // TODO: Deep clone the object first?
    this[$requiredFields].forEach(field => {
      if (object[field.name] === undefined)
        throw new Error(
          `${this.name} object is missing required field ${field.name}`
        );
      if (!field.validate(object[field.name]))
        throw new Error(
          `${this.name} object has invalid value for field ${field.name}`
        );
    });

    this[$optionalFields].forEach(field => {
      if (
        object[field.name] !== undefined &&
        !field.validate(object[field.name])
      )
        throw new Error(
          `${this.name} object has invalid value for field ${field.name}`
        );
      if (object[field.name] === undefined)
        object[field.name] = field.defaultValue;
    });

    const key = this.nextKey;
    this[$objects].set(key, object);
    return object;
  }

  get objects() {
    return this[$objects];
  }

  get(key) {
    return this[$objects].get(key);
  }
}

export default Model;
