import symbols from 'src/symbols';

const { $recordTag } = symbols;

export default class PartialRecord {
  #tag;

  constructor(value, tag) {
    Object.keys(value).forEach(key => {
      this[key] = value[key];
    });
    this.#tag = tag;
  }

  /* istanbul ignore next */
  get [$recordTag]() {
    return this.#tag;
  }

  /* istanbul ignore next */
  get [Symbol.toStringTag]() {
    return this[$recordTag];
  }

  toObject() {
    return { ...this };
  }

  toJSON() {
    return this.toObject();
  }
}
