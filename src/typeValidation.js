// Primitive types
const isBoolean = val => typeof val === 'boolean';
const isNumber = val => typeof val === 'number' && val === val;
const isString = val => typeof val === 'string';
const isDate = val => val instanceof Date;

// Complex types
const isOneOf =
  (...validators) =>
  val =>
    validators.some(validator => validator(val));

const isArrayOf = validator => val =>
  Array.isArray(val) && val.every(validator);

// TODO: Add a validation that there are no extra keys or missing keys
const isObject = shape => {
  const props = Object.keys(shape);
  return val =>
    val !== null &&
    typeof val === 'object' &&
    props.every(prop => shape[prop](val[prop]));
};

const isObjectOf = validator => val =>
  Object.keys(val).every(prop => validator(val[prop]));

const isEnum =
  (...values) =>
  val =>
    values.includes(val);

const isNull = val => val === null;
const isUndefined = val => val === undefined;
const isNil = isOneOf(isNull, isUndefined);

export default {
  bool: isBoolean,
  number: isNumber,
  string: isString,
  date: isDate,
  oneOf: isOneOf,
  arrayOf: isArrayOf,
  object: isObject,
  objectOf: isObjectOf,
  enum: isEnum,
  null: isNull,
  undefined: isUndefined,
  nil: isNil,
};
