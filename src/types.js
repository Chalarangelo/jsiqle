const isBoolean = val => typeof val === 'boolean';

const isNumber = val => typeof val === 'number' && val === val;

const isString = val => typeof val === 'string';

const isDate = val => val instanceof Date;

const and =
  (...types) =>
  val =>
    types.every(type => type(val));

const or =
  (...types) =>
  val =>
    types.some(type => type(val));

const isArrayOf = type => val => Array.isArray(val) && val.every(type);

const isObject = shape => {
  const props = Object.keys(shape);
  return val => {
    if (val === null || val === undefined || typeof val !== 'object')
      return false;
    if (props.length === 0) return true;
    const valProps = Object.keys(val);
    if (valProps.length !== props.length) return false;
    return props.every(prop => shape[prop](val[prop]));
  };
};

const isObjectOf = type => val => {
  if (val === null || val === undefined || typeof val !== 'object')
    return false;
  return Object.keys(val).every(prop => type(val[prop]));
};

const isEnum =
  (...values) =>
  val =>
    values.includes(val);

const isNull = val => val === null;

const isUndefined = val => val === undefined;

const isOptional = type => val => or(isNull, type)(val);

export default {
  // Primitive types
  bool: isBoolean,
  number: isNumber,
  string: isString,
  date: isDate,
  // Special types
  enum: isEnum,
  // Composition types
  object: isObject,
  objectOf: isObjectOf,
  optional: isOptional,
  // Empty types
  null: isNull,
  undefined: isUndefined,
};

export const standardTypes = {
  boolean: { type: isBoolean },
  number: { type: isNumber },
  string: { type: isString },
  date: { type: isDate },
  booleanArray: { type: isArrayOf(isBoolean) },
  numberArray: { type: isArrayOf(isNumber) },
  stringArray: { type: isArrayOf(isString) },
  dateArray: { type: isArrayOf(isDate) },
};

// Internal types
const isNonEmptyString = val => val.trim().length !== 0;
export const recordId = and(isString, isNonEmptyString);
export const recordIdArray = isArrayOf(recordId);
