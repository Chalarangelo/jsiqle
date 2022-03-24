import { validateName } from 'src/utils';

export default class NumberArrayField {
  #nullable = true;
  #name;
  #defaultValue;
  #size = {
    min: 0,
    max: Number.POSITIVE_INFINITY,
  };
  #range = {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
  };
  #integer = false;

  constructor({
    name,
    defaultValue = null,
    notNull = false,
    minSize = null,
    maxSize = null,
    min = null,
    max = null,
    integer = false,
  }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
    this.#nullable = !notNull;
    this.#integer = integer;
    if (typeof min === 'number') this.#range.min = min;
    if (typeof max === 'number') this.#range.max = max;
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
      for (let item of value) {
        if (typeof item !== 'number') {
          throw new Error(`${this.name} must be an array of numbers.`);
        }
        if (item < this.#range.min) {
          throw new Error(
            `Values in ${this.name} must be greater than or equal to ${
              this.#range.min
            }.`
          );
        }
        if (item > this.#range.max) {
          throw new Error(
            `Values in ${this.name} must be less than or equal to ${
              this.#range.max
            }.`
          );
        }
        if (this.#integer && value % 1 !== 0) {
          throw new Error(`${this.name} must be an array of integers.`);
        }
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
      `${this.name} must be an array of numbers${
        this.#nullable ? ' or null' : ''
      }.`
    );
  }
}
