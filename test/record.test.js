import { Model } from '../src/model.js';
import Record from '../src/record.js';
import symbols from '../src/symbols.js';
import Schema from '../src/schema.js';

const { $instances, $clearSchemaForTesting } = symbols;

// Indirectly check the record handler here, too.
// Records are only ever accessed by proxy.
describe('Record', () => {
  let consoleWarn = console.warn;

  beforeAll(() => {
    global.console.warn = jest.fn();
    Schema.config.experimentalAPIMessages = 'off';
  });

  afterAll(() => {
    global.console.warn = consoleWarn;
    Schema.config.experimentalAPIMessages = 'warn';
  });

  let model;
  let schema;

  beforeEach(() => {
    schema = Schema.create({
      models: [
        {
          name: 'aModel',
          fields: { name: 'string', age: 'number' },
          properties: {
            firstName: rec => rec.name.split(' ')[0],
          },
          methods: {
            prefixedName: (rec, prefix) => `${prefix} ${rec.name}`,
          },
        },
      ],
    });
    model = schema.getModel('aModel');
  });

  afterEach(() => {
    // Cleanup to avoid instances leaking to other tests
    Model[$instances].clear();
    Schema[$clearSchemaForTesting]();
  });

  it('a record is returned from Model.prototype.createRecord()', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(record).toBeInstanceOf(Record);
  });

  it('getting/setting on a record goes through the RecordHandler', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(record.firstName).toBe('John');
    expect(() => (record.name = 5)).toThrow();
    expect(() => (record.firstName = null)).toThrow();
    expect(() => (record.prefixedName = 'jd')).toThrow();
  });

  it('gets serialized correctly', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(record.toObject()).toEqual({
      id: 'jd',
      name: 'John Doe',
      age: 42,
    });
  });

  it('calling JSON.stringify() returns the correct result', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(JSON.stringify(record)).toBe(
      '{"id":"jd","name":"John Doe","age":42}'
    );
  });

  it('returns the id when called with toString', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(record.toString()).toBe('jd');
  });

  describe('with property caches', () => {
    let propertyCalls = 0;
    let record;

    beforeEach(() => {
      Schema[$clearSchemaForTesting]();
      schema.create({
        models: [
          {
            name: 'bModel',
            fields: { name: 'string', age: 'number' },
            properties: {
              firstName: {
                body: rec => {
                  propertyCalls++;
                  return rec.name.split(' ')[0];
                },
                cache: true,
              },
            },
          },
        ],
      });
      model = schema.getModel('bModel');
      record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
      propertyCalls = 0;
    });

    it('calculates the property value only the first time', () => {
      expect(record.firstName).toBe('John');
      expect(propertyCalls).toBe(1);
      expect(record.firstName).toBe('John');
      expect(propertyCalls).toBe(1);
    });

    it('recalculates the propertyvalue if any field changes', () => {
      expect(record.firstName).toBe('John');
      expect(propertyCalls).toBe(1);
      record.name = 'Jane Doe';
      expect(record.firstName).toBe('Jane');
      expect(propertyCalls).toBe(2);
    });
  });
});
