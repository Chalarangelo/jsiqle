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

const isObject = val => typeof val === 'object';

const isNull = val => val === null;

const hasUniqueValues = arr => new Set(arr).size === arr.length;

export const isUndefined = val => val === undefined;

export const isOptional = type => val => or(isNull, type)(val);

export const standardTypes = {
  boolean: { type: isBoolean },
  number: { type: isNumber },
  string: { type: isString },
  date: { type: isDate },
  booleanArray: { type: isArrayOf(isBoolean) },
  numberArray: { type: isArrayOf(isNumber) },
  stringArray: { type: isArrayOf(isString) },
  dateArray: { type: isArrayOf(isDate) },
  object: { type: isObject },
};

// Internal types
const isNonEmptyString = val => val.trim().length !== 0;
export const recordId = and(isString, isNonEmptyString);
export const recordIdArray = and(isArrayOf(recordId), hasUniqueValues);
