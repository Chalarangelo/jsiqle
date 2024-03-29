import { describe, it, beforeEach, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Model } from '../src/model.js';
import symbols from '../src/symbols.js';
import Schema from '../src/schema.js';

const { $instances, $clearSchemaForTesting, $clearRecordSetForTesting } =
  symbols;

// Indirectly check other record-related classes, too.
describe('RecordSet', () => {
  let consoleWarn = console.warn;

  beforeAll(() => {
    global.console.warn = () => {};
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
          name: 'person',
          fields: { name: 'string', age: 'number' },
          properties: {
            firstName: rec => rec.name.split(' ')[0],
            lastName: rec => rec.name.split(' ')[1],
          },
          scopes: {
            adults: record => record.age >= 18,
          },
        },
      ],
    });
    model = schema.getModel('person');

    model.createRecord({
      id: '0',
      name: 'John Doe',
      age: 42,
    });
    model.createRecord({
      id: '1',
      name: 'Jane Doe',
      age: 34,
    });
    model.createRecord({
      id: '2',
      name: 'John Smith',
      age: 34,
    });
    model.createRecord({
      id: '3',
      name: 'Jane Smith',
      age: 15,
    });
  });

  afterEach(() => {
    // Cleanup to avoid instances leaking to other tests
    Model[$instances].clear();
    Schema[$clearSchemaForTesting]();
  });

  describe('first', () => {
    it('should return the first record', () => {
      expect(model.records.first.name).toBe('John Doe');
    });

    it('should return null if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.first).toBeUndefined();
    });
  });

  describe('last', () => {
    it('should return the last record', () => {
      expect(model.records.last.name).toBe('Jane Smith');
    });

    it('should return null if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.last).toBeUndefined();
    });
  });

  describe('count', () => {
    it('should return the number of records', () => {
      expect(model.records.count).toBe(4);
    });

    it('should return 0 if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.count).toBe(0);
    });
  });

  describe('length', () => {
    it('should return the number of records', () => {
      expect(model.records.length).toBe(4);
    });

    it('should return 0 if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.length).toBe(0);
    });
  });

  describe('set', () => {
    it('should throw', () => {
      expect(() => model.records.set(1, null)).toThrow();
    });
  });

  describe('delete', () => {
    it('should throw', () => {
      expect(() => model.records.delete(1)).toThrow();
    });
  });

  describe('clear', () => {
    it('should throw', () => {
      expect(() => model.records.clear()).toThrow();
    });
  });

  describe('map', () => {
    it('should map over the records', () => {
      const result = model.records.map(rec => rec.age);
      expect(result).toEqual({ 0: 42, 1: 34, 2: 34, 3: 15 });
    });

    it('should return an empty object if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.map(rec => rec.age)).toEqual({});
    });

    describe('when flat is true', () => {
      it('should flat map over the records', () => {
        const result = model.records.map(rec => rec.age, { flat: true });
        expect(result).toEqual([42, 34, 34, 15]);
      });

      it('should return an empty array if no records', () => {
        model.records[$clearRecordSetForTesting]();
        expect(model.records.map(rec => rec.age, { flat: true })).toEqual([]);
      });
    });
  });

  describe('reduce', () => {
    it('should reduce over the records', () => {
      const result = model.records.reduce((acc, rec) => acc + rec.age, 0);
      expect(result).toBe(125);
    });

    it('should return the initial value if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.reduce((acc, rec) => acc + rec.age, 0)).toBe(0);
    });
  });

  describe('filter', () => {
    it('should filter over the records', () => {
      const result = model.records.filter(rec => rec.age >= 18);
      expect(result.count).toBe(3);
    });

    it('should return an empty record set if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.filter(rec => rec.age >= 18).count).toBe(0);
    });

    describe('when flat is true', () => {
      it('should filter over the records', () => {
        const result = model.records.filter(rec => rec.age >= 18, {
          flat: true,
        });
        expect(result.length).toEqual(3);
      });

      it('should return an empty array if no records', () => {
        model.records[$clearRecordSetForTesting]();
        expect(
          model.records.filter(rec => rec.age >= 18, { flat: true })
        ).toEqual([]);
      });
    });
  });

  describe('find', () => {
    it('should find a record', () => {
      expect(model.records.find(rec => rec.age === 42).name).toBe('John Doe');
    });

    it('should return undefined if no record found', () => {
      expect(model.records.find(rec => rec.age === 0)).toBeUndefined();
    });
  });

  describe('findId', () => {
    it('should find a record', () => {
      expect(model.records.findId(rec => rec.age === 42)).toBe('0');
    });

    it('should return undefined if no record found', () => {
      expect(model.records.findId(rec => rec.age === 0)).toBeUndefined();
    });
  });

  describe('only', () => {
    it('should return a record set with only the given ids', () => {
      const result = model.records.only('0', '1');
      expect(result.count).toBe(2);
      expect(result.first.name).toBe('John Doe');
      expect(result.last.name).toBe('Jane Doe');
    });

    it('should return a record set with only the given ids in the correct order', () => {
      const result = model.records.only('1', '0');
      expect(result.count).toBe(2);
      expect(result.first.name).toBe('Jane Doe');
      expect(result.last.name).toBe('John Doe');
    });

    it('should return an empty record set if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.except('0', '1').count).toBe(0);
    });
  });

  describe('except', () => {
    it('should return a record set with the given ids removed', () => {
      const result = model.records.except('0', '1');
      expect(result.count).toBe(2);
      expect(result.first.name).toBe('John Smith');
      expect(result.last.name).toBe('Jane Smith');
    });

    it('should return an empty record set if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.except('0', '1').count).toBe(0);
    });
  });

  describe('sort', () => {
    it('should sort the records', () => {
      const result = model.records.sort((a, b) => a.age - b.age);
      expect(result.first.age).toBe(15);
      expect(result.last.age).toBe(42);
    });
  });

  describe('every', () => {
    it('should return true if all records match the predicate', () => {
      expect(model.records.every(rec => rec.age >= 10)).toBe(true);
    });

    it('should return false if any record does not match the predicate', () => {
      expect(model.records.every(rec => rec.age >= 20)).toBe(false);
    });

    it('should return true if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.every(rec => rec.age >= 18)).toBe(true);
    });
  });

  describe('some', () => {
    it('should return true if any record matches the predicate', () => {
      expect(model.records.some(rec => rec.age >= 18)).toBe(true);
    });

    it('should return false if no records match the predicate', () => {
      expect(model.records.some(rec => rec.age >= 60)).toBe(false);
    });

    it('should return false if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.some(rec => rec.age >= 18)).toBe(false);
    });
  });

  describe('select', () => {
    it('should return an array of objects', () => {
      const result = model.records.select('age');
      expect(result).toEqual([
        { age: 42 },
        { age: 34 },
        { age: 34 },
        { age: 15 },
      ]);
    });
  });

  describe('pluck', () => {
    it('should return an array of arrays of values for multiple keys', () => {
      const result = model.records.pluck('age', 'name');
      expect(result).toEqual([
        [42, 'John Doe'],
        [34, 'Jane Doe'],
        [34, 'John Smith'],
        [15, 'Jane Smith'],
      ]);
    });

    it('should return an array of values for a single key', () => {
      const result = model.records.pluck('age');
      expect(result).toEqual([42, 34, 34, 15]);
    });
  });

  describe('groupBy', () => {
    it('should group the records by the given key', () => {
      const result = Object.entries(model.records.groupBy('age')).reduce(
        (acc, [key, value]) => {
          acc[key] = value.toArray({ flat: true });
          return acc;
        },
        {}
      );
      expect(result).toEqual({
        15: [{ id: '3', age: 15, name: 'Jane Smith' }],
        34: [
          { id: '1', age: 34, name: 'Jane Doe' },
          { id: '2', age: 34, name: 'John Smith' },
        ],
        42: [{ id: '0', age: 42, name: 'John Doe' }],
      });
    });
  });

  describe('where', () => {
    it('should filter over the records', () => {
      const result = model.records.where(rec => rec.age >= 18);
      expect(result.count).toBe(3);
    });

    it('should return an empty record set if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.where(rec => rec.age >= 18).count).toBe(0);
    });
  });

  describe('whereNot', () => {
    it('should filter over the records', () => {
      const result = model.records.whereNot(rec => rec.age >= 18);
      expect(result.count).toBe(1);
    });

    it('should return an empty record set if no records', () => {
      model.records[$clearRecordSetForTesting]();
      expect(model.records.whereNot(rec => rec.age >= 18).count).toBe(0);
    });
  });

  describe('batchIterator', () => {
    it('should iterate over the records', () => {
      const result = model.records.batchIterator(2);
      expect(result.next().value.pluck('name')).toEqual([
        'John Doe',
        'Jane Doe',
      ]);
      expect(result.next().value.pluck('name')).toEqual([
        'John Smith',
        'Jane Smith',
      ]);
      expect(result.next().value).toEqual(undefined);
    });

    it('should return the last batch with however many elements are left', () => {
      const result = model.records.batchIterator(3);
      expect(result.next().value.pluck('name')).toEqual([
        'John Doe',
        'Jane Doe',
        'John Smith',
      ]);
      expect(result.next().value.pluck('name')).toEqual(['Jane Smith']);
      expect(result.next().value).toEqual(undefined);
    });

    describe('when flat is true', () => {
      it('should iterate over the records', () => {
        const result = model.records.batchIterator(2, { flat: true });
        expect(result.next().value.map(v => v.name)).toEqual([
          'John Doe',
          'Jane Doe',
        ]);
        expect(result.next().value.map(v => v.name)).toEqual([
          'John Smith',
          'Jane Smith',
        ]);
        expect(result.next().value).toEqual(undefined);
      });

      it('should return the last batch with however many elements are left', () => {
        const result = model.records.batchIterator(3, { flat: true });
        expect(result.next().value.map(v => v.name)).toEqual([
          'John Doe',
          'Jane Doe',
          'John Smith',
        ]);
        expect(result.next().value.map(v => v.name)).toEqual(['Jane Smith']);
        expect(result.next().value).toEqual(undefined);
      });
    });
  });

  describe('limit', () => {
    it('should return the first n records from the record set', () => {
      const result = model.records.limit(2);
      expect(result.count).toBe(2);
      expect(result.first.name).toBe('John Doe');
      expect(result.last.name).toBe('Jane Doe');
    });
  });

  describe('offset', () => {
    it('should return the records after the offset', () => {
      const result = model.records.offset(2);
      expect(result.count).toBe(2);
      expect(result.first.name).toBe('John Smith');
      expect(result.last.name).toBe('Jane Smith');
    });
  });

  describe('slice', () => {
    it('should return the correct slice with only a start', () => {
      expect(model.records.slice(2).pluck('name')).toEqual([
        'John Smith',
        'Jane Smith',
      ]);
      expect(model.records.slice(0).pluck('name')).toEqual([
        'John Doe',
        'Jane Doe',
        'John Smith',
        'Jane Smith',
      ]);
      expect(model.records.slice(4).pluck('name')).toEqual([]);
      expect(model.records.slice(5).pluck('name')).toEqual([]);
      expect(model.records.slice(-1).pluck('name')).toEqual(['Jane Smith']);
    });

    it('should return the correct slice with a start and end', () => {
      expect(model.records.slice(2, 4).pluck('name')).toEqual([
        'John Smith',
        'Jane Smith',
      ]);
      expect(model.records.slice(0, 2).pluck('name')).toEqual([
        'John Doe',
        'Jane Doe',
      ]);
      expect(model.records.slice(4, 5).pluck('name')).toEqual([]);
      expect(model.records.slice(5, 6).pluck('name')).toEqual([]);
      expect(model.records.slice(-3, 3).pluck('name')).toEqual([
        'Jane Doe',
        'John Smith',
      ]);
    });
  });

  describe('toArray', () => {
    it('should return an array of the records', () => {
      expect(model.records.toArray().map(v => v.age)).toEqual([42, 34, 34, 15]);
    });

    describe('when flat is true', () => {
      it('returns an array of objects', () => {
        expect(model.records.toArray({ flat: true })).toEqual([
          { id: '0', name: 'John Doe', age: 42 },
          { id: '1', name: 'Jane Doe', age: 34 },
          { id: '2', name: 'John Smith', age: 34 },
          { id: '3', name: 'Jane Smith', age: 15 },
        ]);
      });
    });
  });

  describe('toObject', () => {
    it('should return an object of the records', () => {
      expect(JSON.stringify(model.records.toObject())).toEqual(
        JSON.stringify({
          0: { id: '0', name: 'John Doe', age: 42 },
          1: { id: '1', name: 'Jane Doe', age: 34 },
          2: { id: '2', name: 'John Smith', age: 34 },
          3: { id: '3', name: 'Jane Smith', age: 15 },
        })
      );
    });

    describe('when flat is true', () => {
      it('should return an object of objects', () => {
        expect(model.records.toObject({ flat: true })).toEqual({
          0: { id: '0', name: 'John Doe', age: 42 },
          1: { id: '1', name: 'Jane Doe', age: 34 },
          2: { id: '2', name: 'John Smith', age: 34 },
          3: { id: '3', name: 'Jane Smith', age: 15 },
        });
      });
    });
  });

  describe('toJSON', () => {
    it('should return an object of the records', () => {
      expect(JSON.stringify(model.records.toJSON())).toEqual(
        JSON.stringify({
          0: { id: '0', name: 'John Doe', age: 42 },
          1: { id: '1', name: 'Jane Doe', age: 34 },
          2: { id: '2', name: 'John Smith', age: 34 },
          3: { id: '3', name: 'Jane Smith', age: 15 },
        })
      );
    });
  });

  describe('#copyScopesFromModel', () => {
    it('should copy scopes when a new recordSet is created', () => {
      const newRecordSet = model.records.limit(4);
      expect(newRecordSet.adults.count).toBe(3);
    });
  });
});
