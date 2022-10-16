import symbols from 'src/symbols';

const {
  $recordValue,
  $wrappedRecordValue,
  $recordHandler,
  $recordModel,
  $recordTag,
  $cachedProperties,
} = symbols;

class Record {
  #recordValue;
  #recordHandler;
  #proxiedRecord;
  #cachedProperties;
  #obsolete = false;

  constructor(value, handler) {
    this.#recordValue = value;
    this.#recordHandler = handler;
    this.#cachedProperties = new Map();
    this.#proxiedRecord = new Proxy(this, this.#recordHandler);
    return this.#proxiedRecord;
  }

  get [$cachedProperties]() {
    return this.#cachedProperties;
  }

  get makeObsolete() {
    this.#obsolete = true;
    return true;
  }

  get isObsolete() {
    return this.#obsolete;
  }

  /* istanbul ignore next */
  get [$recordHandler]() {
    return this.#recordHandler;
  }

  get [$recordValue]() {
    return this.#recordValue;
  }

  // This is used to get the record wrapped in the handler proxy. It's useful
  // for property calls in records, so that they can access relationships and
  // other properties via the handler proxy.
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
    return `${model.name}#${this[$recordValue].id}`;
  }

  /* istanbul ignore next */
  get [Symbol.toStringTag]() {
    return this[$recordTag];
  }
}

export default Record;
