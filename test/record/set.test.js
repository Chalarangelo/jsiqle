import { Model } from 'src/model';
import symbols from 'src/symbols';
import Schema from '../../src/schema';

const { $instances } = symbols;

// Indirectly check other record-related classes, too.
describe('RecordSet', () => {
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
      name: 'person',
      fields: [
        { name: 'name', type: 'string' },
        { name: 'age', type: 'number' },
      ],
      properties: {
        firstName: rec => rec.name.split(' ')[0],
        lastName: rec => rec.name.split(' ')[1],
      },
      scopes: {
        adults: record => record.age >= 18,
      },
    });

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
  });

  describe('first', () => {
    it('should return the first record', () => {
      expect(model.records.first.name).toBe('John Doe');
    });

    it('should return null if no records', () => {
      model.records.clear();
      expect(model.records.first).toBeUndefined();
    });
  });

  describe('last', () => {
    it('should return the last record', () => {
      expect(model.records.last.name).toBe('Jane Smith');
    });

    it('should return null if no records', () => {
      model.records.clear();
      expect(model.records.last).toBeUndefined();
    });
  });

  describe('count', () => {
    it('should return the number of records', () => {
      expect(model.records.count).toBe(4);
    });

    it('should return 0 if no records', () => {
      model.records.clear();
      expect(model.records.count).toBe(0);
    });
  });

  describe('length', () => {
    it('should return the number of records', () => {
      expect(model.records.length).toBe(4);
    });

    it('should return 0 if no records', () => {
      model.records.clear();
      expect(model.records.length).toBe(0);
    });
  });

  describe('freeze', () => {
    it('should throw when mutating the record set', () => {
      model.records.freeze();
      expect(() => model.records.set(1, null)).toThrow();
      expect(() => model.records.delete(1)).toThrow();
      expect(() => model.records.clear()).toThrow();
    });
  });

  describe('set', () => {
    // This is experimental, might have to update it later down the line.
    it('should set a record', () => {
      model.records.set(1, { name: 'Jane Smith', age: 15 });
      expect(model.records.last.name).toBe('Jane Smith');
    });

    it('should throw if record set is frozen', () => {
      model.records.freeze();
      expect(() =>
        model.records.set(1, { name: 'Jane Smith', age: 15 })
      ).toThrow();
    });
  });

  describe('delete', () => {
    it('should delete a record', () => {
      expect(model.records.count).toBe(4);
      model.records.delete('1');
      expect(model.records.count).toBe(3);
    });

    it('should throw if record set is frozen', () => {
      model.records.freeze();
      expect(() => model.records.delete(1)).toThrow();
    });
  });

  describe('clear', () => {
    it('should clear the record set', () => {
      expect(model.records.count).toBe(4);
      model.records.clear();
      expect(model.records.count).toBe(0);
    });

    it('should throw if record set is frozen', () => {
      model.records.freeze();
      expect(() => model.records.clear()).toThrow();
    });
  });

  describe('map', () => {
    it('should map over the records', () => {
      const result = model.records.map(rec => rec.age);
      expect(result).toEqual({ 0: 42, 1: 34, 2: 34, 3: 15 });
    });

    it('should return an empty object if no records', () => {
      model.records.clear();
      expect(model.records.map(rec => rec.age)).toEqual({});
    });
  });

  describe('flatMap', () => {
    it('should flatMap over the records', () => {
      const result = model.records.flatMap(rec => rec.age);
      expect(result).toEqual([42, 34, 34, 15]);
    });

    it('should return an empty array if no records', () => {
      model.records.clear();
      expect(model.records.flatMap(rec => rec.age)).toEqual([]);
    });
  });

  describe('reduce', () => {
    it('should reduce over the records', () => {
      const result = model.records.reduce((acc, rec) => acc + rec.age, 0);
      expect(result).toBe(125);
    });

    it('should return the initial value if no records', () => {
      model.records.clear();
      expect(model.records.reduce((acc, rec) => acc + rec.age, 0)).toBe(0);
    });
  });

  describe('filter', () => {
    it('should filter over the records', () => {
      const result = model.records.filter(rec => rec.age >= 18);
      expect(result.count).toBe(3);
    });

    it('should return an empty record set if no records', () => {
      model.records.clear();
      expect(model.records.filter(rec => rec.age >= 18).count).toBe(0);
    });
  });

  describe('flatFilter', () => {
    it('should filter over the records', () => {
      const result = model.records.flatFilter(rec => rec.age >= 18);
      expect(result.length).toEqual(3);
    });

    it('should return an empty array if no records', () => {
      model.records.clear();
      expect(model.records.flatFilter(rec => rec.age >= 18)).toEqual([]);
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

  describe('findKey', () => {
    it('should find a record', () => {
      expect(model.records.findKey(rec => rec.age === 42)).toBe('0');
    });

    it('should return undefined if no record found', () => {
      expect(model.records.findKey(rec => rec.age === 0)).toBeUndefined();
    });
  });

  describe('only', () => {
    it('should return a record set with only the given keys', () => {
      const result = model.records.only('0', '1');
      expect(result.count).toBe(2);
      expect(result.first.name).toBe('John Doe');
      expect(result.last.name).toBe('Jane Doe');
    });

    it('should return a record set with only the given keys in the correct order', () => {
      const result = model.records.only('1', '0');
      expect(result.count).toBe(2);
      expect(result.first.name).toBe('Jane Doe');
      expect(result.last.name).toBe('John Doe');
    });

    it('should return an empty record set if no records', () => {
      model.records.clear();
      expect(model.records.except('0', '1').count).toBe(0);
    });
  });

  describe('except', () => {
    it('should return a record set with the given keys removed', () => {
      const result = model.records.except('0', '1');
      expect(result.count).toBe(2);
      expect(result.first.name).toBe('John Smith');
      expect(result.last.name).toBe('Jane Smith');
    });

    it('should return an empty record set if no records', () => {
      model.records.clear();
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
      model.records.clear();
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
      model.records.clear();
      expect(model.records.some(rec => rec.age >= 18)).toBe(false);
    });
  });

  describe('select', () => {
    it('should return a record set of partial records', () => {
      const result = model.records.select('age');
      expect(result.first.name).toBe(undefined);
      expect(result.first.age).toBe(42);
    });
  });

  describe('flatSelect', () => {
    it('should return an array of objects', () => {
      const result = model.records.flatSelect('age');
      expect(result).toEqual([
        { age: 42 },
        { age: 34 },
        { age: 34 },
        { age: 15 },
      ]);
    });
  });

  describe('pluck', () => {
    it('should return an record set of record fragments', () => {
      const result = model.records.pluck('age');
      expect(result.toFlatArray()).toEqual([[42], [34], [34], [15]]);
    });
  });

  describe('flatPluck', () => {
    it('should return an array of arrays of values for multiple keys', () => {
      const result = model.records.flatPluck('age', 'name');
      expect(result).toEqual([
        [42, 'John Doe'],
        [34, 'Jane Doe'],
        [34, 'John Smith'],
        [15, 'Jane Smith'],
      ]);
    });

    it('should return an array of values for a single key', () => {
      const result = model.records.flatPluck('age');
      expect(result).toEqual([42, 34, 34, 15]);
    });
  });

  describe('groupBy', () => {
    it('should group the records by the given key', () => {
      const result = model.records.groupBy('age');
      expect(result.toFlatObject()).toEqual({
        15: [{ id: '3', age: 15, name: 'Jane Smith' }],
        34: [
          { id: '1', age: 34, name: 'Jane Doe' },
          { id: '2', age: 34, name: 'John Smith' },
        ],
        42: [{ id: '0', age: 42, name: 'John Doe' }],
      });
    });
  });

  describe('duplicate', () => {
    it('should duplicate the record set', () => {
      const result = model.records.duplicate();
      expect(result.count).toBe(4);
      expect(result.first.id).toBe('0');
      expect(result.last.id).toBe('3');
      expect(result).not.toBe(model.records);
    });
  });

  describe('merge', () => {
    it('should merge the record sets', () => {
      const r1 = model.records.limit(2);
      const r2 = model.records.offset(2).limit(1);
      const result = r1.merge(r2);
      expect(result.count).toBe(3);
      expect(result.first.id).toBe('0');
      expect(result.last.id).toBe('2');
    });
  });

  describe('append', () => {
    it('should append the records', () => {
      const r1 = model.records.limit(2);
      const r = model.records.last;
      const result = r1.append(r);
      expect(result.count).toBe(3);
      expect(result.first.id).toBe('0');
      expect(result.last.id).toBe('3');
    });
  });

  describe('where', () => {
    it('should filter over the records', () => {
      const result = model.records.where(rec => rec.age >= 18);
      expect(result.count).toBe(3);
    });

    it('should return an empty record set if no records', () => {
      model.records.clear();
      expect(model.records.where(rec => rec.age >= 18).count).toBe(0);
    });
  });

  describe('whereNot', () => {
    it('should filter over the records', () => {
      const result = model.records.whereNot(rec => rec.age >= 18);
      expect(result.count).toBe(1);
    });

    it('should return an empty record set if no records', () => {
      model.records.clear();
      expect(model.records.whereNot(rec => rec.age >= 18).count).toBe(0);
    });
  });

  describe('flatBatchIterator', () => {
    it('should iterate over the records', () => {
      const result = model.records.flatBatchIterator(2);
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
      const result = model.records.flatBatchIterator(3);
      expect(result.next().value.map(v => v.name)).toEqual([
        'John Doe',
        'Jane Doe',
        'John Smith',
      ]);
      expect(result.next().value.map(v => v.name)).toEqual(['Jane Smith']);
      expect(result.next().value).toEqual(undefined);
    });
  });

  describe('flatBatchKeysIterator', () => {
    it('should iterate over the records', () => {
      const result = model.records.flatBatchKeysIterator(2);
      expect(result.next().value).toEqual(['0', '1']);
      expect(result.next().value).toEqual(['2', '3']);
      expect(result.next().value).toEqual(undefined);
    });

    it('should return the last batch with however many elements are left', () => {
      const result = model.records.flatBatchKeysIterator(3);
      expect(result.next().value).toEqual(['0', '1', '2']);
      expect(result.next().value).toEqual(['3']);
      expect(result.next().value).toEqual(undefined);
    });
  });

  describe('batchIterator', () => {
    it('should iterate over the records', () => {
      const result = model.records.batchIterator(2);
      expect(result.next().value.flatPluck('name')).toEqual([
        'John Doe',
        'Jane Doe',
      ]);
      expect(result.next().value.flatPluck('name')).toEqual([
        'John Smith',
        'Jane Smith',
      ]);
      expect(result.next().value).toEqual(undefined);
    });

    it('should return the last batch with however many elements are left', () => {
      const result = model.records.batchIterator(3);
      expect(result.next().value.flatPluck('name')).toEqual([
        'John Doe',
        'Jane Doe',
        'John Smith',
      ]);
      expect(result.next().value.flatPluck('name')).toEqual(['Jane Smith']);
      expect(result.next().value).toEqual(undefined);
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
      expect(model.records.slice(2).flatPluck('name')).toEqual([
        'John Smith',
        'Jane Smith',
      ]);
      expect(model.records.slice(0).flatPluck('name')).toEqual([
        'John Doe',
        'Jane Doe',
        'John Smith',
        'Jane Smith',
      ]);
      expect(model.records.slice(4).flatPluck('name')).toEqual([]);
      expect(model.records.slice(5).flatPluck('name')).toEqual([]);
      expect(model.records.slice(-1).flatPluck('name')).toEqual(['Jane Smith']);
    });

    it('should return the correct slice with a start and end', () => {
      expect(model.records.slice(2, 4).flatPluck('name')).toEqual([
        'John Smith',
        'Jane Smith',
      ]);
      expect(model.records.slice(0, 2).flatPluck('name')).toEqual([
        'John Doe',
        'Jane Doe',
      ]);
      expect(model.records.slice(4, 5).flatPluck('name')).toEqual([]);
      expect(model.records.slice(5, 6).flatPluck('name')).toEqual([]);
      expect(model.records.slice(-3, 3).flatPluck('name')).toEqual([
        'Jane Doe',
        'John Smith',
      ]);
    });
  });

  describe('toArray', () => {
    it('should return an array of the records', () => {
      const partialsSet = model.records.select('age');
      const fragmentsSet = model.records.pluck('age');
      const groupSet = model.records.groupBy('age');

      expect(model.records.toArray().map(v => v.age)).toEqual([42, 34, 34, 15]);
      expect(partialsSet.toArray().map(v => v.age)).toEqual([42, 34, 34, 15]);
      expect(fragmentsSet.toArray().map(v => v[0])).toEqual([42, 34, 34, 15]);
      expect(groupSet.toArray().map(v => v.toArray().map(v => v.age))).toEqual([
        [42],
        [34, 34],
        [15],
      ]);
    });
  });

  describe('toFlatArray', () => {
    it('returns an array of objects', () => {
      const partialsSet = model.records.select('age');
      const fragmentsSet = model.records.pluck('age');
      const groupSet = model.records.groupBy('age');

      expect(model.records.toFlatArray()).toEqual([
        { id: '0', name: 'John Doe', age: 42 },
        { id: '1', name: 'Jane Doe', age: 34 },
        { id: '2', name: 'John Smith', age: 34 },
        { id: '3', name: 'Jane Smith', age: 15 },
      ]);
      expect(partialsSet.toFlatArray()).toEqual([
        { age: 42 },
        { age: 34 },
        { age: 34 },
        { age: 15 },
      ]);
      expect(fragmentsSet.toFlatArray()).toEqual([[42], [34], [34], [15]]);
      expect(groupSet.toFlatArray()).toEqual([
        [{ id: '0', name: 'John Doe', age: 42 }],
        [
          { id: '1', name: 'Jane Doe', age: 34 },
          { id: '2', name: 'John Smith', age: 34 },
        ],
        [{ id: '3', name: 'Jane Smith', age: 15 }],
      ]);
    });
  });

  describe('toObject', () => {
    it('should return an object of the records', () => {
      const partialsSet = model.records.select('age');
      const fragmentsSet = model.records.pluck('age');
      const groupSet = model.records.groupBy('age');

      expect(JSON.stringify(model.records.toObject())).toEqual(
        JSON.stringify({
          0: { id: '0', name: 'John Doe', age: 42 },
          1: { id: '1', name: 'Jane Doe', age: 34 },
          2: { id: '2', name: 'John Smith', age: 34 },
          3: { id: '3', name: 'Jane Smith', age: 15 },
        })
      );
      expect(JSON.stringify(partialsSet.toObject())).toEqual(
        JSON.stringify({
          0: { age: 42 },
          1: { age: 34 },
          2: { age: 34 },
          3: { age: 15 },
        })
      );
      expect(JSON.stringify(fragmentsSet.toObject())).toEqual(
        JSON.stringify({ 0: [42], 1: [34], 2: [34], 3: [15] })
      );
      expect(JSON.stringify(groupSet.toObject())).toEqual(
        JSON.stringify({
          42: { 0: { id: '0', name: 'John Doe', age: 42 } },
          34: {
            1: { id: '1', name: 'Jane Doe', age: 34 },
            2: { id: '2', name: 'John Smith', age: 34 },
          },
          15: { 3: { id: '3', name: 'Jane Smith', age: 15 } },
        })
      );
    });
  });

  describe('toFlatObject', () => {
    it('should return an object of objects', () => {
      const partialsSet = model.records.select('age');
      const fragmentsSet = model.records.pluck('age');
      const groupSet = model.records.groupBy('age');

      expect(model.records.toFlatObject()).toEqual({
        0: { id: '0', name: 'John Doe', age: 42 },
        1: { id: '1', name: 'Jane Doe', age: 34 },
        2: { id: '2', name: 'John Smith', age: 34 },
        3: { id: '3', name: 'Jane Smith', age: 15 },
      });
      expect(partialsSet.toFlatObject()).toEqual({
        0: { age: 42 },
        1: { age: 34 },
        2: { age: 34 },
        3: { age: 15 },
      });
      expect(fragmentsSet.toFlatObject()).toEqual({
        0: [42],
        1: [34],
        2: [34],
        3: [15],
      });
      expect(groupSet.toFlatObject()).toEqual({
        42: [{ id: '0', name: 'John Doe', age: 42 }],
        34: [
          { id: '1', name: 'Jane Doe', age: 34 },
          { id: '2', name: 'John Smith', age: 34 },
        ],
        15: [{ id: '3', name: 'Jane Smith', age: 15 }],
      });
    });
  });

  describe('toJSON', () => {
    it('should return an object of the records', () => {
      const partialsSet = model.records.select('age');
      const fragmentsSet = model.records.pluck('age');
      const groupSet = model.records.groupBy('age');

      expect(JSON.stringify(model.records.toJSON())).toEqual(
        JSON.stringify({
          0: { id: '0', name: 'John Doe', age: 42 },
          1: { id: '1', name: 'Jane Doe', age: 34 },
          2: { id: '2', name: 'John Smith', age: 34 },
          3: { id: '3', name: 'Jane Smith', age: 15 },
        })
      );
      expect(JSON.stringify(partialsSet.toJSON())).toEqual(
        JSON.stringify({
          0: { age: 42 },
          1: { age: 34 },
          2: { age: 34 },
          3: { age: 15 },
        })
      );
      expect(JSON.stringify(fragmentsSet.toJSON())).toEqual(
        JSON.stringify({ 0: [42], 1: [34], 2: [34], 3: [15] })
      );
      expect(JSON.stringify(groupSet.toJSON())).toEqual(
        JSON.stringify({
          42: { 0: { id: '0', name: 'John Doe', age: 42 } },
          34: {
            1: { id: '1', name: 'Jane Doe', age: 34 },
            2: { id: '2', name: 'John Smith', age: 34 },
          },
          15: { 3: { id: '3', name: 'Jane Smith', age: 15 } },
        })
      );
    });
  });
});
