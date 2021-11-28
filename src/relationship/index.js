import { toMany, toOne } from './types';
import {
  validateName,
  validateRelationshipType,
  validateRelationshipModel,
  validateRelationshipForeignKey,
  createRelationshipField,
} from 'src/utils';
import symbols from 'src/symbols';

const { $relationshipField } = symbols;

export class Relationship {
  #name;
  #type;
  #model;
  #foreignKey;
  #relationshipField;

  constructor({ name, type, model, foreignKey } = {}) {
    this.#name = validateName('Relationship', name);
    this.#type = validateRelationshipType(type);
    this.#model = validateRelationshipModel(model);
    this.#foreignKey = validateRelationshipForeignKey(foreignKey, model);
    this.#relationshipField = createRelationshipField(
      this.#name,
      this.#type,
      this.#model.getField(this.#foreignKey)
    );
  }

  get(record) {
    if (toOne.includes(this.#type)) {
      return this.#model.records.get(record[this.#name]);
    } else if (toMany.includes(this.#type)) {
      return this.#model.records.where(associatedRecord =>
        record[this.#name].includes(associatedRecord[this.#foreignKey])
      );
    }
  }

  get name() {
    return this.#name;
  }

  get type() {
    return this.#type;
  }

  get [$relationshipField]() {
    return this.#relationshipField;
  }
}

export default Relationship;
