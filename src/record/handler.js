import types from 'src/types';
import symbols from 'src/symbols';
import { RelationshipField } from 'src/field';

const {
  $fields,
  $key,
  $methods,
  $relationships,
  $recordValue,
  $recordModel,
  $defaultValue,
} = symbols;

export const recordToObject = (record, model, handler) => {
  const recordValue = record[$recordValue];
  const fields = model[$fields];
  const key = model[$key].name;
  const object = {
    [key]: recordValue[key],
  };

  fields.forEach(field => {
    const value = recordValue[field.name];
    if (value !== undefined) object[field.name] = recordValue[field.name];
  });

  const toObject = ({ include = [] } = {}) => {
    let result = object;

    // e.g. include: ['category', 'siblings.category']
    const included = include.map(name => {
      const [field, ...props] = name.split('.');
      return [field, props.join('.')];
    });

    included.forEach(([includedField, props]) => {
      if (object[includedField]) {
        if (Array.isArray(object[includedField])) {
          const records = handler.get(record, includedField);
          object[includedField] = records.map(record =>
            record.toObject({ include: [props] })
          );
        } else {
          object[includedField] = handler
            .get(record, includedField)
            .toObject({ include: [props] });
        }
      }
    });
    return result;
  };

  return toObject;
};

class RecordHandler {
  constructor(model) {
    this.model = model;
  }

  get(record, property) {
    const recordValue = record[$recordValue];
    if (this.model[$key].name === property) return recordValue[property];
    if (
      this.model[$fields].has(property) &&
      !(this.model[$fields].get(property) instanceof RelationshipField)
    )
      return recordValue[property];
    if (this.model[$methods].has(property))
      return this.model[$methods].get(property)(recordValue);
    if (this.model[$relationships].has(property))
      return this.model[$relationships].get(property).get(recordValue);
    if (property === 'toObject')
      return recordToObject(record, this.model, this);
    if (property === $recordModel) return record[$recordModel];
  }

  set(record, property, value) {
    const recordValue = record[$recordValue];
    if (this.model[$fields].has(property)) {
      const field = this.model[$fields].get(property);
      const isFieldNil = types.nil(recordValue[property]);
      // Set the default value if the field is null or undefined
      if (field.required && isFieldNil)
        recordValue[field.name] = field[$defaultValue];
      // Throw an error if the field value is invalid
      if (!field.validate(recordValue[field.name])) {
        throw new Error(
          `${this.name} record has invalid value for field ${field.name}.`
        );
      }
    } else {
      console.warn(`${this.name} record has extra field: ${property}.`);
    }
    recordValue[property] = value;
  }
}

export default RecordHandler;
