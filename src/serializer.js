import { DuplicationError } from 'src/errors';

export class Serializer {
  #name;
  #attributes;
  #methods;

  constructor({ name, attributes = [], methods = {} }) {
    this.#name = name;
    this.#attributes = new Map();
    this.#methods = new Map();

    attributes.forEach(attribute => {
      const [attributeValue, attributeName] =
        typeof attribute === 'string' ? [attribute, attribute] : attribute;
      this.#attributes.set(
        Serializer.#validateAttribute(attributeName, [
          ...this.#attributes.keys(),
        ]),
        attributeValue
      );
    });
    Object.entries(methods).forEach(([methodName, methodBody]) => {
      this.#addMethod(methodName, methodBody);
    });
  }

  serialize(object, options) {
    const serialized = {};
    this.#attributes.forEach((attributeValue, attributeName) => {
      const value = this.#methods.has(attributeValue)
        ? this.#methods.get(attributeValue)(object, options)
        : object[attributeValue];
      if (value !== undefined) serialized[attributeName] = value;
    });
    return serialized;
  }

  // ΝΟΤE: This also handles RecordSets (not by design).
  // The result is an object with each key mapped to a serialized object.
  serializeArray(objects, options) {
    return objects.map(object => this.serialize(object, options));
  }

  serializeRecordSet(objects, options, keyMapFn) {
    const serialized = {};
    objects.forEach((value, key) => {
      const mappedKey = keyMapFn(key, value);
      if (mappedKey === undefined) return;
      serialized[mappedKey] = this.serialize(value, options);
    });
    return serialized;
  }

  get name() {
    return this.#name;
  }

  // Private

  #addMethod(methodName, methodBody) {
    const method = Serializer.#validateFunction(methodName, methodBody, [
      ...this.#methods.keys(),
    ]);
    this.#methods.set(methodName, method);
  }

  static #validateAttribute(attributeName, restrictedNames) {
    if (typeof attributeName !== 'string')
      throw new TypeError(`Attribute ${attributeName} is not a string.`);

    if (restrictedNames.includes(attributeName))
      throw new DuplicationError(`Attribute ${attributeName} already exists.`);

    return attributeName;
  }

  static #validateFunction(callbackName, callback, restrictedNames) {
    if (typeof callback !== 'function')
      throw new TypeError(`Method ${callbackName} is not a function.`);

    if (restrictedNames.includes(callbackName))
      throw new DuplicationError(`Method ${callbackName} already exists.`);

    return callback;
  }
}
