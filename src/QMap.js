/**
 * An extension of the native Map object. Provides the same API, along with
 * additional methods similar to the Array prototype.
 */
class QMap extends Map {
  /**
   * Creates a new map populated with the results of calling a provided function
   * on every element in the calling map.
   * @param {Function} callbackFn Function that is called for every element of
   * the map. The callback is called with the following arguments:
   * - `value`: The value of the current element.
   * - `key`: The key of the current element.
   * - `map`: The map itself.
   * @returns {QMap} A new map with each element being the result of the
   * callback function.
   */
  map(callbackFn) {
    return [...this.entries()].reduce((newMap, [key, value]) => {
      newMap.set(key, callbackFn(value, key, this));
      return newMap;
    }, new QMap());
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
   * @returns {QMap} A new map with all elements that pass the test.
   */
  filter(callbackFn) {
    return [...this.entries()].reduce((newMap, [key, value]) => {
      if (callbackFn(value, key, this)) newMap.set(key, value);
      return newMap;
    }, new QMap());
  }

  get first() {
    return [...this.entries()].shift()[1];
  }

  get firstKey() {
    return [...this.entries()].shift()[0];
  }

  get last() {
    return [...this.entries()].pop()[1];
  }

  get lastKey() {
    return [...this.entries()].pop()[0];
  }

  /* istanbul ignore next */
  get [Symbol.toStringTag]() {
    return 'Map';
  }

  /* istanbul ignore next */
  static get [Symbol.species]() {
    return Map;
  }
}

export default QMap;
