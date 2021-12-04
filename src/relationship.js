import {
  validateRelationshipType,
  createRelationshipField,
  parseModelsAndNames,
  isToOne,
  isFromOne,
  isSymmetric,
} from 'src/utils';
import symbols from 'src/symbols';

const { $key, $recordValue } = symbols;

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
    this.#type = validateRelationshipType(type);
    const [fromModel, fromName, toModel, toName] = parseModelsAndNames(
      from,
      to,
      type
    );
    this.#from = fromModel;
    this.#to = toModel;
    this.#name = fromName;
    this.#reverseName = toName;

    if (
      this.#to === this.#from &&
      isSymmetric(this.#type) &&
      this.#name === this.#reverseName
    )
      throw new RangeError(
        'Relationship cannot be symmetric if the from and to models are the same and no name is provided for either one.'
      );

    this.#relationshipField = createRelationshipField(
      this.#name,
      this.#type,
      this.#to[$key]
    );

    this.#relationshipMethod = record => {
      return this.#getAssociatedRecordsReverse(record);
    };
  }

  // Protected (package internal-use only)

  getField() {
    return {
      name: this.#name,
      type: this.#type,
      fieldName: this.#name,
      field: this.#relationshipField,
    };
  }

  getMethod() {
    return {
      name: this.#name,
      type: this.#type,
      methodName: this.#reverseName,
      method: this.#relationshipMethod,
    };
  }

  get(modelName, property, record) {
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
    if (isToOne(this.#type)) {
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
    const matcher = isToOne(this.#type)
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
    if (isFromOne(this.#type)) {
      return this.#from.records.find(matcher);
    }
    // Use a where query for fromMany relationships, safeguard against empty value
    return this.#from.records.where(matcher);
  }
}

export default Relationship;
