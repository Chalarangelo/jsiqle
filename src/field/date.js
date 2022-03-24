import { validateName } from 'src/utils';

export default class DateField {
  #nullable = true;
  #name;
  #defaultValue;
  #range = {
    min: new Date(-8640000000000000),
    max: new Date(8640000000000000),
  };

  constructor({
    name,
    defaultValue = null,
    notNull = false,
    min = null,
    max = null,
  }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
    this.#nullable = !notNull;
    if (!Number.isNaN(new Date(min).valueOf())) this.#range.min = new Date(min);
    if (!Number.isNaN(new Date(max).valueOf())) this.#range.max = new Date(max);
  }

  get name() {
    return this.#name;
  }

  create(value) {
    let newValue =
      value === null || typeof value === 'undefined' ? value : new Date(value);
    if (typeof newValue === 'undefined') newValue = this.#createDefaultValue();
    this.#typeCheck(newValue);
    return newValue;
  }

  #createDefaultValue() {
    return new Date(this.#defaultValue);
  }

  #typeCheck(value) {
    if (value instanceof Date) {
      if (value < this.#range.min) {
        throw new Error(
          `${this.name} must be greater than or equal to ${this.#range.min}.`
        );
      }
      if (value > this.#range.max) {
        throw new Error(
          `${this.name} must be less than or equal to ${this.#range.max}.`
        );
      }
      return;
    }
    if (value === null && !this.#nullable) return;
    throw new Error(
      `${this.name} must be a valid date${this.#nullable ? ' or null' : ''}.`
    );
  }
}
