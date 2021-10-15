// Primitive types
const isBoolean = val => typeof val === 'boolean';
const isNumber = val => typeof val === 'number' && val === val;
const isString = val => typeof val === 'string';
const isDate = val => val instanceof Date;

// Composers
const and =
  (...validators) =>
  val =>
    validators.every(validator => validator(val));
const or =
  (...validators) =>
  val =>
    validators.some(validator => validator(val));

// Additional types for number
const isPositive = val => val >= 0;
const isPositiveNumber = val => and(isNumber, isPositive)(val);

// Array type
const isArrayOf = validator => val =>
  Array.isArray(val) && val.every(validator);

// Object with specific keys
const isObject = shape => {
  const props = Object.keys(shape);
  return val => {
    if (val === null || val === undefined || typeof val !== 'object')
      return false;
    const valProps = Object.keys(val);
    if (valProps.length !== props.length) return false;
    return props.every(prop => shape[prop](val[prop]));
  };
};

// Object with specific type of keys
const isObjectOf = validator => val =>
  Object.keys(val).every(prop => validator(val[prop]));

// Enumeration
const isEnum =
  (...values) =>
  val =>
    values.includes(val);

// Empty types
const isNull = val => val === null;
const isUndefined = val => val === undefined;
const isNil = or(isNull, isUndefined);

// Optional types
const isOptional = validator => val => or(isNil, validator)(val);

export default {
  bool: isBoolean,
  number: isNumber,
  positiveNumber: isPositiveNumber,
  string: isString,
  date: isDate,
  oneOf: or,
  arrayOf: isArrayOf,
  object: isObject,
  objectOf: isObjectOf,
  enum: isEnum,
  null: isNull,
  undefined: isUndefined,
  nil: isNil,
  optional: isOptional,
};
