import { symbolize } from 'src/utils/symbols';

const $recordValue = symbolize('recordValue');
const $recordHandler = symbolize('recordHandler');
const $recordModel = symbolize('recordModel');
const $key = symbolize('key');

export class Record {
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
    const key = model[$key];
    return `${model.name}#${this[$recordValue][key]}`;
  }
}
