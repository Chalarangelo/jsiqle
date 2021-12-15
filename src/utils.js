import { DuplicationError, NameError } from 'src/errors';

// Name validation

const restrictedNames = {
  Model: ['toString', 'toObject', 'toJSON'],
  Field: ['toString', 'toObject', 'toJSON'],
  Relationship: ['toString', 'toObject', 'toJSON'],
};

/**
 * Validates the name of a field or model.
 * Restrictiorns:
 * - Must be a string
 * - Must be at least 1 character long
 * - Must not start with a number
 * - Must contain only alphanumeric characters, numbers or underscores
 * @param {string} name The name of the field or model to validate.
 * @param {Array<string>} restrictedNames An array of restricted names.
 * @returns {boolean} Whether the name is valid.
 */
const isValidName = (name, restrictedNames = []) => {
  if (typeof name !== 'string') return [false, 'must be a string'];
  if (!name) return [false, 'is required'];
  if (/^\d/.test(name)) return [false, 'cannot start with a number'];
  if (restrictedNames.includes(name)) return [false, 'is reserved'];
  return [
    /^\w+$/.test(name),
    'must contain only alphanumeric characters, numbers or underscores',
  ];
};

/**
 * Validates the name of a field or model.
 * Restrictiorns:
 * - Must be a string
 * - Must be at least 1 character long
 * - Must not start with a number
 * - Must contain only alphanumeric characters, numbers or underscores
 * @param {string} objectType The type of object to validate.
 * @param {string} name The name of the field or model to validate.
 * @throws {NameError} If the name is invalid.
 * @returns {boolean} Whether the name is valid.
 */
export const validateName = (objectType, name) => {
  const [isValid, message] = isValidName(name, restrictedNames[objectType]);
  if (!isValid) throw new NameError(`${objectType} name ${message}.`);
  return name;
};

// General-purpose utilities

export const capitalize = ([first, ...rest]) =>
  first.toUpperCase() + rest.join('');

export const reverseCapitalize = ([first, ...rest]) =>
  first.toLowerCase() + rest.join('');

export const deepClone = obj => {
  if (obj === null) return null;
  if (obj instanceof Date) return new Date(obj);
  let clone = Object.assign({}, obj);
  Object.entries(clone).forEach(
    ([key, value]) =>
      (clone[key] = typeof obj[key] === 'object' ? deepClone(value) : value)
  );
  if (Array.isArray(obj)) {
    clone.length = obj.length;
    return Array.from(clone);
  }
  return clone;
};

export const allEqualBy = (arr, fn) => {
  const eql = fn(arr[0]);
  return arr.every(val => fn(val) === eql);
};

export const isObject = obj => obj && typeof obj === 'object';

export const contains = (collection, item) => collection.includes(item);

export const validateObjectWithUniqueName = (
  { objectType, parentType, parentName },
  obj,
  collection
) => {
  if (!isObject(obj))
    throw new TypeError(`${objectType} ${obj} is not an object.`);
  if (contains(collection, obj.name))
    throw new DuplicationError(
      `${parentType} ${parentName} already has a ${objectType.toLowerCase()} named ${
        obj.name
      }.`
    );
  return true;
};
