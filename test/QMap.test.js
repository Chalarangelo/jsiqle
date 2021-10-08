import QMap from '../src/QMap.js';

describe('QMap', () => {
  test('map', () => {
    const map = new QMap();
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    const mappedMap = map.map(v => v * 2);
    expect([...mappedMap]).toEqual([
      ['a', 2],
      ['b', 4],
      ['c', 6],
    ]);
    expect(mappedMap).not.toBe(map);
  });

  test('reduce', () => {
    const map = new QMap();
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    const reducedMap = map.reduce((acc, v) => acc + v, 0);
    expect(reducedMap).toBe(6);
  });

  test('filter', () => {
    const map = new QMap();
    map.set('a', 1);
    map.set('b', 2);
    map.set('c', 3);
    const filteredMap = map.filter(v => v % 2 === 0);
    expect([...filteredMap]).toEqual([['b', 2]]);
    expect(filteredMap).not.toBe(map);
  });
});
