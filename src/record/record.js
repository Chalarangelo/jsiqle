import symbols from 'src/symbols';

const {
  $recordValue,
  $wrappedRecordValue,
  $recordHandler,
  $recordModel,
  $recordTag,
  $key,
} = symbols;

class Record {
  #recordValue;
  #recordHandler;
  #proxiedRecord;

  constructor(value, handler) {
    this.#recordValue = value;
    this.#recordHandler = handler;
    this.#proxiedRecord = new Proxy(this, this.#recordHandler);
    return this.#proxiedRecord;
  }

  /* istanbul ignore next */
  get [$recordHandler]() {
    return this.#recordHandler;
  }

  get [$recordValue]() {
    return this.#recordValue;
  }

  // This is used to get the record wrapped in the handler proxy. It's useful
  // for method calls in records, so that they can access relationships and
  // other methods via the handler proxy.
  /* istanbul ignore next */
  get [$wrappedRecordValue]() {
    return this.#proxiedRecord;
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
