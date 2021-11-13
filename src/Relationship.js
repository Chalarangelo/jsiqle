import Field from 'src/Field';
import Model from 'src/Model';
import validateName from 'src/validation/nameValidation';
import { symbolize } from 'src/utils/symbols';
import { ValidationError } from 'src/Error';
import validators from 'src/utils/typeValidation';

const $foreignField = symbolize('foreignField');
const $defaultValue = symbolize('defaultValue');

const relationTypes = {
  oneToOne: 'oneToOne',
  oneToMany: 'oneToMany',
  manyToOne: 'manyToOne',
  manyToMany: 'manyToMany',
};

const validateRetionshipType = relationshipType => {
  if (!Object.values(relationTypes).includes(relationshipType))
    throw new Error(`Invalid relationship type: ${relationshipType}`);
  return relationshipType;
};

const validateModel = model => {
  if (!(model instanceof Model)) throw new Error(`Invalid model: ${model}`);
  return model;
};

const validateForeignKey = (foreignKey, model) => {
  if (!model.hasField(foreignKey))
    throw new Error(`Invalid foreign key: ${foreignKey}`);
  return foreignKey;
};

class Relationship {
  #name;
  #relationType;
  #model;
  #foreignKey;

  constructor({ name, relationType, model, foreignKey } = {}) {
    this.#name = validateName('Relationship', name);
    this.#relationType = validateRetionshipType(relationType);
    this.#model = validateModel(model);
    this.#foreignKey = validateForeignKey(foreignKey, model);
  }

  get(record) {
    if (
      this.#relationType === 'oneToOne' ||
      this.#relationType === 'manyToOne'
    ) {
      return this.#model.get(record[this.#name]);
    } else if (
      this.#relationType === 'oneToMany' ||
      this.#relationType === 'manyToMany'
    ) {
      return this.#model.where(associatedRecord =>
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

export class RelationshipField extends Field {
  constructor(relationship) {
    const { name, relationType } = relationship;
    const isMultiple =
      relationType === 'oneToMany' || relationType === 'manyToMany';
    const foreignField = relationship[$foreignField];
    const type = isMultiple
      ? validators.arrayOf(value => foreignField.validate(value))
      : value => foreignField.validate(value);

    super({
      name,
      type,
      required: false,
      defaultValue: null,
    });
  }

  get [$defaultValue]() {
    throw new ValidationError(
      'Relationship field does not have a default value.'
    );
  }
}

export default Relationship;
