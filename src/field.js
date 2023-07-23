import { isOptional, standardTypes } from 'src/types';

class Field {
  #name;
  #type;

  constructor({ name, type }) {
    this.#name = name;
    this.#type = Field.#validateType(type);
  }

  get name() {
    return this.#name;
  }

  typeCheck(value) {
    return this.#type(value);
  }

  // Private

  static #validateType(type) {
    if (typeof type !== 'function')
      throw new TypeError('Field type must be a function.');
    return isOptional(type);
  }
}

// Create convenience static methods on the Field class
Object.entries(standardTypes).forEach(([typeName, standardType]) => {
  const { type } = standardType;

  Field[typeName] = options => {
    if (typeof options === 'string') return new Field({ name: options, type });
    return new Field({ ...options, type });
  };
});

export { Field };
