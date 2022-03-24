import { validateName } from 'src/utils';

export default class StringArrayField {
  #nullable = true;
  #name;
  #defaultValue;
  #size = {
    min: 0,
    max: Number.POSITIVE_INFINITY,
  };
  #length = {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
  };
  #regex;

  constructor({
    name,
    defaultValue = null,
    notNull = false,
    minSize = null,
    maxSize = null,
    minLength = null,
    maxLength = null,
    regex = null,
  }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
    this.#nullable = !notNull;
    if (typeof minLength === 'number') this.#length.min = minLength;
    if (typeof maxLength === 'number') this.#length.max = maxLength;
    if (typeof minSize === 'number') this.#size.min = minSize;
    if (typeof maxSize === 'number') this.#size.max = maxSize;
    if (typeof regex === 'string' || regex instanceof RegExp)
      this.#regex = new RegExp(regex);
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
        if (typeof item !== 'string') {
          throw new Error(`${this.name} must be an array of strings.`);
        }
        if (item.length < this.#length.min) {
          throw new Error(
            `Values in ${this.name} must be at least ${
              this.#length.min
            } characters long.`
          );
        }
        if (item > this.#length.max) {
          throw new Error(
            `Values in ${this.name} must be at most ${
              this.#length.max
            } characters long.`
          );
        }
        if (this.#regex && !this.#regex.test(item)) {
          throw new Error(
            `Values in ${this.name} must match the regular expression ${
              this.#regex
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
      `${this.name} must be an array of strings${
        this.#nullable ? ' or null' : ''
      }.`
    );
  }
}
