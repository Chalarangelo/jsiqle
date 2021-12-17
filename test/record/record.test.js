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
      key: 'id',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'age', type: 'number' },
      ],
      properties: {
        firstName: rec => rec.name.split(' ')[0],
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
  });

  it('gets serialized correctly', () => {
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });
    expect(record.toObject()).toEqual({
      id: 'jd',
      name: 'John Doe',
      age: 42,
    });
  });

  it('gets serialized correctly with custom includes', () => {
    let otherModel = schema.createModel({
      name: 'bModel',
      fields: [{ name: 'data', type: 'string' }],
    });
    schema.createRelationship({
      from: 'aModel',
      to: 'bModel',
      type: 'oneToOne',
    });
    const record = model.createRecord({ id: 'jd', name: 'John Doe', age: 42 });

    expect(record.toObject({ include: ['firstName'] })).toEqual({
      id: 'jd',
      name: 'John Doe',
      age: 42,
      firstName: 'John',
    });

    const otherRecord = otherModel.createRecord({ id: 'b', data: 'b data' });
    record.bModel = otherRecord.id;

    expect(record.toObject({ include: ['bModel'] })).toEqual({
      id: 'jd',
      name: 'John Doe',
      age: 42,
      bModel: {
        data: 'b data',
        id: 'b',
      },
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
});
