import { validateName } from 'src/utils';

export default class BooleanField {
  #nullable = true;
  #name;
  #defaultValue;

  constructor({ name, defaultValue = null, notNull = false }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
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
    if (typeof value === 'boolean') return;
    if (value === null && this.#nullable) return;
    throw new Error(
      `${this.name} must be a boolean${this.#nullable ? ' or null' : ''}.`
    );
  }
}
