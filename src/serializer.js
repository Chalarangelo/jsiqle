import { DuplicationError } from 'src/errors';
import { validateName } from 'src/utils';

export class Serializer {
  #name;
  #attributes;
  #methods;

  constructor({ name, attributes = [], methods = {} }) {
    // TODO: V2 Enhancements
    // This check here is not necessary. We might be able to get rid of it.
    this.#name = validateName('Serializer', name);
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
      this.addMethod(methodName, methodBody);
    });
  }

  addMethod(methodName, methodBody) {
    const method = Serializer.#validateFunction(methodName, methodBody, [
      ...this.#methods.keys(),
    ]);
    this.#methods.set(methodName, method);
  }

  serialize(object) {
    // TODO: V2 Enhancements
    // Add a way to bind the serializer to a specific model. Then add a check
    // here that validates that the passed object is a record of said model.
    const serialized = {};
    this.#attributes.forEach((attributeValue, attributeName) => {
      const value = this.#methods.has(attributeValue)
        ? this.#methods.get(attributeValue)(object)
        : object[attributeValue];
      serialized[attributeName] = value;
    });
    return serialized;
  }

  get name() {
    return this.#name;
  }

  // Private

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
