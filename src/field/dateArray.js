import { validateName } from 'src/utils';

export default class DateArrayField {
  #nullable = true;
  #name;
  #defaultValue;
  #size = {
    min: 0,
    max: Number.POSITIVE_INFINITY,
  };
  #range = {
    min: new Date(-8640000000000000),
    max: new Date(8640000000000000),
  };

  constructor({
    name,
    defaultValue = null,
    notNull = false,
    minSize = null,
    maxSize = null,
    min = null,
    max = null,
  }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
    this.#nullable = !notNull;
    if (!Number.isNaN(new Date(min).valueOf())) this.#range.min = new Date(min);
    if (!Number.isNaN(new Date(max).valueOf())) this.#range.max = new Date(max);
    if (typeof minSize === 'number') this.#size.min = minSize;
    if (typeof maxSize === 'number') this.#size.max = maxSize;
  }

  get name() {
    return this.#name;
  }

  create(value) {
    let newValue = value;
    if (typeof newValue === 'undefined') newValue = this.#createDefaultValue();
    if (Array.isArray(newValue)) newValue = newValue.map(v => new Date(v));
    this.#typeCheck(newValue);
    return newValue;
  }

  #createDefaultValue() {
    if (this.#defaultValue === null) return null;
    return [...this.#defaultValue.map(v => new Date(v))];
  }

  #typeCheck(value) {
    if (Array.isArray(value)) {
      for (let item of value) {
        if (!(value instanceof Date)) {
          throw new Error(`${this.name} must be an array of dates.`);
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
      `${this.name} must be an array of dates${
        this.#nullable ? ' or null' : ''
      }.`
    );
  }
}
