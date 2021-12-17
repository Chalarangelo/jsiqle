import { Model } from 'src/model';
import { Schema } from 'src/schema';
import symbols from 'src/symbols';

const {
  $instances,
  $key,
  $keyType,
  $fields,
  $properties,
  $scopes,
  $validators,
} = symbols;

describe('Model', () => {
  let consoleWarn = console.warn;

  beforeAll(() => {
    global.console.warn = jest.fn();
    Schema.config.experimentalAPIMessages = 'off';
  });

  afterAll(() => {
    global.console.warn = consoleWarn;
    Schema.config.experimentalAPIMessages = 'warn';
  });

  afterEach(() => {
    // Cleanup to avoid instances leaking to other tests
    Model[$instances].clear();
  });

  it('throws if "name" is invalid', () => {
    expect(() => new Model({ name: null })).toThrow();
    expect(() => new Model({ name: undefined })).toThrow();
    expect(() => new Model({ name: '' })).toThrow();
    expect(() => new Model({ name: ' ' })).toThrow();
    expect(() => new Model({ name: '1' })).toThrow();
    expect(() => new Model({ name: 'a&1*b' })).toThrow();
  });

  it('throws if a model with the same name already exists', () => {
    // eslint-disable-next-line no-unused-vars
    const model = new Model({ name: 'aModel' });
    expect(() => new Model({ name: 'aModel' })).toThrow();
  });

  it('throws if "key" is invalid', () => {
    expect(() => new Model({ name: 'aModel', key: null })).toThrow();
    expect(() => new Model({ name: 'aModel', key: 2 })).toThrow();
    expect(() => new Model({ name: 'aModel', key: {} })).toThrow();
    expect(
      () => new Model({ name: 'aModel', key: { name: 'id', type: 'test' } })
    ).toThrow();
    expect(() => new Model({ name: 'aModel', key: '2' })).toThrow();
    expect(
      () => new Model({ name: 'aModel', key: { name: '2', type: 'auto' } })
    ).toThrow();
  });

  it('throws if "fields" contain invalid values', () => {
    const modelParams = { name: 'aModel', key: 'id' };

    expect(() => new Model({ ...modelParams, fields: null })).toThrow();
    expect(() => new Model({ ...modelParams, fields: [2] })).toThrow();
    expect(
      () => new Model({ ...modelParams, fields: [{ name: 'aField' }] })
    ).toThrow();
    expect(
      () =>
        new Model({ ...modelParams, fields: [{ name: 'id', type: 'test' }] })
    ).toThrow();
    expect(
      () =>
        new Model({ ...modelParams, fields: [{ name: '2f', type: 'string' }] })
    ).toThrow();
  });

  it('throws if "properties" contain invalid values', () => {
    const modelParams = { name: 'aModel', key: 'id' };

    expect(() => new Model({ ...modelParams, properties: null })).toThrow();
    expect(() => new Model({ ...modelParams, properties: [2] })).toThrow();
    expect(
      () => new Model({ ...modelParams, properties: { aProperty: 'hi' } })
    ).toThrow();
    expect(
      () => new Model({ ...modelParams, properties: { id: () => null } })
    ).toThrow();
    expect(
      () => new Model({ ...modelParams, properties: { '2d': () => null } })
    ).toThrow();
  });

  it('throws if "scopes" contain invalid values', () => {
    const modelParams = { name: 'aModel', key: 'id' };

    expect(() => new Model({ ...modelParams, scopes: null })).toThrow();
    expect(() => new Model({ ...modelParams, scopes: [2] })).toThrow();
    expect(
      () => new Model({ ...modelParams, scopes: { aScope: 'hi' } })
    ).toThrow();
    expect(
      () => new Model({ ...modelParams, scopes: { toString: () => null } })
    ).toThrow();
    expect(
      () => new Model({ ...modelParams, scopes: { map: () => null } })
    ).toThrow();
    expect(
      () => new Model({ ...modelParams, scopes: { '2d': () => null } })
    ).toThrow();
  });

  it('throws if "validators" contain invalid values', () => {
    const modelParams = { name: 'aModel', key: 'id' };

    expect(() => new Model({ ...modelParams, validators: null })).toThrow();
    expect(() => new Model({ ...modelParams, validators: [2] })).toThrow();
    expect(
      () => new Model({ ...modelParams, validators: { aValidator: 'hi' } })
    ).toThrow();
  });

  describe('when arguments are valid', () => {
    it('has the appropriate name', () => {
      expect(new Model({ name: 'aModel' }).name).toBe('aModel');
    });

    it('has the appropriate key name and type', () => {
      const defaultKeyModel = new Model({ name: 'aModel' });
      expect(defaultKeyModel[$key].name).toBe('id');
      expect(defaultKeyModel[$key][$keyType]).toBe('string');

      const customKeyNameModel = new Model({ name: 'bModel', key: 'myKey' });
      expect(customKeyNameModel[$key].name).toBe('myKey');
      expect(customKeyNameModel[$key][$keyType]).toBe('string');

      const customKeyNameTypeModel = new Model({
        name: 'cModel',
        key: { name: 'aKey', type: 'auto' },
      });
      expect(customKeyNameTypeModel[$key].name).toBe('aKey');
      expect(customKeyNameTypeModel[$key][$keyType]).toBe('auto');
    });

    it('has the correct fields', () => {
      const fields = [
        { name: 'aField', type: 'string' },
        { name: 'bField', type: 'number' },
        { name: 'cField', type: 'boolean' },
        { name: 'dField', type: () => true },
      ];
      const model = new Model({ name: 'aModel', fields });
      expect(model[$fields].has('aField')).toEqual(true);
      expect(model[$fields].has('bField')).toEqual(true);
      expect(model[$fields].has('cField')).toEqual(true);
      expect(model[$fields].has('dField')).toEqual(true);
    });

    it('has the correct properties', () => {
      const properties = {
        aProperty: () => null,
        bProperty: () => null,
      };

      const model = new Model({ name: 'aModel', properties });
      expect(model[$properties].has('aProperty')).toEqual(true);
      expect(model[$properties].has('bProperty')).toEqual(true);
    });

    it('has the correct scopes', () => {
      const scopes = {
        aScope: () => null,
        bScope: () => null,
      };

      const model = new Model({ name: 'aModel', scopes });
      expect(model.records[$scopes].has('aScope')).toEqual(true);
      expect(model.records[$scopes].has('bScope')).toEqual(true);
    });

    it('has the correct validators', () => {
      const validators = {
        aValidator: () => null,
        bValidator: () => null,
      };

      const model = new Model({ name: 'aModel', validators });
      expect(model[$validators].has('aValidator')).toEqual(true);
      expect(model[$validators].has('bValidator')).toEqual(true);
    });
  });

  describe('addField', () => {
    let model;

    beforeEach(() => {
      model = new Model({ name: 'aModel', key: 'id' });
    });

    it('throws if "fieldOptions" are invalid', () => {
      expect(() => model.addField(null)).toThrow();
      expect(() => model.addField(2)).toThrow();
      expect(() => model.addField({ name: 'aField' })).toThrow();
      expect(() => model.addField({ name: 'id', type: 'string' })).toThrow();
      expect(() => model.addField({ name: 'aField', type: 'test' })).toThrow();
      expect(() => model.addField({ name: '2f', type: 'string' })).toThrow();
    });

    it('creates the appropriate field', () => {
      model.addField({ name: 'aField', type: 'string' });
      expect(model[$fields].has('aField')).toEqual(true);
    });

    it('applies "retrofill" if it is a function', () => {
      model.createRecord({ id: 'a' });
      model.addField({ name: 'aField', type: 'string' }, () => 'x');
      expect(model[$fields].has('aField')).toEqual(true);
      expect(model.records.first.aField).toEqual('x');
    });

    it('applies "retrofill" if it is a value', () => {
      model.createRecord({ id: 'a' });
      model.addField({ name: 'aField', type: 'string' }, 'x');
      expect(model[$fields].has('aField')).toEqual(true);
      expect(model.records.first.aField).toEqual('x');
    });

    it('does not apply "retrofill" if undefined and the field is not required', () => {
      model.createRecord({ id: 'a' });
      model.addField({ name: 'aField', type: 'string' });
      expect(model[$fields].has('aField')).toEqual(true);
      expect(model.records.first.aField).toEqual(undefined);
    });

    it('applies the default or existing value if "retrofill" is undefined and the field is required', () => {
      model.createRecord({ id: 'a' });
      model.createRecord({ id: 'b', aField: 'y' });
      model.addField({
        name: 'aField',
        type: 'string',
        required: true,
        defaultValue: 'x',
      });
      expect(model[$fields].has('aField')).toEqual(true);
      expect(model.records.first.aField).toEqual('x');
      expect(model.records.last.aField).toEqual('y');
    });
  });

  describe('removeField', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        fields: [{ name: 'aField', type: 'string' }],
      });
    });

    it('returns false if "fieldName" does not exist', () => {
      expect(model.removeField('bField')).toEqual(false);
    });

    it('removes the appropriate field and returns true', () => {
      expect(model.removeField('aField')).toEqual(true);
      expect(model[$fields].has('aField')).toEqual(false);
    });
  });

  describe('updateField', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        fields: [{ name: 'aField', type: 'string' }],
      });
    });

    it('throws if fieldName does not match new field name', () => {
      expect(() =>
        model.updateField('aField', { name: 'bField', type: 'number' })
      ).toThrow();
    });

    it('throws if "fieldName" does not exist', () => {
      expect(() =>
        model.updateField('bField', { name: 'bField', type: 'number' })
      ).toThrow();
    });

    it('updates the appropriate field', () => {
      const oldField = model[$fields].get('aField');
      model.updateField('aField', { name: 'aField', type: 'number' });
      expect(model[$fields].has('aField')).toEqual(true);
      expect(model[$fields].get('aField')).not.toBe(oldField);
    });
  });

  describe('addProperty', () => {
    let model;

    beforeEach(() => {
      model = new Model({ name: 'aModel', key: 'id' });
    });

    it('throws if "name" is invalid', () => {
      expect(() => model.addProperty(null)).toThrow();
      expect(() => model.addProperty(2)).toThrow();
      expect(() => model.addProperty('2f')).toThrow();
      expect(() => model.addProperty('id')).toThrow();
    });

    it('throws if "property" is not a function', () => {
      expect(() => model.addProperty('aProperty', null)).toThrow();
      expect(() => model.addProperty('aProperty', 2)).toThrow();
    });

    it('creates the appropriate property', () => {
      model.addProperty('aProperty', () => null);
      expect(model[$properties].has('aProperty')).toEqual(true);
    });
  });

  describe('removeProperty', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        properties: { aProperty: () => null },
      });
    });

    it('returns false if "propertyName" does not exist', () => {
      expect(model.removeProperty('bProperty')).toEqual(false);
    });

    it('removes the appropriate field and returns true', () => {
      expect(model.removeProperty('aProperty')).toEqual(true);
      expect(model[$properties].has('aProperty')).toEqual(false);
    });
  });

  describe('addScope', () => {
    let model;

    beforeEach(() => {
      model = new Model({ name: 'aModel', key: 'id' });
    });

    it('throws if "name" is invalid', () => {
      expect(() => model.addScope(null)).toThrow();
      expect(() => model.addScope(2)).toThrow();
      expect(() => model.addScope('2f')).toThrow();
    });

    it('throws if "scope" is not a function', () => {
      expect(() => model.addScope('aScope', null)).toThrow();
      expect(() => model.addScope('aScope', 2)).toThrow();
    });

    it('creates the appropriate scope', () => {
      model.addScope('aScope', () => null);
      expect(model.records[$scopes].has('aScope')).toEqual(true);
    });
  });

  describe('removeScope', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        scopes: { aScope: () => null },
      });
    });

    it('returns false if "scopeName" does not exist', () => {
      expect(model.removeScope('bScope')).toEqual(false);
    });

    it('removes the appropriate field and returns true', () => {
      expect(model.removeScope('aScope')).toEqual(true);
      expect(model.records[$scopes].has('aScope')).toEqual(false);
    });
  });

  describe('addValidator', () => {
    let model;

    beforeEach(() => {
      model = new Model({ name: 'aModel', key: 'id' });
    });

    it('throws if "name" is invalid', () => {
      expect(() => model.addValidator(null)).toThrow();
      expect(() => model.addValidator(2)).toThrow();
    });

    it('throws if "validators" is not a function', () => {
      expect(() => model.addValidator('aValidator', null)).toThrow();
      expect(() => model.addValidator('aValidator', 2)).toThrow();
    });

    it('creates the appropriate validator', () => {
      model.addValidator('aValidator', () => null);
      expect(model[$validators].has('aValidator')).toEqual(true);
    });
  });

  describe('removeValidator', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        validators: { aValidator: () => null },
      });
    });

    it('returns false if "validatorName" does not exist', () => {
      expect(model.removeValidator('bValidator')).toEqual(false);
    });

    it('removes the appropriate field and returns true', () => {
      expect(model.removeValidator('aValidator')).toEqual(true);
      expect(model[$validators].has('aValidator')).toEqual(false);
    });
  });

  describe('createRecord', () => {
    let model;
    let autoIncrementModel;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        fields: [
          {
            name: 'name',
            type: 'string',
            validators: {
              unique: true,
            },
          },
          { name: 'age', type: 'numberRequired', defaultValue: 18 },
        ],
        scopes: {
          adult: ({ age }) => age >= 18,
        },
        properties: {
          nameAndId: record => `${record.name}_${record.id}`,
        },
        validators: {
          nameNotEqualToId: record => record.id !== record.name,
        },
      });

      autoIncrementModel = new Model({
        name: 'bModel',
        key: { name: 'id', type: 'auto' },
        fields: [{ name: 'name', type: 'string' }],
      });
    });

    it('throws if "data" is not an object', () => {
      expect(() => model.createRecord()).toThrow();
      expect(() => model.createRecord(null)).toThrow();
      expect(() => model.createRecord(2)).toThrow();
    });

    it('throws if key is not present', () => {
      expect(() => model.createRecord({ name: 'aName' })).toThrow();
    });

    it('throws if key is not unique', () => {
      model.createRecord({ id: 'a', name: 'aName' });
      expect(() => model.createRecord({ id: 'a', name: 'bName' })).toThrow();
    });

    it('auto-generates keys in auto-increment models', () => {
      const record = autoIncrementModel.createRecord({ name: 'aName' });
      expect(record.id).toEqual(0);
      const otherRecord = autoIncrementModel.createRecord({ name: 'bName' });
      expect(otherRecord.id).toEqual(1);
    });

    it('throws if a field value is not of the correct type', () => {
      expect(() => model.createRecord({ id: 'a', name: 2 })).toThrow();
    });

    it('throws if a field value fails validation', () => {
      // eslint-disable-next-line no-unused-vars
      const record = model.createRecord({ id: 'a', name: 'aName' });
      expect(() => model.createRecord({ id: 'b', name: 'aName' })).toThrow();
    });

    it('throws if a record with the same key exists', () => {
      // eslint-disable-next-line no-unused-vars
      const record = model.createRecord({ id: 'a', name: 'aName' });
      expect(() => model.createRecord({ id: 'a', name: 'bName' })).toThrow();
    });

    it('throws if a model validator fails for the new record', () => {
      expect(() => model.createRecord({ id: 'a', name: 'a' })).toThrow();
    });

    describe('with correct arguments', () => {
      let record;

      beforeEach(() => {
        record = model.createRecord({ id: 'a', name: 'aName' });
      });

      it('creates the record with the correct values', () => {
        expect(record.id).toEqual('a');
        expect(record.name).toEqual('aName');
        expect(record.age).toEqual(18);
      });

      it('adds the record to the model', () => {
        expect(model.records.has('a')).toEqual(true);
      });

      it('the record has the correct properties', () => {
        expect(record.nameAndId).toEqual('aName_a');
      });

      it('matches the record to the correct scopes', () => {
        expect(model.records.adult.has('a')).toEqual(true);
      });
    });
  });

  describe('removeRecord', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        fields: [
          { name: 'name', type: 'string', validators: { minLength: 1 } },
        ],
      });
    });

    it('returns false if "recordKey" does not exist', () => {
      expect(model.removeRecord('aRecord')).toEqual(false);
    });

    it('removes the appropriate record and returns true', () => {
      // eslint-disable-next-line no-unused-vars
      const record = model.createRecord({ id: 'a', name: 'aName' });
      expect(model.removeRecord('a')).toEqual(true);
      expect(model.records.has('a')).toEqual(false);
    });
  });

  describe('updateRecord', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        fields: [
          { name: 'name', type: 'string', validators: { minLength: 1 } },
        ],
      });
    });

    it('throws if "recordKey" does not exist', () => {
      expect(() => model.updateRecord('a', { name: 'ab' })).toThrow();
    });

    it('throws if "recordKey" does not match the new record', () => {
      expect(() => model.updateRecord('a', { id: 'b', name: 'ab' })).toThrow();
    });

    it('throws if "record" is not an object', () => {
      expect(() => model.updateRecord('a', 'ab')).toThrow();
    });

    it('throws if a field fails type checking or validation', () => {
      // eslint-disable-next-line no-unused-vars
      const record = model.createRecord({ id: 'a', name: 'aName' });
      expect(() => model.updateRecord('a', { name: 2 })).toThrow();
      expect(() => model.updateRecord('a', { name: '' })).toThrow();
    });

    it('updates the record with the correct values', () => {
      // eslint-disable-next-line no-unused-vars
      const record = model.createRecord({ id: 'a', name: 'aName' });
      model.updateRecord('a', { name: 'bName' });
      expect(record.name).toEqual('bName');
    });
  });

  describe('records', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        fields: [
          { name: 'name', type: 'string', validators: { minLength: 1 } },
        ],
      });
    });

    it('returns an empty record set if no records exist', () => {
      expect(model.records.size).toEqual(0);
      expect(model.records.has('a')).toEqual(false);
    });

    it('returns the correct records', () => {
      [
        { id: 'a', name: 'aName' },
        { id: 'b', name: 'bName' },
      ].forEach(record => model.createRecord(record));
      expect(model.records.has('a')).toEqual(true);
      expect(model.records.has('b')).toEqual(true);
      expect(model.records.size).toEqual(2);
    });
  });

  describe('events', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        key: 'id',
        fields: [
          { name: 'name', type: 'string', validators: { minLength: 1 } },
        ],
      });
    });

    // TODO: V2 enhancements
    // When we decide if the events API is going to stay as-is, let's check
    // all before and normal events. For now, 'change' events should do it.

    describe('a "change" of the correct type event is emitted', () => {
      it('when a field is added', () => {
        const spy = jest.fn();
        model.on('change', spy);
        model.addField({ name: 'age', type: 'number' });
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'fieldAdded' })
        );
      });

      it('when a field is removed', () => {
        const spy = jest.fn();
        model.on('change', spy);
        model.removeField('name');
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'fieldRemoved' })
        );
      });

      it('when a field is updated', () => {
        const spy = jest.fn();
        model.on('change', spy);
        model.updateField('name', { name: 'name', type: 'string' });
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'fieldUpdated' })
        );
      });

      it('when a property is added', () => {
        const spy = jest.fn();
        model.on('change', spy);
        model.addProperty('nameAndId', () => 'aName_a');
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'propertyAdded' })
        );
      });

      it('when a property is removed', () => {
        const spy = jest.fn();
        model.addProperty('nameAndId', () => 'aName_a');
        model.on('change', spy);
        model.removeProperty('nameAndId');
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'propertyRemoved' })
        );
      });

      it('when a scope is added', () => {
        const spy = jest.fn();
        model.on('change', spy);
        model.addScope('adult', () => true);
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'scopeAdded' })
        );
      });

      it('when a scope is removed', () => {
        const spy = jest.fn();
        model.addScope('adult', () => true);
        model.on('change', spy);
        model.removeScope('adult');
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'scopeRemoved' })
        );
      });

      it('when a validator is added', () => {
        const spy = jest.fn();
        model.on('change', spy);
        model.addValidator('minLength', () => true);
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'validatorAdded' })
        );
      });

      it('when a validator is removed', () => {
        const spy = jest.fn();
        model.addValidator('minLength', () => true);
        model.on('change', spy);
        model.removeValidator('minLength');
        expect(spy).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'validatorRemoved' })
        );
      });
    });

    it('emits a "beforeCreateRecord" before creating a record', () => {
      const spy = jest.fn();
      model.on('beforeCreateRecord', spy);
      model.createRecord({ id: 'a', name: 'aName' });
      expect(spy).toHaveBeenCalledWith({
        model,
        record: { id: 'a', name: 'aName' },
      });
    });

    it('emits a "recordCreated" event when a record is created', () => {
      const spy = jest.fn();
      model.on('recordCreated', spy);
      const record = model.createRecord({ id: 'a', name: 'aName' });
      expect(spy).toHaveBeenCalledWith({ newRecord: record, model });
    });

    it('emits a "beforeRemoveRecord" before removing a record', () => {
      const spy = jest.fn();
      model.on('beforeRemoveRecord', spy);
      const record = model.createRecord({ id: 'a', name: 'aName' });
      model.removeRecord('a');
      expect(spy).toHaveBeenCalledWith({ model, record });
    });

    it('emits a "recordRemoved" event when a record is removed', () => {
      const spy = jest.fn();
      model.on('recordRemoved', spy);
      // eslint-disable-next-line no-unused-vars
      const record = model.createRecord({ id: 'a', name: 'aName' });
      model.removeRecord('a');
      expect(spy).toHaveBeenCalledWith({ record: { id: 'a' }, model });
    });

    it('emits a "beforeUpdateRecord" before updating a record', () => {
      const spy = jest.fn();
      model.on('beforeUpdateRecord', spy);
      const record = model.createRecord({ id: 'a', name: 'aName' });
      model.updateRecord('a', { name: 'bName' });
      expect(spy).toHaveBeenCalledWith({
        model,
        record,
        newRecord: { id: 'a', name: 'bName' },
      });
    });

    it('emits a "recordUpdated" event when a record is updated', () => {
      const spy = jest.fn();
      model.on('recordUpdated', spy);
      const record = model.createRecord({ id: 'a', name: 'aName' });
      model.updateRecord('a', { name: 'bName' });
      expect(spy).toHaveBeenCalledWith({ record, model });
    });
  });
});
