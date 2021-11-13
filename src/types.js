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

const isPositive = val => val >= 0;

const isArrayOf = type => val => Array.isArray(val) && val.every(type);

const isOrIsArrayOf = type => val => or(isArrayOf(type), type)(val);

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

const isObjectOf = type => val =>
  Object.keys(val).every(prop => type(val[prop]));

const isEnum =
  (...values) =>
  val =>
    values.includes(val);

const isNull = val => val === null;

const isUndefined = val => val === undefined;

const isNil = or(isNull, isUndefined);

const isOptional = type => val => or(isNil, type)(val);

export default {
  // Primitive types
  bool: isBoolean,
  number: isNumber,
  positiveNumber: and(isNumber, isPositive),
  string: isString,
  date: isDate,
  // Special types
  stringOrNumber: or(isString, isNumber),
  numberOrString: or(isString, isNumber),
  enum: isEnum,
  boolArray: isArrayOf(isBoolean),
  numberArray: isArrayOf(isNumber),
  stringArray: isArrayOf(isString),
  dateArray: isArrayOf(isDate),
  // Composition types
  oneOf: or,
  arrayOf: isArrayOf,
  oneOrArrayOf: isOrIsArrayOf,
  object: isObject,
  objectOf: isObjectOf,
  optional: isOptional,
  // Empty types
  null: isNull,
  undefined: isUndefined,
  nil: isNil,
};

// Internal types
const isNonEmptyString = val => val.trim().length !== 0;
export const key = and(isString, isNonEmptyString);
