import { Model } from 'src/model';
import { Schema } from 'src/schema';
import symbols from 'src/symbols';

const {
  $instances,
  $fields,
  $properties,
  $cachedProperties,
  $methods,
  $scopes,
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

  it('throws if a model with the same name already exists', () => {
    // eslint-disable-next-line no-unused-vars
    const model = new Model({ name: 'aModel' });
    expect(() => new Model({ name: 'aModel' })).toThrow();
  });

  it('throws if "fields" contain invalid values', () => {
    const modelParams = { name: 'aModel' };

    expect(() => new Model({ ...modelParams, fields: null })).toThrow();
    expect(() => new Model({ ...modelParams, fields: { a: 2 } })).toThrow();
    expect(
      () => new Model({ ...modelParams, fields: { name: 'aField' } })
    ).toThrow();
    expect(
      () => new Model({ ...modelParams, fields: { id: { type: 'test' } } })
    ).toThrow();
  });

  it('throws if "properties" contain invalid values', () => {
    const modelParams = { name: 'aModel' };

    expect(() => new Model({ ...modelParams, properties: null })).toThrow();
    expect(() => new Model({ ...modelParams, properties: [2] })).toThrow();
    expect(
      () => new Model({ ...modelParams, properties: { aProperty: 'hi' } })
    ).toThrow();
  });

  it('throws if "scopes" contain invalid values', () => {
    const modelParams = { name: 'aModel' };

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

  describe('when arguments are valid', () => {
    it('has the appropriate name', () => {
      expect(new Model({ name: 'aModel' }).name).toBe('aModel');
    });

    it('has the correct fields', () => {
      const fields = {
        aField: 'string',
        bField: 'number',
        cField: 'boolean',
        dField: () => true,
      };
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
        cScope: {
          matcher: () => null,
          sorter: (a, b) => a - b,
        },
      };

      const model = new Model({ name: 'aModel', scopes });
      expect(model.records[$scopes].has('aScope')).toEqual(true);
      expect(model.records[$scopes].has('bScope')).toEqual(true);
      expect(model.records[$scopes].has('cScope')).toEqual(true);
    });
  });

  describe('addField', () => {
    let model;

    beforeEach(() => {
      model = new Model({ name: 'aModel' });
    });

    it('creates the appropriate field', () => {
      model.addField({ name: 'aField', type: 'string' });
      expect(model[$fields].has('aField')).toEqual(true);
    });
  });

  describe('addProperty', () => {
    let model;

    beforeEach(() => {
      model = new Model({ name: 'aModel' });
    });

    it('throws if "name" is invalid', () => {
      expect(() => model.addProperty(null)).toThrow();
      expect(() => model.addProperty(2)).toThrow();
      expect(() => model.addProperty('2f')).toThrow();
      expect(() => model.addProperty('id')).toThrow();
    });

    it('throws if "body" is not a function', () => {
      expect(() =>
        model.addProperty({ name: 'aProperty', body: null })
      ).toThrow();
      expect(() => model.addProperty({ name: 'aProperty', body: 2 })).toThrow();
    });

    it('creates the appropriate property', () => {
      model.addProperty({ name: 'aProperty', body: () => null });
      expect(model[$properties].has('aProperty')).toEqual(true);
    });

    it('creates a cached property if "cache" is true', () => {
      model.addProperty({ name: 'aProperty', body: () => null, cache: true });
      expect(model[$properties].has('aProperty')).toEqual(true);
      expect(model[$cachedProperties].has('aProperty')).toEqual(true);
    });
  });

  describe('addMethod', () => {
    let model;

    beforeEach(() => {
      model = new Model({ name: 'aModel' });
    });

    it('throws if "name" is invalid', () => {
      expect(() => model.addMethod(null)).toThrow();
      expect(() => model.addMethod(2)).toThrow();
      expect(() => model.addMethod('2f')).toThrow();
      expect(() => model.addMethod('id')).toThrow();
    });

    it('throws if "method" is not a function', () => {
      expect(() => model.addMethod('aProperty', null)).toThrow();
      expect(() => model.addMethod('aProperty', 2)).toThrow();
    });

    it('creates the appropriate property', () => {
      model.addMethod('aMethod', () => null);
      expect(model[$methods].has('aMethod')).toEqual(true);
    });
  });

  describe('addScope', () => {
    let model;

    beforeEach(() => {
      model = new Model({ name: 'aModel' });
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

    it('creates an appropriate scope with a sorter', () => {
      model.addScope(
        'aScope',
        () => null,
        (a, b) => a.id - b.id
      );
      expect(model.records[$scopes].has('aScope')).toEqual(true);
    });
  });

  describe('createRecord', () => {
    let model;

    beforeEach(() => {
      model = new Model({
        name: 'aModel',
        fields: {
          name: {
            type: 'string',
          },
          age: {
            type: 'number',
            defaultValue: 18,
          },
        },
        scopes: {
          adult: ({ age }) => age >= 18,
        },
        properties: {
          nameAndId: record => `${record.name}_${record.id}`,
        },
        methods: {
          nameWithSuffix: (record, suffix) => `${record.name}_${suffix}`,
        },
      });
    });

    it('throws if "data" is not an object', () => {
      expect(() => model.createRecord()).toThrow();
      expect(() => model.createRecord(null)).toThrow();
      expect(() => model.createRecord(2)).toThrow();
    });

    it('throws if id is not present', () => {
      expect(() => model.createRecord({ name: 'aName' })).toThrow();
    });

    it('throws if id is not unique', () => {
      model.createRecord({ id: 'a', name: 'aName' });
      expect(() => model.createRecord({ id: 'a', name: 'bName' })).toThrow();
    });

    it('throws if a field value is not of the correct type', () => {
      expect(() => model.createRecord({ id: 'a', name: 2 })).toThrow();
    });

    it('throws if a record with the same id exists', () => {
      // eslint-disable-next-line no-unused-vars
      const record = model.createRecord({ id: 'a', name: 'aName' });
      expect(() => model.createRecord({ id: 'a', name: 'bName' })).toThrow();
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

      it('the record has the correct methods', () => {
        expect(record.nameWithSuffix('suffix')).toEqual('aName_suffix');
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
        fields: { name: { type: 'string' } },
      });
    });

    it('returns false if "recordId" does not exist', () => {
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
        fields: { name: { type: 'string' } },
      });
    });

    it('throws if "recordId" does not exist', () => {
      expect(() => model.updateRecord('a', { name: 'ab' })).toThrow();
    });

    it('throws if "recordId" does not match the new record', () => {
      expect(() => model.updateRecord('a', { id: 'b', name: 'ab' })).toThrow();
    });

    it('throws if "record" is not an object', () => {
      expect(() => model.updateRecord('a', 'ab')).toThrow();
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
        fields: { name: { type: 'string' } },
        scopes: {
          nonExistentRecords: record => record.name === '',
          namedRecords: record => record.name.length > 2,
          sortedNamedRecords: {
            matcher: record => record.name.length > 2,
            sorter: (a, b) => b.name.localeCompare(a.name),
          },
        },
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

    it('returns an empty set for a given scope with no matches', () => {
      [
        { id: 'a', name: 'aName' },
        { id: 'b', name: 'bName' },
        { id: 'c', name: 'c' },
      ].forEach(record => model.createRecord(record));
      expect(
        model.records.nonExistentRecords.flatMap(record => record.id)
      ).toEqual([]);
    });

    it('returns the correct records unordered for a given scope', () => {
      [
        { id: 'a', name: 'aName' },
        { id: 'b', name: 'bName' },
        { id: 'c', name: 'c' },
      ].forEach(record => model.createRecord(record));
      expect(model.records.namedRecords.flatMap(record => record.id)).toEqual([
        'a',
        'b',
      ]);
    });

    it('returns the correct records in the correct order for a given ordered scope', () => {
      [
        { id: 'a', name: 'aName' },
        { id: 'b', name: 'bName' },
        { id: 'c', name: 'c' },
      ].forEach(record => model.createRecord(record));
      expect(
        model.records.sortedNamedRecords.flatMap(record => record.id)
      ).toEqual(['b', 'a']);
    });
  });
});
