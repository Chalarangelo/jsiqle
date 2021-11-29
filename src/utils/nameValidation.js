import { NameError } from 'src/errors';

const restrictedNames = {
  Schema: [],
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
const isValidName = (name, restrictedNames) => {
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
