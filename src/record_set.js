import symbols from './symbols.js';

const {
  $scopes,
  $addScope,
  $isRecord,
  $set,
  $delete,
  $clearRecordSetForTesting,
} = symbols;

/**
 * An extension of the native Map object. Provides the same API, along with
 * additional methods similar to the Array prototype.
 */
class RecordSet extends Map {
  #model;

  constructor({ iterable = [], model = null } = {}) {
    super();

    if (!model) throw new TypeError('Model cannot be empty.');
    this.#model = model;

    for (const [id, value] of iterable) this[$set](id, value);

    this.#copyScopesFromModel();
  }

  set() {
    throw new TypeError(
      'You cannot directly modify a RecordSet. Please use `Model.prototype.createRecord()` instead.'
    );
  }

  delete() {
    throw new TypeError(
      'You cannot directly modify a RecordSet. Please use `Model.prototype.deleteRecord()` instead.'
    );
  }

  clear() {
    throw new TypeError(
      'You cannot directly modify a RecordSet Please use `Model.prototype.deleteRecord()` instead.'
    );
  }

  /**
   * Creates an array or object populated with the results of calling a provided
   * function on every element in the calling record set.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `id`: The id of the current element.
   * - `recordSet`: The record set itself.
   * @param {Object} options An object with options for the map operation.
   * @param {Boolean} options.flat Whether to return an array or object.
   * @returns {Array/Object} An array or object with the results of the callback
   * function on each element.
   */
  map(callbackFn, { flat = false } = {}) {
    if (flat)
      return [...this.entries()].map(([id, value]) => {
        return callbackFn(value, id, this);
      });

    return [...this.entries()].reduce((newMap, [id, value]) => {
      newMap[id] = callbackFn(value, id, this);
      return newMap;
    }, {});
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
   * - `id`: The id of the current element.
   * - `recordSet`: The record set itself.
   * @param {*} initialValue The initial value of the accumulator.
   * @returns {*} The value that results from running the “reducer” callback
   * function to completion over the entire record set.
   */
  reduce(callbackFn, initialValue) {
    return [...this.entries()].reduce((acc, [id, value]) => {
      return callbackFn(acc, value, id, this);
    }, initialValue);
  }

  /**
   * Creates a new record set or array with all elements that pass the test
   * implemented by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `id`: The id of the current element.
   * - `recordSet`: The record set itself.
   * @param {Boolean} options.flat Whether to return an array or object.
   * @returns {Array/RecordSet} An array or record set with all elements that
   * pass the test.
   */
  filter(callbackFn, { flat = false } = {}) {
    if (flat)
      return [...this.entries()].reduce((arr, [id, value]) => {
        if (callbackFn(value, id, this)) arr.push(value);
        return arr;
      }, []);

    return [...this.entries()].reduce((newRecordSet, [id, record]) => {
      if (callbackFn(record, id, this)) newRecordSet[$set](id, record);
      return newRecordSet;
    }, new RecordSet({ model: this.#model }));
  }

  /**
   * Returns the value of the first element in the record set that satisfies
   * the provided testing function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `id`: The id of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Record} The value of the first element in the record set that
   * satisfies the provided testing function or `undefined`.
   */
  find(callbackFn) {
    for (const [id, record] of this) {
      if (callbackFn(record, id, this)) return record;
    }
    return undefined;
  }

  /**
   * Returns the id of the first element in the record set that satisfies the
   * provided testing function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `id`: The id of the current element.
   * - `recordSet`: The record set itself.
   * @returns {*} The id of the first element in the record set that satisfies
   * the provided testing function or `undefined`.
   */
  findId(callbackFn) {
    for (const [id, value] of this) {
      if (callbackFn(value, id, this)) return id;
    }
    return undefined;
  }

  /**
   * Returns all elements in the record set whose ids match the provided
   * ids/ids in order of appearance in the given ids.
   * @param  {...any} ids A list of ids to exclude from the record set.
   * @returns {RecordSet} A new record set with all elements whose ids
   * match the provided id/ids.
   */
  only(...ids) {
    return ids.reduce((newRecordSet, id) => {
      if (this.has(id)) newRecordSet[$set](id, this.get(id));
      return newRecordSet;
    }, new RecordSet({ model: this.#model }));
  }

  /**
   * Returns all elements in the record set whose ids do not match the provided
   * id/ids.
   * @param  {...any} ids A list of ids to exclude from the record set.
   * @returns {RecordSet} A new record set with all elements whose ids do not
   * match the provided id/ids.
   */
  except(...ids) {
    const newRecordSet = new RecordSet({ model: this.#model });
    for (const [id, record] of this) {
      if (!ids.includes(id)) newRecordSet[$set](id, record);
    }
    return newRecordSet;
  }

  /**
   * Sorts the elements of the record set and returns a new sorted record set.
   * @param {Function} callbackFn Function that defined the sort order. The
   * callback is called with the following arguments:
   * - `firstValue`: The value of the first element for comparison.
   * - `secondValue`: The value of the second element for comparison.
   * - `firstId`: The id of the first element for comparison.
   * - `secondId`: The id of the second element for comparison.
   * @returns {RecordSet} A new record set with the elements of the original
   * record set sorted.
   */
  sort(comparatorFn) {
    const newRecordSet = new RecordSet({ model: this.#model });
    const sorted = [...this.entries()].sort(([id1, value1], [id2, value2]) =>
      comparatorFn(value1, value2, id1, id2)
    );
    for (const [id, record] of sorted) newRecordSet[$set](id, record);
    return newRecordSet;
  }

  /**
   * Tests whether all elements in the record set pass the test implemented
   * by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `id`: The id of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Boolean} `true` if all elements in the record set pass the test,
   * `false` otherwise.
   */
  every(callbackFn) {
    if (this.size === 0) return true;
    return [...this.entries()].every(([id, value]) =>
      callbackFn(value, id, this)
    );
  }

  /**
   * Tests whether some elements in the record set pass the test implemented
   * by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `id`: The id of the current element.
   * - `recordSet`: The record set itself.
   * @returns {Boolean} `true` if any elements in the record set pass the test,
   * `false` otherwise.
   */
  some(callbackFn) {
    if (this.size === 0) return false;
    return [...this.entries()].some(([id, value]) =>
      callbackFn(value, id, this)
    );
  }

  /**
   * Returns an array of objects with all elements mapped to the keys specified.
   * @param  {...any} keys A list of keys to map each record to.
   * @returns {Array} An array with all elements mapped to the keys specified.
   */
  select(...keys) {
    return [...this.values()].map(value =>
      keys.reduce((obj, key) => ({ ...obj, [key]: value[key] }), {})
    );
  }

  /**
   * Returns an array with records mapped to arrays containing only the
   * keys specified. If only one key is specified, the array contains the
   * value of each element instead.
   * @param  {...any} keys A list of keys to map each record to.
   * @returns {Array} An array of arrays with records mapped to the values
   * of the keys specified. If only one key is specified, the array contains
   * the value of each element instead.
   */
  pluck(...keys) {
    const isSingleKey = keys.length === 1;
    if (isSingleKey) {
      const key = keys[0];
      if (key === 'id') return [...this.ids()];
      return [...this.values()].map(value => value[key]);
    }
    return [...this.values()].map(value => keys.map(key => value[key]));
  }

  /**
   * Group the elements of the record set by the specified key.
   * @param {*} key A key to group the elements by.
   * @returns {Object} An object with the keys being the values of the
   * specified key and the values being record sets containing the elements
   * of the original record set that have the same value for the specified key.
   */
  groupBy(key) {
    const res = {};
    for (const [id, record] of this) {
      let keyValue = record[key];
      if (keyValue !== undefined && keyValue !== null && keyValue[$isRecord]) {
        keyValue = record[key].id;
      }
      if (!res[keyValue]) {
        res[keyValue] = new RecordSet({ model: this.#model });
      }
      res[keyValue][$set](id, record);
    }

    return res;
  }

  /**
   * Creates a new record set with all elements that pass the test implemented
   * by the provided function.
   * @param {Function} callbackFn Function that is called for every element of
   * the record set. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `id`: The id of the current element.
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
   * - `id`: The id of the current element.
   * - `recordSet`: The record set itself.
   * @returns {RecordSet} A new record set with all elements that fail the test.
   */
  whereNot(callbackFn) {
    return this.filter((value, id, map) => !callbackFn(value, id, map));
  }

  /**
   * Iterates over the record set in batches of the specified size.
   * @param {Number} batchSize The size of each batch.
   * @param {Object} options An object with options for the operation.
   * @param {Boolean} options.flat Whether to yield record set or array batches.
   * @returns {Iterator} An iterator that yields record set or array batches of
   * the specified size.
   */
  *batchIterator(batchSize, { flat = false } = {}) {
    if (flat) {
      let batch = [];
      for (const [id, record] of this) {
        batch.push(flat ? record : [id, record]);
        if (batch.length === batchSize) {
          yield batch;
          batch = [];
        }
      }
      if (batch.length) yield batch;
    } else {
      let newRecordSet = new RecordSet({ model: this.#model });
      for (const [id, record] of this) {
        newRecordSet[$set](id, record);
        if (newRecordSet.size === batchSize) {
          yield newRecordSet;
          newRecordSet = new RecordSet({ model: this.#model });
        }
      }
      if (newRecordSet.size) yield newRecordSet;
    }
  }

  /**
   * Returns a new record set with only the first n elements.
   * @param {Number} n The number of elements to keep.
   * @returns {RecordSet} A new record set with only the first n elements.
   */
  limit(n) {
    const newRecordSet = new RecordSet({ model: this.#model });
    for (const [id, record] of this) {
      newRecordSet[$set](id, record);
      if (newRecordSet.size === n) break;
    }
    return newRecordSet;
  }

  /**
   * Returns a new record set with the first n elements removed.
   * @param {Number} n The number of elements to remove.
   * @returns {RecordSet} A new record set with the first n elements removed.
   */
  offset(n) {
    const newRecordSet = new RecordSet({ model: this.#model });
    let counter = 0;
    for (const [id, record] of this) {
      if (counter < n) counter++;
      else newRecordSet[$set](id, record);
    }
    return newRecordSet;
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
    return [...this.entries()]
      .slice(start, end)
      .reduce((newRecordSet, [id, record]) => {
        newRecordSet[$set](id, record);
        return newRecordSet;
      }, new RecordSet({ model: this.#model }));
  }

  /**
   * Returns the first element in the record set.
   */
  get first() {
    for (const [, record] of this) return record;
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
   * Returns a new Iterator object that contains the ids for each element in the
   * record set.
   */
  get ids() {
    return this.keys;
  }

  /**
   * Returns an array of the records contained in the record set.
   * @param {Object} options An object with options for the operation.
   * @param {Boolean} options.flat Whether to convert the records to objects.
   * @returns {Array<Record>/Array{Object}} An array of the values contained in
   * the record set.
   */
  toArray({ flat = false } = {}) {
    const values = [...this.values()];

    if (flat) return values.map(value => value.toObject());
    return values;
  }

  /**
   * Returns an object representing the record set.
   * @param {Object} options An object with options for the operation.
   * @param {Boolean} options.flat Whether to convert the records to objects.
   * @returns {Object} An object representing the record set.
   */
  toObject({ flat = false } = {}) {
    if (flat)
      return [...this.entries()].reduce((obj, [id, value]) => {
        obj[id] = value.toObject();
        return obj;
      }, {});

    return [...this.entries()].reduce((obj, [id, value]) => {
      obj[id] = value;
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
    return this.#model.name;
  }

  /* istanbul ignore next */
  static get [Symbol.species]() {
    return Map;
  }

  // Protected (package internal-use only)

  [$set](id, value) {
    super.set(id, value);
    return this;
  }

  [$delete](id) {
    super.delete(id);
    return this;
  }

  [$addScope](name) {
    Object.defineProperty(this, name, {
      configurable: false, // Prevents deletion
      get: () => {
        return this.#scopedWhere(name);
      },
    });
  }

  [$clearRecordSetForTesting]() {
    super.clear();
  }

  // Private

  #copyScopesFromModel() {
    this.#model[$scopes].forEach((scope, name) => {
      if (this[name]) return;
      Object.defineProperty(this, name, {
        configurable: false, // Prevents deletion
        get: () => {
          return this.#scopedWhere(name);
        },
      });
    });
  }

  #scopedWhere(scopeName) {
    const [matcherFn, comparatorFn] = this.#model[$scopes].get(scopeName);
    const newRecordSet = new RecordSet({ model: this.#model });

    if (comparatorFn) {
      let matches = [];
      for (const [id, record] of this)
        if (matcherFn(record, id, this)) matches.push([id, record]);
      if (comparatorFn)
        matches.sort(([id1, value1], [id2, value2]) =>
          comparatorFn(value1, value2, id1, id2)
        );
      for (const [id, record] of matches) newRecordSet[$set](id, record);
    } else {
      for (const [id, record] of this)
        if (matcherFn(record, id, this)) newRecordSet[$set](id, record);
    }

    return newRecordSet;
  }
}

export default RecordSet;
