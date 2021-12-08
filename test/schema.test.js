import { Schema } from 'src/schema';
import { Model } from 'src/model';
import symbols from 'src/symbols';

const { $instances, $fields, $methods } = symbols;

describe('Schema', () => {
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

  // We prefer Schema.create as it's the "correct" way to create a schema.
  it('throws if "name" is invalid', () => {
    expect(() => Schema.create({ name: null })).toThrow();
    expect(() => Schema.create({ name: undefined })).toThrow();
    expect(() => Schema.create({ name: '' })).toThrow();
    expect(() => Schema.create({ name: ' ' })).toThrow();
    expect(() => Schema.create({ name: '1' })).toThrow();
    expect(() => Schema.create({ name: 'a&1*b' })).toThrow();
  });

  describe('when arguments are valid', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'aModel' }],
        config: {
          experimentalAPIMessages: 'off',
        },
      });
    });

    it('creates a schema with the correct name', () => {
      expect(schema.name).toBe('test');
    });

    it('creates a schema with the appropriate models', () => {
      expect(schema.models.has('aModel')).toBe(true);
    });

    it('creates a schema with the appropriate config', () => {
      expect(Schema.config.experimentalAPIMessages).toBe('off');
    });

    it('adds the schema to the dictionary', () => {
      expect(Schema.get('test')).toBe(schema);
    });
  });

  describe('createModel', () => {
    let schema, model;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'aModel' }],
      });
      model = schema.createModel({ name: 'bModel' });
    });

    it('creates the appropriate model', () => {
      expect(schema.models.get('bModel')).toBe(model);
    });
  });

  describe('getModel', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'aModel' }],
      });
    });

    it('returns the model if it exists', () => {
      expect(schema.getModel('aModel').name).toBe('aModel');
    });

    it('returns undefined if the model does not exist', () => {
      expect(schema.getModel('bModel')).toBeUndefined();
    });
  });

  describe('removeModel', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'aModel' }],
      });
      schema.removeModel('aModel');
    });

    it('throws if the model does not exist', () => {
      expect(() => schema.removeModel('bModel')).toThrow();
    });

    it('removes the specified model', () => {
      expect(schema.models.get('aModel')).toBeUndefined();
    });
  });

  describe('createRelationship', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'aModel' }, { name: 'bModel' }],
      });
      schema.createRelationship({
        from: 'aModel',
        to: 'bModel',
        type: 'oneToOne',
      });
      schema.createRelationship({
        from: { model: 'bModel', name: 'parent' },
        to: { model: 'aModel', name: 'children' },
        type: 'manyToOne',
      });
    });

    it('throws if the any of the models is of an invalid type', () => {
      expect(() =>
        schema.createRelationship({
          from: 1,
          to: 'bModel',
          type: 'oneToOne',
        })
      ).toThrow();
      expect(() =>
        schema.createRelationship({
          from: 'aModel',
          to: 2,
          type: 'oneToOne',
        })
      ).toThrow();
    });

    it('throws if any of the models does not exist', () => {
      expect(() =>
        schema.createRelationship({
          from: 'cModel',
          to: 'bModel',
          type: 'oneToOne',
        })
      ).toThrow();
      expect(() =>
        schema.createRelationship({
          from: 'aModel',
          to: 'cModel',
          type: 'oneToOne',
        })
      ).toThrow();
    });

    it('creates the correct fields and methods on the given models', () => {
      expect(schema.getModel('aModel')[$fields].has('bModel')).toBe(true);
      expect(schema.getModel('aModel')[$methods].has('children')).toBe(true);
      expect(schema.getModel('bModel')[$fields].has('parent')).toBe(true);
      expect(schema.getModel('bModel')[$methods].has('aModel')).toBe(true);
    });
  });

  describe('get', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [
          { name: 'aModel' },
          { name: 'bModel', key: { name: 'id', type: 'auto' } },
        ],
      });

      schema.getModel('aModel').createRecord({
        id: 'a',
      });
      schema.getModel('bModel').createRecord({});
    });

    it('throws if queried with a model that does not exist', () => {
      expect(() => schema.get('cModel')).toThrow();
    });

    it('returns the model if it exists', () => {
      expect(schema.get('aModel').name).toBe('aModel');
    });

    it('returns undefined if queried with a record that does not exist', () => {
      expect(schema.get('aModel.c')).toBeUndefined();
    });

    it('returns the record if it exists', () => {
      expect(schema.get('aModel.a').id).toBe('a');
      expect(schema.get('bModel.0').id).toBe(0);
    });

    it('throws if queried with a non-existent record followed by a field name', () => {
      expect(() => schema.get('aModel.c.name')).toThrow();
    });

    it('returns the field if it exists', () => {
      expect(schema.get('aModel.a.id')).toBe('a');
      expect(schema.get('bModel.0.id')).toBe(0);
    });
  });
});
