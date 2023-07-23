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
  'properties',
  'cachedProperties',
  'methods',
  'scopes',
  'relationships',
  'relationshipField',
  'recordModel',
  'recordValue',
  'wrappedRecordValue',
  'recordHandler',
  'recordTag',
  'addScope',
  'addRelationshipAsField',
  'addRelationshipAsProperty',
  'getField',
  'getProperty',
  'instances',
  'isRecord',
  'groupTag',
  'set',
  'delete',
  'get',
  'handleExperimentalAPIMessage',
  'clearSchemaForTesting',
  'clearCachedProperties',
  'clearRecordSetForTesting',
  'schemaObject'
);
