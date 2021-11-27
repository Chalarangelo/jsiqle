import Field from './field';
import types, { standardTypes } from 'src/types';
import symbols from 'src/symbols';

const { $defaultValue } = symbols;

// Create convenience static methods on the Field class
Object.entries(standardTypes).forEach(([typeName, standardType]) => {
  const { type, defaultValue: typeDefaultValue } = standardType;

  Field[typeName] = options => {
    if (typeof options === 'string') return new Field({ name: options, type });
    return new Field({ ...options, type });
  };
  Field[`${typeName}Required`] = options => {
    if (typeof options === 'string')
      return new Field({
        name: options,
        type,
        required: true,
        defaultValue: typeDefaultValue,
      });
    const defaultValue = options.defaultValue || typeDefaultValue;
    return new Field({ ...options, type, required: true, defaultValue });
  };
});

// Enum is special, handle it separately
Field.enum = ({ name, values }) =>
  new Field({ name, type: types.enum(...values) });
Field.enumRequired = ({ name, values, defaultValue = values[0] }) =>
  new Field({
    name,
    type: types.enum(...values),
    required: true,
    defaultValue,
  });

// Auto-field is special, handle it separately
Field.auto = options => {
  const name = typeof options === 'string' ? options : options.name;
  // Generator function to generate a new value each time
  function* autoGenerator() {
    let i = 0;
    while (true) yield i++;
  }
  const generator = autoGenerator();
  let currentValue = 0;
  // Create the field
  const autoField = new Field({
    name,
    type: value => value === currentValue,
    required: true,
    defaultValue: currentValue,
  });
  // Override the default value to be the next value in the sequence
  Object.defineProperty(autoField, $defaultValue, {
    get() {
      const value = generator.next().value;
      currentValue = value;
      return value;
    },
  });
  return autoField;
};

export { Field };

export { createKey } from './key';
export { default as RelationshipField } from './relationship';
