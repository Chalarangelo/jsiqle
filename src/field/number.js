import { validateName } from 'src/utils';

export default class NumberField {
  #nullable = true;
  #name;
  #defaultValue;
  #range = {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
  };
  #integer = false;

  constructor({
    name,
    defaultValue = null,
    notNull = false,
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
    return this.#defaultValue;
  }

  #typeCheck(value) {
    if (typeof value === 'number') {
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
      if (this.#integer && value % 1 !== 0) {
        throw new Error(`${this.name} must be an integer.`);
      }
      return;
    }
    if (value === null && !this.#nullable) return;
    throw new Error(
      `${this.name} must be a number${this.#nullable ? ' or null' : ''}.`
    );
  }
}
