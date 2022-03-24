import { validateName } from 'src/utils';

export default class EnumField {
  #nullable = true;
  #name;
  #defaultValue;
  #values;

  constructor({ name, values = [], defaultValue = null, notNull = false }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
    this.#values = values;
    this.#nullable = !notNull;
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
      if (!this.#values.includes(value)) {
        throw new Error(
          `${this.name} must be one of ${this.#values.join(', ')}.`
        );
      }
      return;
    }
    if (value === null && !this.#nullable) return;
    throw new Error(
      `${this.name} must be a valid string${this.#nullable ? ' or null' : ''}.`
    );
  }
}
