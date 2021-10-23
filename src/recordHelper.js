import { symbolize } from './utils/symbols.js';

const $fields = symbolize('fields');
const $methods = symbolize('methods');

export class RecordHandler {
  constructor(model) {
    this.model = model;
  }

  get(record, property) {
    if (this.model[$fields].has(property)) return record[property];
    if (this.model[$methods].has(property))
      return this.model[$methods].get(property)(record);
  }
}

export class Record extends Proxy {
  constructor(value, handler) {
    super(value, handler);
  }
}
