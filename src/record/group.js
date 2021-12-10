import symbols from 'src/symbols';
import RecordSet from './set';

const { $groupTag } = symbols;

export default class RecordGroup extends RecordSet {
  #groupName;

  constructor({ iterable = [], copyScopesFrom = null, groupName = '' } = {}) {
    super({ iterable, copyScopesFrom });
    this.#groupName = groupName;
  }

  /* istanbul ignore next */
  get [$groupTag]() {
    return this.#groupName;
  }

  /* istanbul ignore next */
  get [Symbol.toStringTag]() {
    return this[$groupTag];
  }
}
