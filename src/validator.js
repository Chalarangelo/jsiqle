export class Validator {
  static unique(field) {
    return (value, data) =>
      data.filter(item => item[field] === value[field]).length === 0;
  }

  static length(field, min, max) {
    return value => value[field].length >= min && value[field].length <= max;
  }

  static minLength(field, min) {
    return value => value[field].length >= min;
  }

  static maxLength(field, max) {
    return value => value[field].length <= max;
  }

  static range(field, min, max) {
    return value => value[field] >= min && value[field] <= max;
  }

  static minNumber(field, min) {
    return value => value[field] >= min;
  }

  static maxNumber(field, max) {
    return value => value[field] <= max;
  }

  static integer(field) {
    return value => Number.isInteger(value[field]);
  }

  static date(field, min, max) {
    return value => value[field] >= min && value[field] <= max;
  }

  static minDate(field, min) {
    return value => value[field] >= min;
  }

  static maxDate(field, max) {
    return value => value[field] <= max;
  }

  static regex(field, regex) {
    return value => regex.test(value[field]);
  }

  static custom(field, fn) {
    return (value, data) =>
      fn(
        value[field],
        data.map(item => item[field])
      );
  }
}
