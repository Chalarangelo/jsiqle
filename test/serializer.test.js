import { Serializer } from 'src/serializer';

describe('Serializer', () => {
  it('throws if "name" is invalid', () => {
    expect(() => new Serializer({ name: null })).toThrow();
    expect(() => new Serializer({ name: undefined })).toThrow();
    expect(() => new Serializer({ name: '' })).toThrow();
    expect(() => new Serializer({ name: ' ' })).toThrow();
    expect(() => new Serializer({ name: '1' })).toThrow();
    expect(() => new Serializer({ name: 'a&1*b' })).toThrow();
  });

  it('throws if "attributes" is invalid', () => {
    expect(
      () => new Serializer({ name: 'mySerializer', attributes: ['a', 'a'] })
    ).toThrow();
    expect(
      () => new Serializer({ name: 'mySerializer', attributes: [null] })
    ).toThrow();
    expect(
      () => new Serializer({ name: 'mySerializer', attributes: [[null, 1]] })
    ).toThrow();
  });

  describe('when arguments are valid', () => {
    let serializer;
    beforeEach(() => {
      serializer = new Serializer({
        name: 'mySerializer',
        attributes: [
          'name',
          ['description', 'regularDescription'],
          ['specialDescription', 'description'],
          'customDescription',
          'children',
        ],
        methods: {
          specialDescription: item => {
            return item.description + '!!';
          },
          children: item => {
            return item.children.map(child => child.prettyName);
          },
          customDescription: (item, { prefix }) => {
            return prefix + item.description;
          },
          conditionalProp: (item, { withConditional } = {}) => {
            return withConditional ? item.conditionalProp : undefined;
          },
        },
      });
    });

    it('returns a valid serializer with the correct name', () => {
      expect(serializer.name).toBe('mySerializer');
    });

    describe('addMethod', () => {
      it('throws if method already exists', () => {
        expect(() =>
          serializer.addMethod('specialDescription', () => {})
        ).toThrow();
      });

      it('throws if method is not a function', () => {
        expect(() => serializer.addMethod('otherDescription', null)).toThrow();
      });
    });

    // Indirectly check that the constructor sets the correct properties.
    describe('serialize', () => {
      it('returns a valid object', () => {
        const object = {
          name: 'myItem',
          description: 'my description',
          children: [
            {
              name: 'myChild',
              prettyName: 'my pretty child',
            },
          ],
        };

        const serialized = serializer.serialize(object, { prefix: 'prefix' });
        expect(serialized).toEqual({
          name: 'myItem',
          regularDescription: 'my description',
          description: 'my description!!',
          customDescription: 'prefixmy description',
          children: ['my pretty child'],
        });
      });
    });
  });
});
