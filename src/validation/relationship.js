import relationshipTypes from 'src/relationship/types';
import { Model } from 'src/model';

export const validateRelationshipType = relationshipType => {
  if (!relationshipTypes.includes(relationshipType))
    throw new Error(`Invalid relationship type: ${relationshipType}`);
  return relationshipType;
};

export const validateRelationshipModel = model => {
  if (!(model instanceof Model)) throw new Error(`Invalid model: ${model}`);
  return model;
};

export const validateRelationshipForeignKey = (foreignKey, model) => {
  if (!model.hasField(foreignKey))
    throw new Error(`Invalid foreign key: ${foreignKey}`);
  return foreignKey;
};
