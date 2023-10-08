import { describe, it, expect } from 'vitest';
import {
  deepClone,
  validateName,
  validateObjectWithUniqueName,
} from '../src/utils.js';

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

  it('handles primitive values', () => {
    expect(deepClone(1)).toBe(1);
    expect(deepClone('test')).toBe('test');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
    expect(deepClone(undefined)).toBe(undefined);
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
    expect(() => validateName('test')).not.toThrow();
    expect(() => validateName('test1')).not.toThrow();
    expect(() => validateName('_test')).not.toThrow();
  });

  it('throws if name is invalid', () => {
    expect(() => validateName(1)).toThrow();
    expect(() => validateName('')).toThrow();
    expect(() => validateName(undefined)).toThrow();
    expect(() => validateName('1test')).toThrow();
    expect(() => validateName('test.')).toThrow();
    expect(() => validateName('test test')).toThrow();
    expect(() => validateName('test-test')).toThrow();
    expect(() => validateName('test/test')).toThrow();
    expect(() => validateName('test\\test')).toThrow();
    expect(() => validateName('toJSON')).toThrow();
  });
});
