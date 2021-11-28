const relationshipTypes = {
  oneToOne: 'oneToOne',
  oneToMany: 'oneToMany',
  manyToOne: 'manyToOne',
  manyToMany: 'manyToMany',
};

export const toOne = [relationshipTypes.oneToOne, relationshipTypes.manyToOne];

export const toMany = [
  relationshipTypes.oneToMany,
  relationshipTypes.manyToMany,
];

export default Object.values(relationshipTypes);
