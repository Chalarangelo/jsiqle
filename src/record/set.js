import symbols from 'src/symbols';
import { allEqualBy } from 'src/utils';
import {
  validateRecordSetMethod,
  validateRecordSetContains,
} from 'src/validation';
import PartialRecord from './partial';

const {
  $recordModel,
  $recordTag,
  $scopes,
  $addScope,
  $removeScope,
  $copyScopes,
} = symbols;

/**
 * An extension of the native Map object. Provides the same API, along with
 * additional methods similar to the Array prototype.
 */
class RecordSet extends Map {
  #frozen;
  #scopes;

  constructor({ iterable = [], copyScopesFrom = null } = {}) {
    super();
    for (const [key, value] of iterable) this.set(key, value);

    this.#scopes = new Map();
    if (copyScopesFrom) {
      this[$copyScopes](copyScopesFrom);
    }
    this.#frozen = false;
  }

  freeze() {
    this.#frozen = true;
    return this;
  }

  set(key, value) {
    if (this.#frozen) {
      throw new Error('Cannot modify a frozen RecordSet');
    }
    super.set(key, value);
    return this;
  }

  delete(key) {
    if (this.#frozen) {
      throw new Error('Cannot modify a frozen RecordSet');
    }
    super.delete(key);
    return this;
  }

  clear() {
    if (this.#frozen) {
      throw new Error('Cannot modify a frozen RecordSet');
    }
    super.clear();
    return this;
  }

  /**
   * Creates a new map populated with the results of calling a provided function
   * on every element in the calling map.
   * @param {Function} callbackFn Function that is called for every element of
   * the map. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `map`: The map itself.
   * @returns {RecordSet} A new map with each element being the result of the
   * callback function.
   */
  map(callbackFn) {
    return [...this.entries()]
      .reduce((newMap, [key, value]) => {
        newMap.set(key, callbackFn(value, key, this));
        return newMap;
      }, new RecordSet({ copyScopesFrom: this }))
      .freeze();
  }

  /**
   * Executes a user-supplied “reducer” callback function on each element of the
   * map, passing in the return value from the calculation on the preceding
   * element. The final result of running the reducer across all elements of the
   * map is a single value.
   * @param {Function} callbackFn A “reducer” function that takes four arguments:
   * - `accumulator`: The value returned from the previous iteration of the
   * reducer.
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `map`: The map itself.
   * @param {*} initialValue The initial value of the accumulator.
   * @returns The value that results from running the “reducer” callback
   * function to completion over the entire map.
   */
  reduce(callbackFn, initialValue) {
    return [...this.entries()].reduce((acc, [key, value]) => {
      return callbackFn(acc, value, key, this);
    }, initialValue);
  }

  /**
   * Creates a new map with all elements that pass the test implemented by the
   * provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the map. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `map`: The map itself.
   * @returns {RecordSet} A new map with all elements that pass the test.
   */
  filter(callbackFn) {
    return [...this.entries()]
      .reduce((newMap, [key, value]) => {
        if (callbackFn(value, key, this)) newMap.set(key, value);
        return newMap;
      }, new RecordSet({ copyScopesFrom: this }))
      .freeze();
  }

  find(callbackFn) {
    const match = [...this.entries()].find(([key, value]) =>
      callbackFn(value, key, this)
    );
    if (match) return match[1];
    return undefined;
  }

  sort(comparatorFn) {
    const sorted = [...this.entries()].sort(([key1, value1], [key2, value2]) =>
      comparatorFn(value1, value2, key1, key2)
    );
    return new RecordSet({ iterable: sorted, copyScopesFrom: this }).freeze();
  }

  select(...keys) {
    return new RecordSet({
      iterable: [...this.entries()].map(([key, value]) => {
        const obj = {};
        keys.forEach(key => (obj[key] = value[key]));
        return [key, new PartialRecord(obj, value[$recordTag])];
      }),
      copyScopesFrom: this,
    }).freeze();
  }

  // pluck(...keys)

  // groupBy(key)

  get first() {
    return [...this.entries()].shift()[1];
  }

  get last() {
    return [...this.entries()].pop()[1];
  }

  get count() {
    return this.size;
  }

  where(callbackFn) {
    return this.filter(callbackFn);
  }

  whereNot(callbackFn) {
    return this.filter((value, key, map) => !callbackFn(value, key, map));
  }

  /* istanbul ignore next */
  get [Symbol.toStringTag]() {
    const records = [...this.values()];
    try {
      const firstModel = records[0][$recordModel].name;
      if (allEqualBy(records, value => value[$recordModel].name === firstModel))
        return firstModel;
    } catch (e) {
      return '';
    }
    return '';
  }

  /* istanbul ignore next */
  static get [Symbol.species]() {
    return Map;
  }

  [$addScope](name, scope) {
    validateRecordSetMethod('Scope', name, scope, this.#scopes);
    if (this[name]) throw new Error(`Scope name ${name} is already in use.`);

    this.#scopes.set(name, scope);
    Object.defineProperty(this, name, {
      get: () => {
        return this.where(this.#scopes.get(name));
      },
    });
  }

  [$removeScope](name) {
    this.#scopes.delete(validateRecordSetContains('Scope', name, this.#scopes));
    delete this[name];
  }

  [$copyScopes](otherRecordSet) {
    otherRecordSet[$scopes].forEach((scope, name) => {
      this[$addScope](name, scope);
    });
  }

  get [$scopes]() {
    return this.#scopes;
  }
}

export default RecordSet;
