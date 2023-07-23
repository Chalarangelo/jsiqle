import { DuplicationError, NameError } from 'src/errors';

// Name validation
// TODO: 'records' can be a bit of a loose gun here.
const restrictedNames = ['toString', 'toObject', 'toJSON', 'id'];

/**
 * Validates the name of a field or model.
 * Restrictiorns:
 * - Must be a string
 * - Must be at least 1 character long
 * - Must not start with a number
 * - Must contain only alphanumeric characters, numbers or underscores
 * @param {string} name The name of the field or model to validate.
 * @returns {boolean} Whether the name is valid.
 */
const isValidName = name => {
  if (typeof name !== 'string') return [false, 'must be a string'];
  if (!name) return [false, 'cannot be empty'];
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
 * @param {string} name The name of the field or model to validate.
 * @throws {NameError} If the name is invalid.
 * @returns {boolean} Whether the name is valid.
 */
export const validateName = name => {
  const [isValid, message] = isValidName(name);
  if (!isValid) throw new NameError(`Name "${name}" is invalid - ${message}.`);
  return name;
};

// General-purpose utilities

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

export const isObject = obj => obj && typeof obj === 'object';

export const validateObjectWithUniqueName = (
  { objectType, parentType, parentName },
  obj,
  collection
) => {
  if (!isObject(obj))
    throw new TypeError(`${objectType} ${obj} is not an object.`);
  if (collection.includes(obj.name)) {
    const namedType = parentName ? `${parentType} ${parentName}` : parentType;
    throw new DuplicationError(
      `${namedType} already has a ${objectType.toLowerCase()} named ${
        obj.name
      }.`
    );
  }
  return true;
};
