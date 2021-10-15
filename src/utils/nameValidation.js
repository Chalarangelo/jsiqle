/**
 * Validates the name of a field.
 * Restrictiorns:
 * - Must be a string
 * - Must be at least 1 character long
 * - Must not start with a number
 * - Must contain only alphanumeric characters, numbers or underscores
 * @param {string} name The name of the field to validate.
 * @returns {boolean} Whether the name is valid.
 */
const isValidName = name => {
  if (typeof name !== 'string') return [false, 'must be a string'];
  if (!name) return [false, 'is required'];
  if (/^\d/.test(name)) return [false, 'cannot start with a number'];
  return [
    /^\w+$/.test(name),
    'must contain only alphanumeric characters, numbers or underscores',
  ];
};

export default isValidName;
