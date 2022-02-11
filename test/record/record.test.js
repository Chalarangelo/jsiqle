import { Model } from 'src/model';
import { Record } from 'src/record';
import symbols from 'src/symbols';
import Schema from '../../src/schema';

const { $instances } = symbols;

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
    schema = new Schema({ name: 'test' });
    model = schema.createModel({
      name: 'aModel',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'age', type: 'number' },
      ],
      properties: {
        firstName: rec => rec.name.split(' ')[0],
      },
      methods: {
        prefixedName: (rec, prefix) => `${prefix} ${rec.name}`,
      },
      validators: {
        nameNotSameAsId: rec => rec.name !== rec.id,
      },
    });
  });

  afterEach(() => {
    // Cleanup to avoid instances leaking to other tests
    Model[$instances].clear();
  });

  it('a record is returned from Model.prototype.createRecord()', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(record).toBeInstanceOf(Record);
  });

  it('throws if a record created by Model.prototype.createRecord() fails validation', () => {
    expect(() => model.createRecord({ id: 'jd', name: 5, age: 42 })).toThrow();
    expect(() =>
      model.createRecord({ id: 'John', name: 'John', age: 42 })
    ).toThrow();
  });

  it('getting/setting on a record goes through the RecordHandler', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(record.firstName).toBe('John');
    expect(() => (record.name = 5)).toThrow();
    expect(() => (record.firstName = null)).toThrow();
    expect(() => (record.name = 'jd')).toThrow();
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

  it('returns the key value when called with toString', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(record.toString()).toBe('jd');
  });

  describe('with property caches', () => {
    let propertyCalls = 0;
    let record;

    beforeEach(() => {
      model = schema.createModel({
        name: 'bModel',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'age', type: 'number' },
        ],
        properties: {
          firstName: {
            body: rec => {
              propertyCalls++;
              return rec.name.split(' ')[0];
            },
            cache: true,
          },
        },
      });
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
