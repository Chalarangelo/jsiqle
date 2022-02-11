import { allEqualBy } from 'src/utils';
import { NameError, DuplicationError } from 'src/errors';
import PartialRecord from './partial';
import RecordFragment from './fragment';
import RecordGroup from './group';
import symbols from 'src/symbols';

const {
  $recordModel,
  $recordTag,
  $scopes,
  $addScope,
  $removeScope,
  $isRecord,
  $setRecordKey,
} = symbols;

/**
 * An extension of the native Map object. Provides the same API, along with
 * additional methods similar to the Array prototype.
 */
class RecordSet extends Map {
  #frozen;
  #scopes;
  #keyName;

  // TODO: V2 enhancements
  // Add some way to pass the handler to the record set to prevent adding new
  // values to the record set. Generally speaking calling `.set()` on a record
  // set should probably be disabled.
  constructor({ iterable = [], copyScopesFrom = null } = {}) {
    super();
    for (const [key, value] of iterable) this.set(key, value);

    this.#scopes = new Map();
    if (copyScopesFrom) this.#copyScopes(copyScopesFrom);

    this.#frozen = false;
  }

  /**
   * Freezes a record set, preventing further modification.
   * @returns {RecordSet} The record set itself.
   */
  freeze() {
    this.#frozen = true;
    return this;
  }

  /**
   *
   * @param {*} key The key of the element to add to the record set.
   * @param {*} value The value of the element to add to the record set.
   * @returns {RecordSet} The record set itself.
   */
  set(key, value) {
    // TODO: V2 Enhancements
    // Ensure this is only ever called internally (maybe symbolize it?)
    // Schema[$handleExperimentalAPIMessage](
    //   'Calling RecordSet.prototype.set() is discouraged as it may cause unexpected behavior. This method may be removed in a future version of the library.'
    // );
    if (this.#frozen) throw new TypeError('Cannot modify a frozen RecordSet.');
    super.set(key, value);
    return this;
  }

  /**
   * @param {*} key The key of the element to remove from the record set.
   * @returns {boolean} True if the element was removed, false otherwise.
   */
  delete(key) {
    if (this.#frozen) throw new TypeError('Cannot modify a frozen RecordSet.');
    return super.delete(key);
  }

  /**
   * Removes all elements from the record set.
   */
  clear() {
    if (this.#frozen) throw new TypeError('Cannot modify a frozen RecordSet.');
    super.clear();
  }

  /**
   * Creates an object populated with the results of calling a provided function
   * on every element in the calling record set.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Object} An object with each key mapped to the result of the
   * callback function on the corresponding element.
   */
  map(callbackFn) {
    return [...this.entries()].reduce((newMap, [key, value]) => {
      newMap[key] = callbackFn(value, key, this);
      return newMap;
    }, {});
  }

  /**
   * Creates an array of values by running each element of the record set
   * through the provided transformation function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Array} An array with each element being the result of the
   * callback function on the corresponding element.
   */
  flatMap(callbackFn) {
    return [...this.entries()].map(([key, value]) => {
      return callbackFn(value, key, this);
    });
  }

  /**
   * Executes a user-supplied “reducer” callback function on each element of the
   * record set, passing in the return value from the calculation on the preceding
   * element. The final result of running the reducer across all elements of the
   * record set is a single value.
   * @param {Function} callbackFn A “reducer” function that takes four arguments:
   * - `accumulator`: The value returned from the previous iteration of the
   * reducer.
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @param {*} initialValue The initial value of the accumulator.
   * @returns {*} The value that results from running the “reducer” callback
   * function to completion over the entire record set.
   */
  reduce(callbackFn, initialValue) {
    return [...this.entries()].reduce((acc, [key, value]) => {
      return callbackFn(acc, value, key, this);
    }, initialValue);
  }

  /**
   * Creates a new record set with all elements that pass the test implemented
   * by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {RecordSet} A new record set with all elements that pass the test.
   */
  filter(callbackFn) {
    return [...this.entries()]
      .reduce((newMap, [key, value]) => {
        if (callbackFn(value, key, this)) newMap.set(key, value);
        return newMap;
      }, new RecordSet({ copyScopesFrom: this }))
      .freeze();
  }

  /**
   * Creates an array with all elements that pass the test implemente by the
   * provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Array} An array with all elements that pass the test.
   */
  flatFilter(callbackFn) {
    return [...this.entries()].reduce((arr, [key, value]) => {
      if (callbackFn(value, key, this)) arr.push(value);
      return arr;
    }, []);
  }

  /**
   * Returns the value of the first element in the record set that satisfies
   * the provided testing function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Record} The value of the first element in the record set that
   * satisfies the provided testing function or `undefined`.
   */
  find(callbackFn) {
    for (const [key, value] of this.entries()) {
      if (callbackFn(value, key, this)) return value;
    }
    return undefined;
  }

  /**
   * Returns the key of the first element in the record set that satisfies the
   * provided testing function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {*} The key of the first element in the record set that satisfies
   * the provided testing function or `undefined`.
   */
  findKey(callbackFn) {
    for (const [key, value] of this.entries()) {
      if (callbackFn(value, key, this)) return key;
    }
    return undefined;
  }

  /**
   * Returns all elements in the record set whose keys  match the provided
   * key/keys in order of appearance in the given keys.
   * @param  {...any} keys A list of keys to exclude from the record set.
   * @returns {RecordSet} A new record set with all elements whose keys
   * match the provided key/keys.
   */
  only(...keys) {
    return new RecordSet({
      iterable: keys.reduce((itr, key) => {
        if (this.has(key)) itr.push([key, this.get(key)]);
        return itr;
      }, []),
      copyScopesFrom: this,
    }).freeze();
  }

  /**
   * Returns all elements in the record set whose keys do not match the provided
   * key/keys.
   * @param  {...any} keys A list of keys to exclude from the record set.
   * @returns {RecordSet} A new record set with all elements whose keys do not
   * match the provided key/keys.
   */
  except(...keys) {
    return new RecordSet({
      iterable: [...this.entries()].filter(([key]) => {
        return !keys.includes(key);
      }),
      copyScopesFrom: this,
    }).freeze();
  }

  /**
   * Sorts the elements of the record set and returns a new sorted record set.
   * @param {Function} callbackFn Function that defined the sort order. The
   * callback is called with the following arguments:
   * - `firstValue`: The value of the first element for comparison.
   * - `secondValue`: The value of the second element for comparison.
   * - `firstKey`: The key of the first element for comparison.
   * - `secondKey`: The key of the second element for comparison.
   * @returns {RecordSet} A new record set with the elements of the original
   * record set sorted.
   */
  sort(comparatorFn) {
    const sorted = [...this.entries()].sort(([key1, value1], [key2, value2]) =>
      comparatorFn(value1, value2, key1, key2)
    );
    return new RecordSet({ iterable: sorted, copyScopesFrom: this }).freeze();
  }

  /**
   * Tests whether all elements in the record set pass the test implemented
   * by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Boolean} `true` if all elements in the record set pass the test,
   * `false` otherwise.
   */
  every(callbackFn) {
    if (this.size === 0) return true;
    return [...this.entries()].every(([key, value]) =>
      callbackFn(value, key, this)
    );
  }

  /**
   * Tests whether some elements in the record set pass the test implemented
   * by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Boolean} `true` if any elements in the record set pass the test,
   * `false` otherwise.
   */
  some(callbackFn) {
    if (this.size === 0) return false;
    return [...this.entries()].some(([key, value]) =>
      callbackFn(value, key, this)
    );
  }

  /**
   * Returns a new record set with all elements mapped to the keys specified.
   * @param  {...any} keys A list of keys to map each record to.
   * @returns {RecordSet} A new record set with all elements mapped to the
   * keys specified.
   */
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

  /**
   * Returns an array of objects with all elements mapped to the keys specified.
   * @param  {...any} keys A list of keys to map each record to.
   * @returns {Array} An array with all elements mapped to the keys specified.
   */
  flatSelect(...keys) {
    return [...this.values()].map(value =>
      keys.reduce((obj, key) => ({ ...obj, [key]: value[key] }), {})
    );
  }

  /**
   * Returns a new record set with records mapped to fragments containing
   * only the keys specified.
   * @param  {...any} keys A list of keys to map each record to.
   * @returns {RecordSet} A new record set with all elements mapped to
   * fragments containing only the keys specified.
   */
  pluck(...keys) {
    return new RecordSet({
      iterable: [...this.entries()].map(([key, value]) => {
        const values = keys.map(key => value[key]);
        return [key, new RecordFragment(values, value[$recordTag])];
      }),
      copyScopesFrom: this,
    }).freeze();
  }

  /**
   * Returns an array with records mapped to arrays containing only the
   * keys specified. If only one key is specified, the array contains the
   * value of each element instead.
   * @param  {...any} keys A list of keys to map each record to.
   * @returns {RecordSet} A new record set with all elements mapped to
   * fragments containing only the keys specified.
   */
  flatPluck(...keys) {
    const isSingleKey = keys.length === 1;
    if (isSingleKey) {
      const key = keys[0];
      if (this.#keyName === key) return [...this.keys()];
      return [...this.values()].map(value => value[key]);
    }
    return [...this.values()].map(value => keys.map(key => value[key]));
  }

  /**
   * Group the elements of the record set by the specified key.
   * @param {*} key A key to group the elements by.
   * @returns {RecordSet} A new record set containing groups of elements.
   */
  groupBy(key) {
    const res = new RecordSet({ copyScopesFrom: this, iterable: [] });
    for (const [recordKey, value] of this.entries()) {
      let keyValue = value[key];
      if (keyValue !== undefined && keyValue !== null && keyValue[$isRecord]) {
        keyValue = value[key].id;
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

  /**
   * Duplicates the current record set.
   * @returns {RecordSet} A new record set with the same elements as the original.
   */
  duplicate() {
    return new RecordSet({
      iterable: [...this.entries()],
      copyScopesFrom: this,
    }).freeze();
  }

  /**
   * Merges one or more record sets into the current record set.
   * @param {...any} recordSets One or more record sets to merge.
   * @returns {RecordSet} A new record set with the elements of the original
   * record sets merged into it.
   */
  merge(...recordSets) {
    const res = new Map([...this.entries()]);
    for (const recordSet of recordSets) {
      for (const [key, value] of recordSet.entries()) {
        if (res.has(key))
          throw new DuplicationError(
            `Key ${key} already exists in the record set.`
          );
        res.set(key, value);
      }
    }
    return new RecordSet({
      iterable: [...res.entries()],
      copyScopesFrom: this,
    }).freeze();
  }

  /**
   * Merges one or more records into the current record set.
   * @param  {...any} records One or more records to merge.
   * @returns {RecordSet} A new record set with the elements of the original
   * record set and any given records merged into it.
   */
  append(...records) {
    const res = new RecordSet({
      iterable: [...this.entries()],
      copyScopesFrom: this,
    });
    for (const record of records) {
      res.set(record.id, record);
    }
    return res.freeze();
  }

  /**
   * Creates a new record set with all elements that pass the test implemented
   * by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {RecordSet} A new record set with all elements that pass the test.
   */
  where(callbackFn) {
    return this.filter(callbackFn);
  }

  /**
   * Creates a new record set with all elements that fail the test implemented
   * by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `recordSet`: The record set itself.
   * @returns {RecordSet} A new record set with all elements that fail the test.
   */
  whereNot(callbackFn) {
    return this.filter((value, key, map) => !callbackFn(value, key, map));
  }

  /**
   * Iterates over the record set's keys in array batches of the specified size.
   * @param {Number} batchSize The size of each batch.
   * @returns {Iterator} An iterator that yields array batches of the specified size.
   */
  *flatBatchKeysIterator(batchSize) {
    let batch = [];
    for (const key of this.keys()) {
      batch.push(key);
      if (batch.length === batchSize) {
        yield batch;
        batch = [];
      }
    }
    if (batch.length) yield batch;
  }

  /**
   * Iterates over the record set in array batches of the specified size.
   * @param {Number} batchSize The size of each batch.
   * @returns {Iterator} An iterator that yields array batches of the specified size.
   */
  *flatBatchIterator(batchSize) {
    let batch = [];
    for (const [, value] of this) {
      batch.push(value);
      if (batch.length === batchSize) {
        yield batch;
        batch = [];
      }
    }
    if (batch.length) yield batch;
  }

  /**
   * Iterates over the record set in batches of the specified size.
   * @param {Number} batchSize The size of each batch.
   * @returns {Iterator} An iterator that yields batches of the specified size.
   */
  *batchIterator(batchSize) {
    let batch = [];
    for (const [key, value] of this) {
      batch.push([key, value]);
      if (batch.length === batchSize) {
        yield new RecordSet({ copyScopesFrom: this, iterable: batch }).freeze();
        batch = [];
      }
    }
    if (batch.length)
      yield new RecordSet({ copyScopesFrom: this, iterable: batch }).freeze();
  }

  /**
   * Returns a new record set with only the first n elements.
   * @param {Number} n The number of elements to keep.
   * @returns {RecordSet} A new record set with only the first n elements.
   */
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

  /**
   * Returns a new record set with the first n elements removed.
   * @param {Number} n The number of elements to remove.
   * @returns {RecordSet} A new record set with the first n elements removed.
   */
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

  /**
   * Returns a new record set with the elements contained in a portion of the
   * record set.
   * @param {Number} start The index of the first element to include.
   * @param {Number} end The index after the last element to include.
   * @returns {RecordSet} A new record set with the elements contained in a
   * portion of the record set.
   */
  slice(start, end) {
    return new RecordSet({
      iterable: [...this.entries()].slice(start, end),
      copyScopesFrom: this,
    }).freeze();
  }

  /**
   * Returns the first element in the record set.
   */
  get first() {
    for (const [, value] of this) return value;
    return undefined;
  }

  /**
   * Returns the last element in the record set.
   */
  get last() {
    if (this.size === 0) return undefined;
    return [...this.entries()].pop()[1];
  }

  /**
   * Returns the number of elements in the record set.
   */
  get count() {
    return this.size;
  }

  /**
   * Returns the number of elements in the record set.
   */
  get length() {
    return this.size;
  }

  /**
   * Returns an array of the records contained in the record set.
   * @returns {Array<Record>} An array of the values contained in the record set.
   */
  toArray() {
    return [...this.values()];
  }

  /**
   * Returns an array of objects representing the records in the record set.
   * @returns {Array<Object>} An array of objects representing the records in
   * the record set.
   */
  toFlatArray() {
    return [...this.values()].map(value =>
      value instanceof RecordGroup ? value.toFlatArray() : value.toObject()
    );
  }

  /**
   * Returns an object representing the record set.
   * @returns {Object} An object representing the record set.
   */
  toObject() {
    return [...this.entries()].reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  }

  /**
   * Returns a flattened object of objects representing the records in the
   * record set.
   * @returns {Object} An object representing the records in the record set.
   */
  toFlatObject() {
    return [...this.entries()].reduce((obj, [key, value]) => {
      obj[key] =
        value instanceof RecordGroup ? value.toFlatArray() : value.toObject();
      return obj;
    }, {});
  }

  /**
   * Returns the object repeseentation of the record set.
   * Used by JSON.stringify().
   * @returns {Object} The object representation of the record set.
   */
  toJSON() {
    return this.toObject();
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

  [$addScope](name, scope, sortFn) {
    RecordSet.#validateProperty('Scope', name, scope, this.#scopes);
    if (sortFn) RecordSet.#validateFunction('Scope comparator', name, sortFn);
    if (
      this[name] ||
      Object.getOwnPropertyNames(RecordSet.prototype).includes(name)
    )
      throw new NameError(`Scope name ${name} is already in use.`);

    this.#scopes.set(name, [scope, sortFn]);
    Object.defineProperty(this, name, {
      configurable: true, // Allows deletion in $removeScope
      get: () => {
        return this.#scopedWhere(name);
      },
    });
  }

  [$removeScope](name) {
    this.#scopes.delete(
      RecordSet.#validateContains('Scope', name, this.#scopes)
    );
    delete this[name];
  }

  [$setRecordKey](keyName) {
    this.#keyName = keyName;
  }

  get [$scopes]() {
    return this.#scopes;
  }

  // Private

  #copyScopes(otherRecordSet) {
    otherRecordSet[$scopes].forEach((scope, name) => {
      // No need to verify that the scope is valid, it must be verified by the
      // other record set already.
      this.#scopes.set(name, scope);
      Object.defineProperty(this, name, {
        configurable: true, // Allows deletion in $removeScope
        get: () => {
          return this.#scopedWhere(name);
        },
      });
    });
  }

  #scopedWhere(scopeName) {
    const [matcherFn, comparatorFn] = this.#scopes.get(scopeName);
    let matches = [];
    for (const [key, value] of this.entries())
      if (matcherFn(value, key, this)) matches.push([key, value]);
    if (comparatorFn)
      matches.sort(([key1, value1], [key2, value2]) =>
        comparatorFn(value1, value2, key1, key2)
      );
    return new RecordSet({ iterable: matches, copyScopesFrom: this }).freeze();
  }

  static #validateProperty(callbackType, callbackName, callback, callbacks) {
    if (typeof callback !== 'function')
      throw new TypeError(`${callbackType} ${callbackName} is not a function.`);

    if (callbacks.has(callbackName))
      throw new DuplicationError(
        `${callbackType} ${callbackName} already exists.`
      );

    return callback;
  }

  static #validateFunction(callbackType, callbackName, callback) {
    if (typeof callback !== 'function')
      throw new TypeError(`${callbackType} ${callbackName} is not a function.`);
    return callback;
  }

  static #validateContains(objectType, objectName, objects) {
    if (!objects.has(objectName))
      throw new ReferenceError(`${objectType} ${objectName} does not exist.`);

    return objectName;
  }
}

export default RecordSet;
