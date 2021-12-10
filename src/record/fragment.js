import symbols from 'src/symbols';

const { $recordTag } = symbols;

export default class RecordFragment extends Array {
  #tag;

  constructor(values, tag) {
    super();
    values.forEach(value => {
      this.push(value);
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
    return [...this];
  }

  toJSON() {
    return this.toObject();
  }
}
