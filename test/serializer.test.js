import { Serializer } from 'src/serializer';
import { Model } from 'src/model';

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

    // Indirectly check that the constructor sets the correct properties.
    describe('serializeArray', () => {
      it('returns a valid array of objects', () => {
        const object1 = {
          name: 'myItem1',
          description: 'my description',
          children: [
            {
              name: 'myChild',
              prettyName: 'my pretty child',
            },
          ],
        };
        const object2 = {
          name: 'myItem2',
          description: 'my description',
          children: [
            {
              name: 'myChild',
              prettyName: 'my pretty child',
            },
          ],
        };

        const serialized = serializer.serializeArray([object1, object2], {
          prefix: 'prefix',
        });
        expect(serialized).toEqual([
          {
            name: 'myItem1',
            regularDescription: 'my description',
            description: 'my description!!',
            customDescription: 'prefixmy description',
            children: ['my pretty child'],
          },
          {
            name: 'myItem2',
            regularDescription: 'my description',
            description: 'my description!!',
            customDescription: 'prefixmy description',
            children: ['my pretty child'],
          },
        ]);
      });
    });

    describe('serializeRecordSet', () => {
      it('returns a valid object of objects', () => {
        const model = new Model({
          name: 'myModel',
          fields: [
            {
              name: 'name',
              type: 'string',
            },
            {
              name: 'description',
              type: 'string',
            },
            {
              name: 'children',
              type: 'objectArrayRequired',
            },
          ],
        });
        model.createRecord({
          id: 'item_1',
          name: 'myItem1',
          description: 'description of myItem1',
        });
        model.createRecord({
          id: 'item_2',
          name: 'myItem2',
          description: 'description of myItem2',
        });

        const serialized = serializer.serializeRecordSet(
          model.records,
          {
            prefix: 'prefix',
          },
          (key, value) => {
            if (value.name === 'myItem2') return undefined;
            return `${key.split('_')[0]}/${value.name}`;
          }
        );

        expect(serialized).toEqual({
          'item/myItem1': {
            name: 'myItem1',
            regularDescription: 'description of myItem1',
            description: 'description of myItem1!!',
            customDescription: 'prefixdescription of myItem1',
            children: [],
          },
        });
      });
    });
  });
});
