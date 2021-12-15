import {
  deepClone,
  allEqualBy,
  validateName,
  validateObjectWithUniqueName,
} from 'src/utils';

describe('deepClone', () => {
  it('deep clones an oject', () => {
    const obj = {
      a: {
        b: {
          c: 'Hello',
          d: [1, 2, 3],
        },
        e: null,
        f: new Date('2019-01-01'),
      },
    };
    const clone = deepClone(obj);
    expect(clone).toEqual(obj);
    expect(clone).not.toBe(obj);
    expect(clone.a).not.toBe(obj.a);
    expect(clone.a.b).not.toBe(obj.a.b);
    expect(clone.a.b.d).not.toBe(obj.a.b.d);
    expect(clone.a.f).not.toBe(obj.a.f);
  });
});

describe('allEqualBy', () => {
  it('returns true if all elements are equal', () => {
    const arr = [{ a: 1 }, { a: 1 }, { a: 1 }];
    expect(allEqualBy(arr, val => val.a)).toBe(true);
  });

  it('returns false if all elements are not equal', () => {
    const arr = [{ a: 1 }, { a: 2 }, { a: 3 }];
    expect(allEqualBy(arr, val => val.a)).toBe(false);
  });
});

describe('validateObjectWithUniqueName', () => {
  it('throws when passed a non-object value', () => {
    expect(() =>
      validateObjectWithUniqueName(
        {
          objectType: 'object',
          parentType: 'parent',
          parentName: 'myParent',
        },
        'myObject',
        []
      )
    ).toThrow();
  });

  it('throws when the object name is already in the collection', () => {
    expect(() =>
      validateObjectWithUniqueName(
        {
          objectType: 'object',
          parentType: 'parent',
          parentName: 'myParent',
        },
        { name: 'myObject' },
        ['myObject']
      )
    ).toThrow();
  });

  it('returns true for a valid object value', () => {
    expect(
      validateObjectWithUniqueName(
        {
          objectType: 'object',
          parentType: 'parent',
          parentName: 'myParent',
        },
        { name: 'myObject' },
        []
      )
    ).toBe(true);
  });
});

describe('validateName', () => {
  it('returns if name is valid', () => {
    expect(() => validateName('Field', 'test')).not.toThrow();
    expect(() => validateName('Field', 'test1')).not.toThrow();
    expect(() => validateName('Field', '_test')).not.toThrow();
    expect(() => validateName('Other', 'toString')).not.toThrow();
  });

  it('throws if name is invalid', () => {
    expect(() => validateName('Field', 1)).toThrow();
    expect(() => validateName('Field', '')).toThrow();
    expect(() => validateName('Field', undefined)).toThrow();
    expect(() => validateName('Field', '1test')).toThrow();
    expect(() => validateName('Field', 'test.')).toThrow();
    expect(() => validateName('Field', 'test test')).toThrow();
    expect(() => validateName('Field', 'test-test')).toThrow();
    expect(() => validateName('Field', 'test/test')).toThrow();
    expect(() => validateName('Field', 'test\\test')).toThrow();
    expect(() => validateName('Field', 'toJSON')).toThrow();
  });
});
