import symbols from 'src/symbols';

const { $recordTag } = symbols;

export default class RecordFragment extends Array {
  #tag;

  constructor(values, tag) {
    super(...values);
    this.#tag = tag;
  }

  get [$recordTag]() {
    return this.#tag;
  }

  get [Symbol.toStringTag]() {
    return this[$recordTag];
  }

  toObject() {
    return [...this];
  }

  toJSON() {
    return this.toObject();
  }
}
