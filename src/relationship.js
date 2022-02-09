import { Field } from 'src/field';
import { Schema } from 'src/schema';
import { DefaultValueError, DuplicationError } from 'src/errors';
import { Model } from 'src/model';
import { validateName, reverseCapitalize } from 'src/utils';
import types from 'src/types';
import symbols from 'src/symbols';

const {
  $key,
  $recordValue,
  $fields,
  $getField,
  $getProperty,
  $get,
  $defaultValue,
  $instances,
  $handleExperimentalAPIMessage,
} = symbols;

const relationshipEnum = {
  oneToOne: 'oneToOne',
  oneToMany: 'oneToMany',
  manyToOne: 'manyToOne',
  manyToMany: 'manyToMany',
};

export class Relationship {
  #type;
  #from;
  #to;
  #name; // relationship field name in the from table
  #reverseName; // relationship field name in the to table
  #relationshipField; // relationship field in the from model
  #relationshipProperty; // relationship property in the to model

  // TODO: V2 enhancements
  // After the API for relationships is stable-ish, figure out a way to add
  // cascade.
  constructor({ from, to, type } = {}) {
    Schema[$handleExperimentalAPIMessage](
      'Relationships are experimental in the current version. There is neither validation of existence in foreign tables nor guarantee that associations work. Please use with caution.'
    );
    this.#type = Relationship.#validateType(type);
    const [fromModel, fromName, toModel, toName] =
      Relationship.#parseModelsAndNames(from, to, type);
    this.#from = fromModel;
    this.#to = toModel;
    this.#name = fromName;
    this.#reverseName = toName;

    if (
      this.#to === this.#from &&
      Relationship.#isSymmetric(this.#type) &&
      this.#name === this.#reverseName
    )
      throw new RangeError(
        'Relationship cannot be symmetric if the from and to models are the same and no name is provided for either one.'
      );

    this.#relationshipField = Relationship.#createField(
      this.#name,
      this.#type,
      this.#to[$key]
    );

    this.#relationshipProperty = record => {
      return this.#getAssociatedRecordsReverse(record);
    };
  }

  // Protected (package internal-use only)

  [$getField]() {
    return {
      name: this.#name,
      type: this.#type,
      fieldName: this.#name,
      field: this.#relationshipField,
    };
  }

  [$getProperty]() {
    return {
      name: this.#name,
      type: this.#type,
      propertyName: this.#reverseName,
      property: this.#relationshipProperty,
    };
  }

  [$get](modelName, property, record) {
    // When from model is specified, apply the relationship as-is
    if (modelName === this.#from.name && property === this.#name) {
      return this.#getAssociatedRecords(record);
    }
    // When to model is specified, reverse the relationship before applying it
    /* istanbul ignore next */
    if (modelName === this.#to.name && property === this.#reverseName) {
      console.warn(
        'Relationship getter called by the receiver model. This might indicate an issue with the library and should be reported.'
      );
      return this.#getAssociatedRecordsReverse(record);
    }
  }

  // Private

  #getAssociatedRecords(record) {
    // Use a regular get for toOne relationships for performance
    if (Relationship.#isToOne(this.#type)) {
      const associationValue = record[this.#name];
      return this.#to.records.get(associationValue);
    }
    // Use a where query for toMany relationships, safeguard against empty value
    const associationValues = record[this.#name] || [];
    return this.#to.records.only(...associationValues);
  }

  #getAssociatedRecordsReverse(record) {
    const associationValue = record[this.#to[$key].name];
    const matcher = Relationship.#isToOne(this.#type)
      ? associatedRecord =>
          associatedRecord[$recordValue][this.#name] === associationValue
      : associatedRecord => {
          const associatedRecordValue =
            associatedRecord[$recordValue][this.#name];
          if ([undefined, null].includes(associatedRecordValue)) return false;
          return associatedRecord[$recordValue][this.#name].includes(
            associationValue
          );
        };
    // Use a regular get for fromOne relationships for performance
    if (Relationship.#isFromOne(this.#type)) {
      return this.#from.records.find(matcher);
    }
    // Use a where query for fromMany relationships, safeguard against empty value
    return this.#from.records.where(matcher);
  }

  static #isToOne(type) {
    return [relationshipEnum.oneToOne, relationshipEnum.manyToOne].includes(
      type
    );
  }
  static #isToMany(type) {
    return [relationshipEnum.oneToMany, relationshipEnum.manyToMany].includes(
      type
    );
  }
  static #isFromOne(type) {
    return [relationshipEnum.oneToMany, relationshipEnum.oneToOne].includes(
      type
    );
  }
  static #isFromMany(type) {
    return [relationshipEnum.manyToOne, relationshipEnum.manyToMany].includes(
      type
    );
  }
  static #isSymmetric(type) {
    return [relationshipEnum.oneToOne, relationshipEnum.manyToMany].includes(
      type
    );
  }

  static #createField(name, relationshipType, foreignField) {
    // TODO: V2 enhancements
    // Potentially add a check if the other model contains the key(s)?
    const isSingleSource = Relationship.#isFromOne(relationshipType);
    const isMultiple = Relationship.#isToMany(relationshipType);
    const type = isMultiple
      ? types.arrayOf(value => foreignField.typeCheck(value))
      : value => foreignField.typeCheck(value);
    // TODO: V2 enhancements
    // Add a custom validator for symmetric relationships to ensure that a
    // record does not reference itself in the relationship, creating a loop.
    const validators = {};
    // oneToOne means that for each record in the to model, there is at most
    // one record in the from model. No overlap.
    if (isSingleSource && !isMultiple) validators.unique = true;
    // toMany relationships are not allowed to have duplicate values.
    if (isMultiple) validators.uniqueValues = true;

    const relationshipField = new Field({
      name,
      type,
      defaultValue: isMultiple ? [] : null,
      validators,
    });
    // Override the default value to throw an error
    Object.defineProperty(relationshipField, $defaultValue, {
      get() {
        throw new DefaultValueError(
          'Relationship field does not have a default value.'
        );
      },
    });

    return relationshipField;
  }

  static #validateType(relationshipType) {
    if (!Object.values(relationshipEnum).includes(relationshipType))
      throw new TypeError(`Invalid relationship type: ${relationshipType}.`);
    return relationshipType;
  }

  static #validateModel(modelData) {
    const modelName =
      typeof modelData === 'string' ? modelData : modelData.model;
    if (!Model[$instances].has(modelName))
      throw new ReferenceError(`Model ${modelName} does not exist.`);

    return Model[$instances].get(modelName);
  }

  static #createName(type, to) {
    if (Relationship.#isToOne(type)) return reverseCapitalize(to);
    if (Relationship.#isToMany(type)) return `${reverseCapitalize(to)}Set`;
  }

  static #createReverseName = (type, from) => {
    if (Relationship.#isFromOne(type)) return reverseCapitalize(from);
    if (Relationship.#isFromMany(type)) return `${reverseCapitalize(from)}Set`;
  };

  static #validateModelParams(modelData) {
    const model = Relationship.#validateModel(modelData);
    const name =
      typeof modelData === 'string'
        ? null
        : validateName('Field', modelData.name);
    if (name !== null && model[$fields].has(name))
      throw new DuplicationError(
        `Field ${name} already exists in ${model.name}.`
      );
    return [model, name];
  }

  static #parseModelsAndNames(from, to, type) {
    let fromModel, fromName, toModel, toName;
    [fromModel, fromName] = Relationship.#validateModelParams(from);
    [toModel, toName] = Relationship.#validateModelParams(to);
    if (fromName === null)
      fromName = Relationship.#createName(type, toModel.name);
    if (toName === null)
      toName = Relationship.#createReverseName(type, fromModel.name);
    return [fromModel, fromName, toModel, toName];
  }
}
