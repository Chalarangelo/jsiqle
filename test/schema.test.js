import { Schema } from 'src/schema';
import { Model } from 'src/model';
import symbols from 'src/symbols';

const { $instances, $fields, $properties, $clearSchemaForTesting } = symbols;

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
    Schema[$clearSchemaForTesting]();
  });

  it('throws if a model contains invalid or duplicate fields, properties or methods', () => {
    expect(() =>
      Schema.create({
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

    it('creates a schema with the appropriate models', () => {
      expect(schema.models.has('aModel')).toBe(true);
    });

    it('creates a schema with the appropriate config', () => {
      expect(Schema.config.experimentalAPIMessages).toBe('off');
    });

    it('creates lazy properties and methods correctly', () => {
      let count = 0;
      Schema[$clearSchemaForTesting]();
      schema = Schema.create({
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
      Schema[$clearSchemaForTesting]();
      schema = Schema.create({
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

  describe('#createModel', () => {
    it('throws the model name is invalid', () => {
      expect(() => Schema.create({ models: [{ name: null }] })).toThrow();
      expect(() => Schema.create({ models: [{ name: undefined }] })).toThrow();
      expect(() => Schema.create({ models: [{ name: '' }] })).toThrow();
      expect(() => Schema.create({ models: [{ name: ' ' }] })).toThrow();
      expect(() => Schema.create({ models: [{ name: '1' }] })).toThrow();
      expect(() => Schema.create({ models: [{ name: 'a&1*b' }] })).toThrow();
    });
  });

  describe('getModel', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
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

  describe('#createRelationship', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
        models: [{ name: 'aModel' }, { name: 'bModel' }],
        relationships: [
          {
            from: 'aModel',
            to: 'bModel',
            type: 'oneToOne',
          },
          {
            from: { model: 'bModel', name: 'parent' },
            to: { model: 'aModel', name: 'children' },
            type: 'manyToOne',
          },
        ],
      });
    });

    it('throws if the any of the models is of an invalid type', () => {
      expect(() =>
        Schema.create({
          models: [{ name: 'aModel' }, { name: 'bModel' }],
          relationships: [
            {
              from: 1,
              to: 'bModel',
              type: 'oneToOne',
            },
          ],
        })
      ).toThrow();
      expect(() =>
        Schema.create({
          models: [{ name: 'aModel' }, { name: 'bModel' }],
          relationships: [
            {
              from: 'aModel',
              to: 2,
              type: 'oneToOne',
            },
          ],
        })
      ).toThrow();
    });

    it('throws if any of the models does not exist', () => {
      expect(() =>
        Schema.create({
          models: [{ name: 'aModel' }, { name: 'bModel' }],
          relationships: [
            {
              from: 'cModel',
              to: 'bModel',
              type: 'oneToOne',
            },
          ],
        })
      ).toThrow();
      expect(() =>
        Schema.create({
          models: [{ name: 'aModel' }, { name: 'bModel' }],
          relationships: [
            {
              from: 'aModel',
              to: 'cModel',
              type: 'oneToOne',
            },
          ],
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

  describe('#createSerializer', () => {
    beforeEach(() => {
      Schema.create({
        models: [{ name: 'aModel' }],
      });
    });

    it('throws if the serializer name is invalid', () => {
      expect(() => Schema.create({ serializers: [{ name: 1 }] })).toThrow();
      expect(() => Schema.create({ serializers: [{ name: null }] })).toThrow();
      expect(() =>
        Schema.create({ serializers: [{ name: undefined }] })
      ).toThrow();
      expect(() => Schema.create({ serializers: [{ name: '' }] })).toThrow();
      expect(() => Schema.create({ serializers: [{ name: ' ' }] })).toThrow();
      expect(() => Schema.create({ serializers: [{ name: '1' }] })).toThrow();
      expect(() =>
        Schema.create({ serializers: [{ name: 'a&1*b' }] })
      ).toThrow();
    });
  });

  describe('getSerializer', () => {
    let schema;

    beforeEach(() => {
      schema = Schema.create({
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
