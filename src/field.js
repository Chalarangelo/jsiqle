import { isOptional, standardTypes } from 'src/types';
import symbols from 'src/symbols';

const { $isDateField } = symbols;

class Field {
  #name;
  #type;
  #isDateField = false;

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

  get [$isDateField]() {
    return this.#isDateField;
  }

  set [$isDateField](value) {
    this.#isDateField = value;
  }
}

// Create convenience static methods on the Field class
Object.entries(standardTypes).forEach(([typeName, standardType]) => {
  const { type } = standardType;
  if (typeName === 'date') {
    Field[typeName] = name => {
      const field = new Field({ name, type });
      field[$isDateField] = true;
      return field;
    };
  } else Field[typeName] = name => new Field({ name, type });
});

export { Field };
