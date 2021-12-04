export class Validator {
  static unique(field) {
    return (value, data) => data.every(item => item[field] !== value[field]);
  }

  static length(field, [min, max]) {
    return value => value[field].length >= min && value[field].length <= max;
  }

  static minLength(field, min) {
    return value => value[field].length >= min;
  }

  static maxLength(field, max) {
    return value => value[field].length <= max;
  }

  static range(field, [min, max]) {
    return value => value[field] >= min && value[field] <= max;
  }

  static min(field, min) {
    return value => value[field] >= min;
  }

  static max(field, max) {
    return value => value[field] <= max;
  }

  static integer(field) {
    return value => Number.isInteger(value[field]);
  }

  static regex(field, regex) {
    return value => regex.test(value[field]);
  }

  static uniqueValues(field) {
    return value => new Set(value[field]).size === value[field].length;
  }

  static sortedAscending(field) {
    return value =>
      value[field].every(
        (item, index) => index === 0 || item >= value[field][index - 1]
      );
  }

  static sortedDescending(field) {
    return value =>
      value[field].every(
        (item, index) => index === 0 || item <= value[field][index - 1]
      );
  }

  static custom(field, fn) {
    return (value, data) =>
      fn(
        value[field],
        data.map(item => item[field])
      );
  }
}
