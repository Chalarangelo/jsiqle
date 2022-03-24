import symbols from 'src/symbols';
import { validateName } from 'src/utils';

const { $defaultValue } = symbols;

export default class Field {
  #name;
  #defaultValue;

  constructor({ name, defaultValue = null }) {
    this.#name = validateName('Field', name);
    this.#defaultValue = defaultValue;
  }

  get name() {
    return this.#name;
  }

  typeCheck() {
    return false;
  }

  // Protected (package internal-use only)

  get [$defaultValue]() {
    return this.#defaultValue;
  }
}
