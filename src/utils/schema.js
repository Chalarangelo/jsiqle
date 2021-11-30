import { Model } from 'src/model';
import { validateObjectWithUniqueName } from './common';

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
