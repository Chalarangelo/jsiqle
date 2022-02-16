import { Field } from 'src/field';
import types, { standardTypes } from 'src/types';
import symbols from 'src/symbols';

const { $defaultValue, $validators } = symbols;

describe('Field', () => {
  it('throws if "name" is invalid', () => {
    expect(() => new Field({ name: null })).toThrow();
    expect(() => new Field({ name: undefined })).toThrow();
    expect(() => new Field({ name: '' })).toThrow();
    expect(() => new Field({ name: ' ' })).toThrow();
    expect(() => new Field({ name: '1' })).toThrow();
    expect(() => new Field({ name: 'a&1*b' })).toThrow();
  });

  it('throws if "type" is invalid', () => {
    expect(() => new Field({ type: null })).toThrow();
    expect(() => new Field({ type: undefined })).toThrow();
    expect(() => new Field({ type: 'a' })).toThrow();
  });

  it('throws if "defaultValue" is invalid', () => {
    expect(
      () =>
        new Field({
          name: 'myField',
          type: x => x === 'test',
          defaultValue: 'test2',
        })
    ).toThrow();
  });

  describe('when arguments are valid', () => {
    let field;
    beforeEach(() => {
      field = new Field({ name: 'myField', type: x => x === 'test' });
    });

    it('has the correct name', () => {
      expect(field.name).toBe('myField');
    });

    it('correctly checks values based on the given type', () => {
      expect(field.typeCheck('test')).toBe(true);
      expect(field.typeCheck('test2')).toBe(false);
    });

    it('correctly checks empty values', () => {
      expect(field.typeCheck(null)).toBe(true);
      expect(field.typeCheck(undefined)).toBe(false);
    });

    describe('when validators are specified', () => {
      it('throws if the validator is invalid', () => {
        expect(
          () =>
            new Field({
              name: 'myField',
              type: x => x === 'test',
              validators: { nonExistent: null },
            })
        ).toThrow();
        expect(
          () =>
            new Field({
              name: 'myField',
              type: x => x === 'test',
              validators: { nonExistent: 1 },
            })
        ).toThrow();
      });

      it('adds an existing validator to the field validators', () => {
        field = new Field({
          name: 'myField',
          type: x => typeof x === 'string',
          validators: {
            minLength: 2,
          },
        });
        expect(field[$validators].size).toBe(1);
        const validator = field[$validators].get('myFieldMinLength');
        expect(validator).not.toBe(undefined);
        expect(validator({ myField: 'a' })).toBe(false);
        expect(validator({ myField: 'ab' })).toBe(true);
      });

      it('adds a custom validator to the field validators', () => {
        field = new Field({
          name: 'myField',
          type: x => typeof x === 'string',
          validators: {
            startsWithTest: x => x.startsWith('test'),
          },
        });
        expect(field[$validators].size).toBe(1);
        const validator = field[$validators].get('myFieldStartsWithTest');
        expect(validator).not.toBe(undefined);
        expect(validator({ myField: 'a test' }, [])).toBe(false);
        expect(validator({ myField: 'test a' }, [])).toBe(true);
      });
    });

    // Indirectly cover any leftover types
    describe('with "objectOf" type', () => {
      beforeEach(() => {
        field = new Field({
          name: 'myField',
          type: types.objectOf(types.number),
        });
      });

      it('correctly checks values based on the given type', () => {
        expect(field.typeCheck({ a: 1, b: 2 })).toBe(true);
        expect(field.typeCheck({ a: '1', b: 2 })).toBe(false);
      });
    });

    describe('with "object" type', () => {
      beforeEach(() => {
        field = new Field({
          name: 'myField',
          type: types.object({ name: types.string }),
        });
      });

      it('correctly checks values based on the given type', () => {
        expect(field.typeCheck({ name: 'a' })).toBe(true);
        expect(field.typeCheck({ name: 1 })).toBe(false);
        expect(field.typeCheck({ name: 'a', b: 1 })).toBe(false);
      });
    });
  });

  describe('standard types', () => {
    const standardTypesEntries = Object.entries(standardTypes);
    const standardTypesTestValues = {
      boolean: false,
      number: 0,
      string: '',
      date: new Date(),
      stringOrNumber: '',
      booleanArray: [],
      numberArray: [],
      stringArray: [],
      dateArray: [],
      object: {},
      booleanObject: { a: true },
      numberObject: {},
      stringObject: {},
      dateObject: {},
      objectArray: [],
    };

    test.each(standardTypesEntries)('%s is defined', typeName => {
      expect(Field[typeName]).toBeDefined();
    });

    test.each(standardTypesEntries)(
      '%s accepts a string as a name and returns a Field of the appropriate type',
      typeName => {
        const field = Field[typeName]('myField');
        expect(field).toBeInstanceOf(Field);
        expect(field.name).toBe('myField');
        expect(field.typeCheck(standardTypesTestValues[typeName])).toBe(true);
      }
    );

    test.each(standardTypesEntries)(
      '%s accepts a valid object and returns a Field of the appropriate type',
      typeName => {
        const defaultValue = standardTypesTestValues[typeName];
        const field = Field[typeName]({ name: 'myField', defaultValue });
        expect(field).toBeInstanceOf(Field);
        expect(field.name).toBe('myField');
        expect(field[$defaultValue]).toBe(defaultValue);
        expect(field.typeCheck(defaultValue)).toBe(true);
      }
    );
  });

  describe('enum type', () => {
    it('enum is defined', () => {
      expect(Field.enum).toBeDefined();
    });

    it('accepts a valid object and returns a Field of the appropriate type', () => {
      const field = Field.enum({
        name: 'myField',
        values: ['a', 'b'],
      });
      expect(field).toBeInstanceOf(Field);
      expect(field.name).toBe('myField');
      expect(field.typeCheck('a')).toBe(true);
      expect(field.typeCheck('c')).toBe(false);
    });
  });
});
