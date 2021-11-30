import { DuplicationError } from 'src/errors';

export const capitalize = ([first, ...rest], lowerRest = false) =>
  first.toUpperCase() +
  (lowerRest ? rest.join('').toLowerCase() : rest.join(''));

export const deepClone = obj => {
  if (obj === null) return null;
  let clone = Object.assign({}, obj);
  Object.entries(clone).forEach(
    ([key, value]) =>
      (clone[key] = typeof obj[key] === 'object' ? deepClone(value) : value)
  );
  if (Array.isArray(obj)) {
    clone.length = obj.length;
    return Array.from(clone);
  }
  return clone;
};

export const allEqualBy = (arr, fn) => {
  const eql = fn(arr[0]);
  return arr.every(val => fn(val) === eql);
};

export const isObject = obj => obj && typeof obj === 'object';

export const contains = (collection, item) => collection.includes(item);

export const validateObjectWithUniqueName = (
  { objectType, parentType, parentName },
  obj,
  collection
) => {
  if (!isObject(obj))
    throw new TypeError(`${objectType} ${obj} is not an object.`);
  if (contains(collection, obj.name))
    throw new DuplicationError(
      `${parentType} ${parentName} already has a ${objectType.toLowerCase()} named ${
        obj.name
      }.`
    );
  return true;
};
