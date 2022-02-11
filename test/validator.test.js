import { Validator } from 'src/validator';

describe('Validator', () => {
  describe('unique', () => {
    const validator = Validator.unique('id');
    const collection = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];

    it('returns false for invalid values', () => {
      expect(validator({ id: 1, name: 'John' }, collection)).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ id: 3, name: 'John' }, collection)).toBe(true);
    });
  });

  describe('notNull', () => {
    const validator = Validator.notNull('id');
    const collection = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];

    it('returns false for invalid values', () => {
      expect(validator({ id: null, name: 'John' }, collection)).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ id: 3, name: 'John' }, collection)).toBe(true);
    });
  });

  describe('length', () => {
    const validator = Validator.length('name', [3, 10]);
    const arrayValidator = Validator.length('tags', [1, 5]);

    it('returns false for invalid values', () => {
      expect(validator({ name: 'Jo' })).toBe(false);
      expect(validator({ name: 'LongNameJohn' })).toBe(false);
      expect(arrayValidator({ tags: [] })).toBe(false);
      expect(arrayValidator({ tags: [1, 2, 3, 4, 5, 6] })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ name: 'John' })).toBe(true);
      expect(arrayValidator({ tags: [1, 2, 3] })).toBe(true);
    });
  });

  describe('minLength', () => {
    const validator = Validator.minLength('name', 3);
    const arrayValidator = Validator.minLength('tags', 1);

    it('returns false for invalid values', () => {
      expect(validator({ name: 'Jo' })).toBe(false);
      expect(arrayValidator({ tags: [] })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ name: 'John' })).toBe(true);
      expect(arrayValidator({ tags: [1, 2, 3] })).toBe(true);
    });
  });

  describe('maxLength', () => {
    const validator = Validator.maxLength('name', 10);
    const arrayValidator = Validator.maxLength('tags', 5);

    it('returns false for invalid values', () => {
      expect(validator({ name: 'LongNameJohn' })).toBe(false);
      expect(arrayValidator({ tags: [1, 2, 3, 4, 5, 6] })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ name: 'John' })).toBe(true);
      expect(arrayValidator({ tags: [1, 2, 3] })).toBe(true);
    });
  });

  describe('range', () => {
    const validator = Validator.range('age', [18, 30]);

    it('returns false for invalid values', () => {
      expect(validator({ age: 17 })).toBe(false);
      expect(validator({ age: 31 })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ age: 18 })).toBe(true);
      expect(validator({ age: 24 })).toBe(true);
      expect(validator({ age: 30 })).toBe(true);
    });
  });

  describe('min', () => {
    const validator = Validator.min('age', 18);

    it('returns false for invalid values', () => {
      expect(validator({ age: 17 })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ age: 18 })).toBe(true);
      expect(validator({ age: 24 })).toBe(true);
    });
  });

  describe('max', () => {
    const validator = Validator.max('age', 30);

    it('returns false for invalid values', () => {
      expect(validator({ age: 31 })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ age: 24 })).toBe(true);
      expect(validator({ age: 30 })).toBe(true);
    });
  });

  describe('integer', () => {
    const validator = Validator.integer('age');

    it('returns false for invalid values', () => {
      expect(validator({ age: '17' })).toBe(false);
      expect(validator({ age: 1.5 })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ age: 17 })).toBe(true);
    });
  });

  describe('regex', () => {
    const validator = Validator.regex('name', /^[a-zA-Z]+$/);

    it('returns false for invalid values', () => {
      expect(validator({ name: 'John1' })).toBe(false);
      expect(validator({ name: 'John@' })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ name: 'John' })).toBe(true);
    });
  });

  describe('uniqueValues', () => {
    const validator = Validator.uniqueValues('tags');

    it('returns false for invalid values', () => {
      expect(validator({ tags: [1, 2, 3, 1] })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ tags: [1, 2, 3] })).toBe(true);
    });
  });

  describe('sortedAscending', () => {
    const validator = Validator.sortedAscending('tags');

    it('returns false for invalid values', () => {
      expect(validator({ tags: [1, 3, 2] })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ tags: [1, 2, 3] })).toBe(true);
    });
  });

  describe('sortedDescending', () => {
    const validator = Validator.sortedDescending('tags');

    it('returns false for invalid values', () => {
      expect(validator({ tags: [1, 3, 2] })).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ tags: [3, 2, 1] })).toBe(true);
    });
  });

  describe('custom', () => {
    const validator = Validator.custom(
      'name',
      (value, collection) => !collection.includes(value)
    );
    const collection = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ];

    it('returns false for invalid values', () => {
      expect(validator({ name: 'John' }, collection)).toBe(false);
    });

    it('returns true for valid values', () => {
      expect(validator({ name: 'Josh' }, collection)).toBe(true);
    });
  });
});
