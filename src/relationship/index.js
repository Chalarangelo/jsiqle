import relationshipTypes from './types';
import {
  validateName,
  validateRelationshipType,
  validateRelationshipModel,
  validateRelationshipForeignKey,
} from 'src/validation';
import symbols from 'src/symbols';

const { $foreignField } = symbols;

export class Relationship {
  #name;
  #relationType;
  #model;
  #foreignKey;

  constructor({ name, relationType, model, foreignKey } = {}) {
    this.#name = validateName('Relationship', name);
    this.#relationType = validateRelationshipType(relationType);
    this.#model = validateRelationshipModel(model);
    this.#foreignKey = validateRelationshipForeignKey(foreignKey, model);
  }

  get(record) {
    if (
      this.#relationType === relationshipTypes.oneToOne ||
      this.#relationType === relationshipTypes.manyToOne
    ) {
      return this.#model.records.get(record[this.#name]);
    } else if (
      this.#relationType === relationshipTypes.oneToMany ||
      this.#relationType === relationshipTypes.manyToMany
    ) {
      return this.#model.records.where(associatedRecord =>
        record[this.#name].includes(associatedRecord[this.#foreignKey])
      );
    }
  }

  get name() {
    return this.#name;
  }

  get relationType() {
    return this.#relationType;
  }

  get [$foreignField]() {
    return this.#model.getField(this.#foreignKey);
  }
}

export default Relationship;
