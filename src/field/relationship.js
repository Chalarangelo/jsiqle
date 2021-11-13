import Field from './field';
import { DefaultValueError } from 'src/errors';
import types from 'src/types';
import symbols from 'src/symbols';

const { $defaultValue, $foreignField } = symbols;

export class RelationshipField extends Field {
  constructor(relationship) {
    const { name, relationType } = relationship;
    const isMultiple =
      relationType === 'oneToMany' || relationType === 'manyToMany';
    const foreignField = relationship[$foreignField];
    const type = isMultiple
      ? types.arrayOf(value => foreignField.validate(value))
      : value => foreignField.validate(value);

    super({
      name,
      type,
      required: false,
      defaultValue: null,
    });
  }

  get [$defaultValue]() {
    throw new DefaultValueError(
      'Relationship field does not have a default value.'
    );
  }
}

export default RelationshipField;
