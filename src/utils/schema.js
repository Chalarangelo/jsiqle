import { Model } from 'src/model';
import { validateObjectWithUniqueName } from './common';
import { Relationship } from 'src/relationship';

// TODO: Absorb utils as static private methods in classes!

export const parseModel = (schemaName, modelData, models) => {
  validateObjectWithUniqueName(
    {
      objectType: 'Model',
      parentType: 'Schema',
      parentName: schemaName,
    },
    modelData,
    [...models.keys()]
  );
  return new Model(modelData);
};

export const parseRelationship = (schemName, relationshipData, models) => {
  const { from, to, type /* , cascade */ } = relationshipData;
  [from, to].forEach(model => {
    if (!['string', 'object'].includes(typeof model))
      throw new TypeError(`Invalid relationship model: ${model}.`);
  });

  const fromModelName = typeof from === 'string' ? from : from.model;
  const toModelName = typeof to === 'string' ? to : to.model;

  const fromModel = models.get(fromModelName);
  const toModel = models.get(toModelName);
  if (!fromModel)
    throw new ReferenceError(
      `Model ${fromModelName} not found in schema ${schemName} when attempting to create a relationship.`
    );
  if (!toModel)
    throw new ReferenceError(
      `Model ${toModelName} not found in schema ${schemName} when attempting to create a relationship.`
    );

  const relationship = new Relationship({ from, to, type });

  fromModel.addRelationship(relationship.assocation, relationship);
  toModel.addRelationship(relationship.reverseAssocation, relationship);

  return relationship;
};
