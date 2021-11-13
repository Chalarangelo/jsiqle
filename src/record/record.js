import symbols from 'src/symbols';

const { $recordValue, $recordHandler, $recordModel, $key } = symbols;

class Record {
  #recordValue;
  #recordHandler;

  constructor(value, handler) {
    this.#recordValue = value;
    this.#recordHandler = handler;
    return new Proxy(this, this.#recordHandler);
  }

  get [$recordHandler]() {
    return this.#recordHandler;
  }

  get [$recordValue]() {
    return this.#recordValue;
  }

  get [$recordModel]() {
    return this.#recordHandler.model;
  }

  get [Symbol.toStringTag]() {
    const model = this[$recordModel];
    const key = model[$key].name;
    return `${model.name}#${this[$recordValue][key]}`;
  }
}

export default Record;
