import { Field } from 'src/field';
import { DefaultValueError } from 'src/errors';
import { Model } from 'src/model';
import { validateName } from 'src/utils';
import types from 'src/types';
import symbols from 'src/symbols';

const {
  $key,
  $recordValue,
  $getField,
  $getMethod,
  $get,
  $defaultValue,
  $instances,
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
  #relationshipMethod; // relationship method in the to model

  // TODO: cascade
  constructor({ from, to, type } = {}) {
    console.warn(
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

    this.#relationshipMethod = record => {
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

  [$getMethod]() {
    return {
      name: this.#name,
      type: this.#type,
      methodName: this.#reverseName,
      method: this.#relationshipMethod,
    };
  }

  [$get](modelName, property, record) {
    // When from model is specified, apply the relationship as-is
    if (modelName === this.#from.name && property === this.#name) {
      return this.#getAssociatedRecords(record);
    }
    // When to model is specified, reverse the relationship before applying it
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
    const associatedRecordsKeyName = this.#to[$key].name;
    return this.#to.records.where(associatedRecord => {
      return associationValues.includes(
        associatedRecord[associatedRecordsKeyName]
      );
    });
  }

  #getAssociatedRecordsReverse(record) {
    const associationValue = record[this.#to[$key].name];
    const matcher = Relationship.#isToOne(this.#type)
      ? associatedRecord => associatedRecord === associationValue
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
    // TODO: Potentially add a check if the other model contains the key(s)?
    const isSingleSource = Relationship.#isFromOne(relationshipType);
    const isMultiple = Relationship.#isToMany(relationshipType);
    const type = isMultiple
      ? types.arrayOf(value => foreignField.typeCheck(value))
      : value => foreignField.typeCheck(value);
    const validators = {};
    // oneToOne means that for each record in the to model, there is at most
    // one record in the from model. No overlap.
    if (isSingleSource && !isMultiple) validators.unique = true;
    // toMany relationships are not allowed to have duplicate values.
    if (isMultiple) validators.uniqueValues = true;

    const relationshipField = new Field({
      name,
      type,
      required: false,
      defaultValue: null,
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
    if (Relationship.#isToOne(type)) return to.toLowerCase();
    if (Relationship.#isToMany(type)) return `${to.toLowerCase()}Set`;
  }

  static #createReverseName = (type, from) => {
    if (Relationship.#isFromOne(type)) return from.toLowerCase();
    if (Relationship.#isFromMany(type)) return `${from.toLowerCase()}Set`;
  };

  static #validateModelParams(modelData) {
    const model = Relationship.#validateModel(modelData);
    const name =
      typeof modelData === 'string'
        ? null
        : validateName('Field', modelData.name);
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

export default Relationship;
