import { Field, RelationshipField } from 'src/field';
import { Relationship } from 'src/relationship';
import { Record, RecordSet, RecordHandler } from 'src/record';
import types from 'src/types';
import symbols from 'src/symbols';
import { deepClone } from 'src/utils';
import {
  validateName,
  validateModelKey,
  validateModelMethod,
  validateModelContains,
} from 'src/validation';

const {
  $fields,
  $key,
  $methods,
  $scopes,
  $relationships,
  $records,
  $recordHandler,
  $defaultValue,
} = symbols;

export class Model {
  constructor({
    name,
    fields,
    key,
    methods = {},
    scopes = {},
    relationships = {},
    // hooks,
    // validations,
    // indexes,
  } = {}) {
    this.name = validateName('Model', name);

    // Create the record storage and handler
    // This needs to be initialized before fields to allow for retrofilling
    this[$records] = new RecordSet();
    this[$recordHandler] = new RecordHandler(this);

    // Add fields, checking for duplicates and invalids
    this[$fields] = new Map();
    fields.forEach(field => this.addField(field));

    // Check and create the key field
    this[$key] = validateModelKey(this.name, key, this[$fields]);

    // Add methods, checking for duplicates and invalids
    this[$methods] = new Map();
    Object.keys(methods).forEach(methodName => {
      this.addMethod(methodName, methods[methodName]);
    });

    // Add scopes, checking for duplicates and invalids
    this[$scopes] = new Set();
    Object.keys(scopes).forEach(scopeName => {
      this.addScope(scopeName, scopes[scopeName]);
    });

    this[$relationships] = new Map();
    Object.keys(relationships).forEach(relationName => {
      this.addRelationship(relationName, relationships[relationName]);
    });
  }

  addField(field, retrofill) {
    if (!(field instanceof Field))
      throw new Error(`Field ${field} is not a Field.`);
    if (this[$fields].has(field.name))
      throw new Error(`Duplicate field name ${field.name}.`);

    this[$fields].set(field.name, field);

    // Retrofill records with new fields
    const isRetrofillFunction = typeof retrofill === 'function';
    this[$records].forEach(record => {
      record[field.name] = isRetrofillFunction ? retrofill(record) : retrofill;
      if (!field.validate(record[field.name])) {
        throw new Error(
          `${this.name} record has invalid value for field ${field.name}.`
        );
      }
    });
  }

  removeField(name) {
    this[$fields].delete(validateModelContains('Field', name, this[$fields]));
  }

  updateField(name, field) {
    if (!(field instanceof Field))
      throw new Error(`Field ${field} is not a Field.`);
    if (field.name !== name)
      throw new Error(`Field name ${field.name} does not match ${name}.`);
    this.removeField(name);
    this.addField(field);
  }

  addMethod(name, method) {
    this[$methods].set(
      name,
      validateModelMethod('Method', name, method, this[$methods])
    );
  }

  removeMethod(name) {
    this[$methods].delete(
      validateModelContains('Method', name, this[$methods])
    );
  }

  addScope(name, scope) {
    validateModelMethod('Scope', name, scope, this[$scopes]);
    if (this[name]) throw new Error(`Scope name ${name} is already in use.`);

    this[$scopes].add(name);
    Object.defineProperty(this, name, {
      get: () => {
        return this.where(scope);
      },
    });
  }

  removeScope(name) {
    this[$scopes].delete(validateModelContains('Scope', name, this[$scopes]));
    delete this[name];
  }

  addRelationship(relationship) {
    if (!(relationship instanceof Relationship))
      throw new Error(`Relation ${relationship} is not a Relation.`);
    const { name } = relationship;
    if (this[$fields].has(name))
      throw new Error(`Field ${name} already exists.`);
    this[$fields].set(name, new RelationshipField(relationship));
    this[$relationships].set(name, relationship);
  }

  add(record) {
    if (!record) throw new Error('Record is required');

    const newRecordKey = record[this[$key].name];
    if (newRecordKey === undefined)
      throw new Error(`${this.name} record has no key.`);
    if (this[$records].has(newRecordKey))
      throw new Error(
        `${this.name} record with key ${newRecordKey} already exists.`
      );

    const newRecord = deepClone(record);
    const newRecordFields = new Set(Object.keys(newRecord));
    this[$fields].forEach(field => {
      const isFieldNil = types.nil(newRecord[field.name]);
      // Set the default value if the field is null or undefined
      if (field.required && isFieldNil)
        newRecord[field.name] = field[$defaultValue];
      // Throw an error if the field value is invalid
      if (!field.validate(newRecord[field.name])) {
        throw new Error(
          `${this.name} record has invalid value for field ${field.name}.`
        );
      }
      newRecordFields.delete(field.name);
    });
    newRecordFields.delete(this[$key].name);

    if (newRecordFields.size > 0)
      console.warn(
        `${this.name} record has extra fields: ${[...newRecordFields].join(
          ', '
        )}.`
      );

    this[$records].set(newRecordKey, newRecord);
    return new Record(newRecord, this[$recordHandler]);
  }

  get records() {
    return this[$records].map(
      object => new Record(object, this[$recordHandler])
    );
  }

  getField(name) {
    if (name === this[$key].name) return this[$key];
    return this[$fields].get(name);
  }

  hasField(name) {
    return this[$key].name === name || this[$fields].has(name);
  }

  // Iterator
  // Batch iterator (configurable batch size)
  // Limit
  // Offset
}

export default Model;
