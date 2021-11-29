import { Field } from 'src/field';
import { DefaultValueError } from 'src/errors';
import types from 'src/types';
import symbols from 'src/symbols';
import { Model } from 'src/model';

const { $defaultValue } = symbols;

const relationshipEnum = {
  oneToOne: 'oneToOne',
  oneToMany: 'oneToMany',
  manyToOne: 'manyToOne',
  manyToMany: 'manyToMany',
};

export const isToOne = type =>
  [relationshipEnum.oneToOne, relationshipEnum.manyToOne].includes(type);
export const isToMany = type =>
  [relationshipEnum.oneToMany, relationshipEnum.manyToMany].includes(type);

export const createRelationshipField = (
  name,
  relationshipType,
  foreignField
) => {
  const isMultiple = isToMany(relationshipType);
  const type = isMultiple
    ? types.arrayOf(value => foreignField.typeCheck(value))
    : value => foreignField.typeCheck(value);

  const relationshipField = new Field({
    name,
    type,
    required: false,
    defaultValue: null,
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
};

export const validateRelationshipType = relationshipType => {
  if (!Object.values(relationshipEnum).includes(relationshipType))
    throw new TypeError(`Invalid relationship type: ${relationshipType}.`);
  return relationshipType;
};

export const validateRelationshipModel = model => {
  if (!(model instanceof Model)) throw new TypeError(`Invalid model: ${model}`);
  return model;
};

export const validateRelationshipForeignKey = (foreignKey, model) => {
  if (!model.hasField(foreignKey))
    throw new TypeError(`Invalid foreign key: ${foreignKey}`);
  return foreignKey;
};
