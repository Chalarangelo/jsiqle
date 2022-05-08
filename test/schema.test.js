import { Schema } from 'src/schema';
import { Model } from 'src/model';
import symbols from 'src/symbols';

const { $instances, $fields, $properties } = symbols;

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

  it('throws if a model contains invalid or duplicate fields, properties or methods', () => {
    expect(() =>
      Schema.create({
        name: 'test',
        models: [
          {
            name: 'aModel',
            fields: {
              aField: 'string',
              id: 'string',
            },
          },
        ],
        config: {
          experimentalAPIMessages: 'off',
        },
      })
    ).toThrow();

    expect(() =>
      Schema.create({
        name: 'test',
        models: [
          {
            name: 'aModel',
            fields: {
              aField: 'string',
            },
            properties: {
              aProperty: 1,
            },
          },
        ],
        config: {
          experimentalAPIMessages: 'off',
        },
      })
    ).toThrow();

    expect(() =>
      Schema.create({
        name: 'test',
        models: [
          {
            name: 'aModel',
            fields: {
              aField: 'string',
            },
            methods: {
              aMethod: null,
            },
          },
        ],
        config: {
          experimentalAPIMessages: 'off',
        },
      })
    ).toThrow();

    expect(() =>
      Schema.create({
        name: 'test',
        models: [
          {
            name: 'aModel',
            fields: {
              aField: 'string',
            },
            properties: {
              aField: () => {},
            },
          },
        ],
        config: {
          experimentalAPIMessages: 'off',
        },
      })
    ).toThrow();
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

    it('creates lazy properties and methods correctly', () => {
      let count = 0;
      schema = Schema.create({
        name: 'test',
        models: [
          { name: 'cModel' },
          {
            name: 'dModel',
            properties: {
              prop: (rec, { models: { cModel } }) => rec.id + cModel.name,
              other: {
                body: (rec, { models: { cModel } }) => {
                  count++;
                  return rec.id + cModel.name;
                },
                cache: true,
              },
            },
            lazyMethods: {
              method:
                ({ models: { cModel } }) =>
                (rec, value) =>
                  value + rec.id + cModel.name,
            },
          },
        ],
      });
      const record = schema.models.get('dModel').createRecord({ id: 'x' });
      expect(record.prop).toBe('xcModel');
      expect(record.method('y')).toBe('yxcModel');
      expect(record.other).toBe('xcModel');
      expect(count).toBe(1);
      expect(record.other).toBe('xcModel');
      expect(count).toBe(1);
    });

    it('creates lazy serializer methods correctly', () => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'cModel' }],
        serializers: [
          {
            name: 'cSerializer',
            attributes: ['id', 'lazy', 'normal'],
            methods: {
              normal: rec => rec.id + '!',
            },
            lazyMethods: {
              lazy:
                ({ models: { cModel } }) =>
                rec =>
                  rec.id + cModel.name,
            },
          },
        ],
      });
      const record = schema.getModel('cModel').createRecord({ id: 'x' });
      const serialized = schema.getSerializer('cSerializer').serialize(record);
      expect(serialized.normal).toBe('x!');
      expect(serialized.lazy).toBe('xcModel');
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

    it('creates the correct fields and properties on the given models', () => {
      expect(schema.getModel('aModel')[$fields].has('bModel')).toBe(true);
      expect(schema.getModel('aModel')[$properties].has('children')).toBe(true);
      expect(schema.getModel('bModel')[$fields].has('parent')).toBe(true);
      expect(schema.getModel('bModel')[$properties].has('aModel')).toBe(true);
    });
  });

  describe('createSerializer', () => {
    let schema, serializer;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'aModel' }],
      });
      serializer = schema.createSerializer({ name: 'aSerializer' });
    });

    it('creates the appropriate serializer', () => {
      expect(schema.getSerializer('aSerializer')).toBe(serializer);
    });
  });

  describe('getSerializer', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'aModel' }],
        serializers: [{ name: 'aSerializer' }],
      });
    });

    it('returns the model if it exists', () => {
      expect(schema.getSerializer('aSerializer').name).toBe('aSerializer');
    });

    it('returns undefined if the serializer does not exist', () => {
      expect(schema.getSerializer('bSerializer')).toBeUndefined();
    });
  });

  describe('get', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
        name: 'test',
        models: [{ name: 'aModel' }, { name: 'bModel' }],
      });

      schema.getModel('aModel').createRecord({
        id: 'a',
      });
      schema.getModel('bModel').createRecord({
        id: '0',
      });
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
      expect(schema.get('bModel.0').id).toBe('0');
    });

    it('throws if queried with a non-existent record followed by a field name', () => {
      expect(() => schema.get('aModel.c.name')).toThrow();
    });

    it('returns the field if it exists', () => {
      expect(schema.get('aModel.a.id')).toBe('a');
      expect(schema.get('bModel.0.id')).toBe('0');
    });
  });
});
