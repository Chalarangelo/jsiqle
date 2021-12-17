/**
 * Symbolizes any number of strings and return an object
 * @param  {...any} str Array of strings to symbolize
 * @returns {object} Object with symbolized strings
 */
const symbolizeAll = (...str) =>
  str.reduce((acc, curr) => {
    acc[`$${curr}`] = Symbol.for(curr);
    return acc;
  }, {});

export default symbolizeAll(
  'fields',
  'key',
  'keyType',
  'properties',
  'methods',
  'scopes',
  'relationships',
  'relationshipField',
  'validators',
  'recordModel',
  'recordValue',
  'wrappedRecordValue',
  'recordHandler',
  'recordTag',
  'defaultValue',
  'addScope',
  'addRelationshipAsField',
  'addRelationshipAsProperty',
  'getField',
  'getProperty',
  'removeScope',
  'copyScopes',
  'instances',
  'isRecord',
  'groupTag',
  'get',
  'handleExperimentalAPIMessage'
);
