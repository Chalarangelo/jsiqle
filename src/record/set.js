import symbols from 'src/symbols';
import { allEqualBy } from 'src/utils';
import { NameError, DuplicationError } from 'src/errors';
import PartialRecord from './partial';
import RecordFragment from './fragment';
import RecordGroup from './group';

const {
  $recordModel,
  $recordTag,
  $scopes,
  $addScope,
  $removeScope,
  $copyScopes,
  $isRecord,
  $key,
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
      throw new TypeError('Cannot modify a frozen RecordSet.');
    }
    super.set(key, value);
    return this;
  }

  delete(key) {
    if (this.#frozen) {
      throw new TypeError('Cannot modify a frozen RecordSet.');
    }
    super.delete(key);
    return this;
  }

  clear() {
    if (this.#frozen) {
      throw new TypeError('Cannot modify a frozen RecordSet.');
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

  except(...keys) {
    return new RecordSet({
      iterable: [...this.entries()].filter(([key]) => {
        return !keys.includes(key);
      }),
      copyScopesFrom: this,
    }).freeze();
  }

  sort(comparatorFn) {
    const sorted = [...this.entries()].sort(([key1, value1], [key2, value2]) =>
      comparatorFn(value1, value2, key1, key2)
    );
    return new RecordSet({ iterable: sorted, copyScopesFrom: this }).freeze();
  }

  every(callbackFn) {
    return [...this.entries()].every(([key, value]) =>
      callbackFn(value, key, this)
    );
  }

  some(callbackFn) {
    return [...this.entries()].some(([key, value]) =>
      callbackFn(value, key, this)
    );
  }

  includes(value) {
    return this.has(value);
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

  flatSelect(...keys) {
    return [...this.values()].map(value =>
      keys.reduce((obj, key) => ({ ...obj, [key]: value[key] }), {})
    );
  }

  pluck(...keys) {
    return new RecordSet({
      iterable: [...this.entries()].map(([key, value]) => {
        const values = keys.map(key => value[key]);
        return [key, new RecordFragment(values, value[$recordTag])];
      }),
      copyScopesFrom: this,
    }).freeze();
  }

  flatPluck(...keys) {
    return [...this.values()].map(value => keys.map(key => value[key]));
  }

  // groupBy(key)
  groupBy(key) {
    const res = new RecordSet({ copyScopesFrom: this, iterable: [] });
    for (const [recordKey, value] of this.entries()) {
      let keyValue = value[key];
      if (keyValue !== undefined && keyValue !== null && keyValue[$isRecord]) {
        keyValue = value[key][$key];
      }
      if (!res.has(keyValue)) {
        res.set(
          keyValue,
          new RecordGroup({
            copyScopesFrom: this,
            iterable: [],
            groupName: keyValue,
          })
        );
      }
      res.get(keyValue).set(recordKey, value);
    }

    for (const value of res.values()) {
      value.freeze();
    }

    return res.freeze();
  }

  get first() {
    for (const [, value] of this) return value;
    return undefined;
  }

  get last() {
    if (this.size === 0) return undefined;
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

  *batchIterator(batchSize) {
    let batch = [];
    for (const [key, value] of this) {
      batch.push([key, value]);
      if (batch.length === batchSize) {
        yield batch;
        batch = [];
      }
    }
    if (batch.length) yield batch;
  }

  limit(n) {
    let records = [];
    for (const [key, value] of this) {
      records.push([key, value]);
      if (records.length === n) break;
    }
    return new RecordSet({
      iterable: records,
      copyScopesFrom: this,
    }).freeze();
  }

  offset(n) {
    let counter = 0;
    let records = [];
    for (const [key, value] of this) {
      if (counter < n) counter++;
      else records.push([key, value]);
    }
    return new RecordSet({
      iterable: records,
      copyScopesFrom: this,
    }).freeze();
  }

  toJSON() {
    return [...this.entries()].reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
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

  // Protected (package internal-use only)

  [$addScope](name, scope) {
    RecordSet.#validateMethod('Scope', name, scope, this.#scopes);
    if (
      this[name] ||
      Object.getOwnPropertyNames(RecordSet.prototype).includes(name)
    )
      throw new NameError(`Scope name ${name} is already in use.`);

    this.#scopes.set(name, scope);
    Object.defineProperty(this, name, {
      configurable: true, // Allows deletion in $removeScope
      get: () => {
        return this.where(this.#scopes.get(name));
      },
    });
  }

  [$removeScope](name) {
    this.#scopes.delete(
      RecordSet.#validateContains('Scope', name, this.#scopes)
    );
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

  // Private

  static #validateMethod(callbackType, callbackName, callback, callbacks) {
    if (typeof callback !== 'function')
      throw new TypeError(`${callbackType} ${callbackName} is not a function.`);

    if (callbacks.has(callbackName))
      throw new DuplicationError(
        `${callbackType} ${callbackName} already exists.`
      );

    return callback;
  }

  static #validateContains(objectType, objectName, objects) {
    if (!objects.has(objectName))
      throw new ReferenceError(`${objectType} ${objectName} does not exist.`);

    return objectName;
  }
}

export default RecordSet;
