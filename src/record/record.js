import symbols from 'src/symbols';

const { $recordValue, $recordHandler, $recordModel, $recordTag, $key } =
  symbols;

class Record {
  #recordValue;
  #recordHandler;

  constructor(value, handler) {
    this.#recordValue = value;
    this.#recordHandler = handler;
    return new Proxy(this, this.#recordHandler);
  }

  /* istanbul ignore next */
  get [$recordHandler]() {
    return this.#recordHandler;
  }

  get [$recordValue]() {
    return this.#recordValue;
  }

  /* istanbul ignore next */
  get [$recordModel]() {
    return this.#recordHandler.model;
  }

  /* istanbul ignore next */
  get [$recordTag]() {
    const model = this[$recordModel];
    const key = model[$key].name;
    return `${model.name}#${this[$recordValue][key]}`;
  }

  /* istanbul ignore next */
  get [Symbol.toStringTag]() {
    return this[$recordTag];
  }
}

export default Record;
