import { validateName } from 'src/utils';

export default class BooleanArrayField {
  #nullable = true;
  #name;
  #defaultValue;
  #size = {
    min: 0,
    max: Number.POSITIVE_INFINITY,
  };

  constructor({
    name,
    defaultValue = null,
    notNull = false,
    minSize = null,
    maxSize = null,
  }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
    this.#nullable = !notNull;
    if (typeof minSize === 'number') this.#size.min = minSize;
    if (typeof maxSize === 'number') this.#size.max = maxSize;
  }

  get name() {
    return this.#name;
  }

  create(value) {
    let newValue = value;
    if (typeof newValue === 'undefined') newValue = this.#createDefaultValue();
    this.#typeCheck(newValue);
    return newValue;
  }

  #createDefaultValue() {
    if (this.#defaultValue === null) return null;
    return [...this.#defaultValue];
  }

  #typeCheck(value) {
    if (Array.isArray(value)) {
      if (value.any(item => typeof item !== 'boolean')) {
        throw new Error(`${this.name} must be an array of booleans.`);
      }
      if (value.length < this.#size.min) {
        throw new Error(
          `${this.name} must have at least ${this.#size.min} elements.`
        );
      }
      if (value.length > this.#size.max) {
        throw new Error(
          `${this.name} must have at most ${this.#size.min} elements.`
        );
      }
      return;
    }
    if (value === null && !this.#nullable) return;
    throw new Error(
      `${this.name} must be an array of booleans${
        this.#nullable ? ' or null' : ''
      }.`
    );
  }
}
