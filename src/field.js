import { isOptional, standardTypes } from 'src/types';

class Field {
  #name;
  #type;

  constructor({ name, type }) {
    this.#name = name;
    this.#type = isOptional(type);
  }

  get name() {
    return this.#name;
  }

  typeCheck(value) {
    return this.#type(value);
  }
}

// Create convenience static methods on the Field class
Object.entries(standardTypes).forEach(([typeName, standardType]) => {
  const { type } = standardType;
  Field[typeName] = name => new Field({ name, type });
});

export { Field };
