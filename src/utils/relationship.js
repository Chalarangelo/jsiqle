import { Field } from 'src/field';
import { DefaultValueError } from 'src/errors';
import types from 'src/types';
import symbols from 'src/symbols';
import { Model } from 'src/model';
import { validateName } from './nameValidation';

const { $defaultValue, $instances } = symbols;

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
export const isFromOne = type =>
  [relationshipEnum.oneToMany, relationshipEnum.oneToOne].includes(type);
export const isFromMany = type =>
  [relationshipEnum.manyToOne, relationshipEnum.manyToMany].includes(type);
export const isSymmetric = type =>
  [relationshipEnum.oneToOne, relationshipEnum.manyToMany].includes(type);

export const createRelationshipField = (
  name,
  relationshipType,
  foreignField
) => {
  // TODO: Potentially add a check if the other model contains the key(s)?
  const isSingleSource = isFromOne(relationshipType);
  const isMultiple = isToMany(relationshipType);
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
};

export const validateRelationshipType = relationshipType => {
  if (!Object.values(relationshipEnum).includes(relationshipType))
    throw new TypeError(`Invalid relationship type: ${relationshipType}.`);
  return relationshipType;
};

export const validateRelationshipModel = modelData => {
  const modelName = typeof modelData === 'string' ? modelData : modelData.model;
  if (!Model[$instances].has(modelName))
    throw new ReferenceError(`Model ${modelName} does not exist.`);

  return Model[$instances].get(modelName);
};

export const createRelationshipName = (type, to) => {
  if (isToOne(type)) return to.toLowerCase();
  if (isToMany(type)) return `${to.toLowerCase()}Set`;
};

export const createReverseRelationshipName = (type, from) => {
  if (isFromOne(type)) return from.toLowerCase();
  if (isFromMany(type)) return `${from.toLowerCase()}Set`;
};

export const validateModelParams = modelData => {
  const model = validateRelationshipModel(modelData);
  const name =
    typeof modelData === 'string'
      ? null
      : validateName('Field', modelData.name);
  return [model, name];
};

export const parseModelsAndNames = (from, to, type) => {
  let fromModel, fromName, toModel, toName;
  [fromModel, fromName] = validateModelParams(from);
  [toModel, toName] = validateModelParams(to);
  if (fromName === null) fromName = createRelationshipName(type, toModel.name);
  if (toName === null)
    toName = createReverseRelationshipName(type, fromModel.name);
  return [fromModel, fromName, toModel, toName];
};
