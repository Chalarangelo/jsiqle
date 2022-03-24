import { validateName } from 'src/utils';

export default class StringField {
  #nullable = true;
  #name;
  #defaultValue;
  #length = {
    min: Number.NEGATIVE_INFINITY,
    max: Number.POSITIVE_INFINITY,
  };
  #regex;

  constructor({
    name,
    defaultValue = null,
    notNull = false,
    minLength = null,
    maxLength = null,
    regex = null,
  }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
    this.#nullable = !notNull;
    if (typeof minLength === 'number') this.#length.min = minLength;
    if (typeof maxLength === 'number') this.#length.max = maxLength;
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
    return this.#defaultValue;
  }

  #typeCheck(value) {
    if (typeof value === 'string') {
      if (value.length < this.#length.min) {
        throw new Error(
          `${this.name} must be at least ${this.#length.min} characters long.`
        );
      }
      if (value.length > this.#length.max) {
        throw new Error(
          `${this.name} must be at most ${this.#length.min} characters long.`
        );
      }
      if (this.#regex && !this.#regex.test(value)) {
        throw new Error(
          `${this.name} must match the regular expression ${this.#regex}.`
        );
      }
      return;
    }
    if (value === null && !this.#nullable) return;
    throw new Error(
      `${this.name} must be a string${this.#nullable ? ' or null' : ''}.`
    );
  }
}
