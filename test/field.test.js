import { describe, it, beforeEach, expect, test } from 'vitest';
import { Field } from '../src/field.js';
import { standardTypes } from '../src/types.js';

describe('Field', () => {
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
  });

  describe('standard types', () => {
    const standardTypesEntries = Object.entries(standardTypes);
    const standardTypesTestValues = {
      boolean: false,
      number: 0,
      string: '',
      date: new Date(),
      booleanArray: [],
      numberArray: [],
      stringArray: [],
      dateArray: [],
      object: {},
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
  });
});
