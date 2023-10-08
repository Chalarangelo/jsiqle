import { describe, it, beforeEach, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { Schema } from '../src/schema.js';
import { Model } from '../src/model.js';
import { Relationship } from '../src/relationship.js';
import symbols from '../src/symbols.js';

const {
  $instances,
  $getField,
  $getProperty,
  $addRelationshipAsField,
  $addRelationshipAsProperty,
} = symbols;

describe('Relationship', () => {
  let consoleWarn = console.warn;

  beforeAll(() => {
    global.console.warn = () => {};
    Schema.config.experimentalAPIMessages = 'off';
  });

  afterAll(() => {
    global.console.warn = consoleWarn;
    Schema.config.experimentalAPIMessages = 'warn';
  });

  afterEach(() => {
    // Cleanup to avoid instances leaking to other tests
    Model[$instances].clear();
  });

  it('throws if type is invalid', () => {
    // eslint-disable-next-line no-unused-vars
    const fromModel = new Model({ name: 'foo' });
    // eslint-disable-next-line no-unused-vars
    const toModel = new Model({ name: 'bar' });
    expect(
      () => new Relationship({ from: 'foo', to: 'bar', type: 'baz' })
    ).toThrow();
  });

  it('throws if the from model is invalid', () => {
    // eslint-disable-next-line no-unused-vars
    const toModel = new Model({ name: 'bar' });
    expect(
      () => new Relationship({ from: 'foo', to: 'bar', type: 'oneToOne' })
    ).toThrow();
  });

  it('throws if the to model is invalid', () => {
    // eslint-disable-next-line no-unused-vars
    const fromModel = new Model({ name: 'foo' });
    expect(
      () => new Relationship({ from: 'foo', to: 'bar', type: 'oneToOne' })
    ).toThrow();
  });

  it('throws if the from model field name already exists', () => {
    // eslint-disable-next-line no-unused-vars
    const fromModel = new Model({
      name: 'foo',
      fields: { aField: 'string' },
    });
    // eslint-disable-next-line no-unused-vars
    const toModel = new Model({ name: 'bar' });
    expect(
      () =>
        new Relationship({
          from: { model: 'foo', name: 'aField' },
          to: 'bar',
          type: 'oneToOne',
        })
    ).toThrow();
  });

  it('throws if the from model field name is invalid', () => {
    // eslint-disable-next-line no-unused-vars
    const fromModel = new Model({ name: 'foo' });
    // eslint-disable-next-line no-unused-vars
    const toModel = new Model({ name: 'bar' });
    expect(
      () =>
        new Relationship({
          from: { model: 'foo', name: '1field' },
          to: 'bar',
          type: 'oneToOne',
        })
    ).toThrow();
  });

  it('throws if the to model field name already exists', () => {
    // eslint-disable-next-line no-unused-vars
    const fromModel = new Model({ name: 'foo' });
    // eslint-disable-next-line no-unused-vars
    const toModel = new Model({
      name: 'bar',
      fields: { aField: 'string' },
    });
    expect(
      () =>
        new Relationship({
          from: 'foo',
          to: { model: 'bar', name: 'aField' },
          type: 'oneToOne',
        })
    ).toThrow();
  });

  it('throws if the to model field name is invalid', () => {
    // eslint-disable-next-line no-unused-vars
    const fromModel = new Model({ name: 'foo' });
    // eslint-disable-next-line no-unused-vars
    const toModel = new Model({ name: 'bar' });
    expect(
      () =>
        new Relationship({
          from: 'foo',
          to: { model: 'bar', name: '1field' },
          type: 'oneToOne',
        })
    ).toThrow();
  });

  it('throws if the relationship is symmetric on the same model without names', () => {
    // eslint-disable-next-line no-unused-vars
    const fromModel = new Model({ name: 'foo' });
    expect(
      () =>
        new Relationship({
          from: 'foo',
          to: 'foo',
          type: 'oneToOne',
        })
    ).toThrow();
  });

  describe('when arguments are valid', () => {
    let models = {};
    let relationships = {};

    beforeEach(() => {
      models.modelAlpha = new Model({ name: 'modelAlpha' });
      models.modelBeta = new Model({ name: 'modelBeta' });
      models.modelGamma = new Model({ name: 'modelGamma' });
      models.modelDelta = new Model({ name: 'modelDelta' });

      relationships.oneToOne = new Relationship({
        from: 'modelAlpha',
        to: 'modelBeta',
        type: 'oneToOne',
      });
      models.modelAlpha[$addRelationshipAsField](relationships.oneToOne);
      models.modelBeta[$addRelationshipAsProperty](relationships.oneToOne);

      relationships.oneToMany = new Relationship({
        from: 'modelBeta',
        to: 'modelGamma',
        type: 'oneToMany',
      });
      models.modelBeta[$addRelationshipAsField](relationships.oneToMany);
      models.modelGamma[$addRelationshipAsProperty](relationships.oneToMany);

      relationships.manyToOne = new Relationship({
        from: 'modelGamma',
        to: 'modelDelta',
        type: 'manyToOne',
      });
      models.modelGamma[$addRelationshipAsField](relationships.manyToOne);
      models.modelDelta[$addRelationshipAsProperty](relationships.manyToOne);

      relationships.manyToMany = new Relationship({
        from: 'modelDelta',
        to: 'modelAlpha',
        type: 'manyToMany',
      });
      models.modelDelta[$addRelationshipAsField](relationships.manyToMany);
      models.modelAlpha[$addRelationshipAsProperty](relationships.manyToMany);

      relationships.oneToOneNamed = new Relationship({
        from: { model: 'modelAlpha', name: 'parent' },
        to: { model: 'modelBeta', name: 'child' },
        type: 'oneToOne',
      });
      models.modelAlpha[$addRelationshipAsField](relationships.oneToOneNamed);
      models.modelBeta[$addRelationshipAsProperty](relationships.oneToOneNamed);

      relationships.oneToManyNamed = new Relationship({
        from: { model: 'modelBeta', name: 'children' },
        to: { model: 'modelGamma', name: 'parent' },
        type: 'oneToMany',
      });
      models.modelBeta[$addRelationshipAsField](relationships.oneToManyNamed);
      models.modelGamma[$addRelationshipAsProperty](
        relationships.oneToManyNamed
      );

      relationships.manyToOneNamed = new Relationship({
        from: { model: 'modelGamma', name: 'parent2' },
        to: { model: 'modelDelta', name: 'children2' },
        type: 'manyToOne',
      });
      models.modelGamma[$addRelationshipAsField](relationships.manyToOneNamed);
      models.modelDelta[$addRelationshipAsProperty](
        relationships.manyToOneNamed
      );

      relationships.manyToManyNamed = new Relationship({
        from: { model: 'modelDelta', name: 'friends' },
        to: { model: 'modelAlpha', name: 'friends' },
        type: 'manyToMany',
      });
      models.modelDelta[$addRelationshipAsField](relationships.manyToManyNamed);
      models.modelAlpha[$addRelationshipAsProperty](
        relationships.manyToManyNamed
      );

      relationships.sameModelOneToOne = new Relationship({
        from: { model: 'modelAlpha', name: 'friend' },
        to: { model: 'modelAlpha', name: 'colleague' },
        type: 'oneToOne',
      });
      models.modelAlpha[$addRelationshipAsField](
        relationships.sameModelOneToOne
      );
      models.modelAlpha[$addRelationshipAsProperty](
        relationships.sameModelOneToOne
      );

      relationships.sameModelManyToMany = new Relationship({
        from: { model: 'modelAlpha', name: 'friends2' },
        to: { model: 'modelAlpha', name: 'colleagues' },
        type: 'manyToMany',
      });
      models.modelAlpha[$addRelationshipAsField](
        relationships.sameModelManyToMany
      );
      models.modelAlpha[$addRelationshipAsProperty](
        relationships.sameModelManyToMany
      );
    });

    // Indirectly checking correct arguments via properties
    describe('$getField', () => {
      it('returns the correct relationship name', () => {
        expect(relationships.oneToOne[$getField]().name).toBe('modelBeta');
        expect(relationships.oneToMany[$getField]().name).toBe('modelGammaSet');
        expect(relationships.manyToOne[$getField]().name).toBe('modelDelta');
        expect(relationships.manyToMany[$getField]().name).toBe(
          'modelAlphaSet'
        );
        expect(relationships.oneToOneNamed[$getField]().name).toBe('parent');
        expect(relationships.oneToManyNamed[$getField]().name).toBe('children');
        expect(relationships.manyToOneNamed[$getField]().name).toBe('parent2');
        expect(relationships.manyToManyNamed[$getField]().name).toBe('friends');
        expect(relationships.sameModelOneToOne[$getField]().name).toBe(
          'friend'
        );
        expect(relationships.sameModelManyToMany[$getField]().name).toBe(
          'friends2'
        );
      });

      it('returns the correct relationship type', () => {
        expect(relationships.oneToOne[$getField]().type).toBe('oneToOne');
        expect(relationships.oneToMany[$getField]().type).toBe('oneToMany');
        expect(relationships.manyToOne[$getField]().type).toBe('manyToOne');
        expect(relationships.manyToMany[$getField]().type).toBe('manyToMany');
        expect(relationships.oneToOneNamed[$getField]().type).toBe('oneToOne');
        expect(relationships.oneToManyNamed[$getField]().type).toBe(
          'oneToMany'
        );
        expect(relationships.manyToOneNamed[$getField]().type).toBe(
          'manyToOne'
        );
        expect(relationships.manyToManyNamed[$getField]().type).toBe(
          'manyToMany'
        );
        expect(relationships.sameModelOneToOne[$getField]().type).toBe(
          'oneToOne'
        );
        expect(relationships.sameModelManyToMany[$getField]().type).toBe(
          'manyToMany'
        );
      });

      it('returns the correct relationship field name', () => {
        expect(relationships.oneToOne[$getField]().fieldName).toBe('modelBeta');
        expect(relationships.oneToMany[$getField]().fieldName).toBe(
          'modelGammaSet'
        );
        expect(relationships.manyToOne[$getField]().fieldName).toBe(
          'modelDelta'
        );
        expect(relationships.manyToMany[$getField]().fieldName).toBe(
          'modelAlphaSet'
        );
        expect(relationships.oneToOneNamed[$getField]().fieldName).toBe(
          'parent'
        );
        expect(relationships.oneToManyNamed[$getField]().fieldName).toBe(
          'children'
        );
        expect(relationships.manyToOneNamed[$getField]().fieldName).toBe(
          'parent2'
        );
        expect(relationships.manyToManyNamed[$getField]().fieldName).toBe(
          'friends'
        );
        expect(relationships.sameModelOneToOne[$getField]().fieldName).toBe(
          'friend'
        );
        expect(relationships.sameModelManyToMany[$getField]().fieldName).toBe(
          'friends2'
        );
      });
    });

    describe('$getProperty', () => {
      it('returns the correct relationship name', () => {
        expect(relationships.oneToOne[$getProperty]().name).toBe('modelBeta');
        expect(relationships.oneToMany[$getProperty]().name).toBe(
          'modelGammaSet'
        );
        expect(relationships.manyToOne[$getProperty]().name).toBe('modelDelta');
        expect(relationships.manyToMany[$getProperty]().name).toBe(
          'modelAlphaSet'
        );
        expect(relationships.oneToOneNamed[$getProperty]().name).toBe('parent');
        expect(relationships.oneToManyNamed[$getProperty]().name).toBe(
          'children'
        );
        expect(relationships.manyToOneNamed[$getProperty]().name).toBe(
          'parent2'
        );
        expect(relationships.manyToManyNamed[$getProperty]().name).toBe(
          'friends'
        );
        expect(relationships.sameModelOneToOne[$getProperty]().name).toBe(
          'friend'
        );
        expect(relationships.sameModelManyToMany[$getProperty]().name).toBe(
          'friends2'
        );
      });

      it('returns the correct relationship type', () => {
        expect(relationships.oneToOne[$getProperty]().type).toBe('oneToOne');
        expect(relationships.oneToMany[$getProperty]().type).toBe('oneToMany');
        expect(relationships.manyToOne[$getProperty]().type).toBe('manyToOne');
        expect(relationships.manyToMany[$getProperty]().type).toBe(
          'manyToMany'
        );
        expect(relationships.oneToOneNamed[$getProperty]().type).toBe(
          'oneToOne'
        );
        expect(relationships.oneToManyNamed[$getProperty]().type).toBe(
          'oneToMany'
        );
        expect(relationships.manyToOneNamed[$getProperty]().type).toBe(
          'manyToOne'
        );
        expect(relationships.manyToManyNamed[$getProperty]().type).toBe(
          'manyToMany'
        );
        expect(relationships.sameModelOneToOne[$getProperty]().type).toBe(
          'oneToOne'
        );
        expect(relationships.sameModelManyToMany[$getProperty]().type).toBe(
          'manyToMany'
        );
      });

      it('returns the correct relationship property name', () => {
        expect(relationships.oneToOne[$getProperty]().propertyName).toBe(
          'modelAlpha'
        );
        expect(relationships.oneToMany[$getProperty]().propertyName).toBe(
          'modelBeta'
        );
        expect(relationships.manyToOne[$getProperty]().propertyName).toBe(
          'modelGammaSet'
        );
        expect(relationships.manyToMany[$getProperty]().propertyName).toBe(
          'modelDeltaSet'
        );
        expect(relationships.oneToOneNamed[$getProperty]().propertyName).toBe(
          'child'
        );
        expect(relationships.oneToManyNamed[$getProperty]().propertyName).toBe(
          'parent'
        );
        expect(relationships.manyToOneNamed[$getProperty]().propertyName).toBe(
          'children2'
        );
        expect(relationships.manyToManyNamed[$getProperty]().propertyName).toBe(
          'friends'
        );
        expect(
          relationships.sameModelOneToOne[$getProperty]().propertyName
        ).toBe('colleague');
        expect(
          relationships.sameModelManyToMany[$getProperty]().propertyName
        ).toBe('colleagues');
      });
    });

    // We also check the reverse via properties in this test suite.
    describe('$get', () => {
      let records = {};

      beforeEach(() => {
        records.a1 = models.modelAlpha.createRecord({ id: 'a1' });
        records.a2 = models.modelAlpha.createRecord({ id: 'a2' });
        records.a3 = models.modelAlpha.createRecord({ id: 'a3' });
        records.b1 = models.modelBeta.createRecord({ id: 'b1' });
        records.b2 = models.modelBeta.createRecord({ id: 'b2' });
        records.b3 = models.modelBeta.createRecord({ id: 'b3' });
        records.g1 = models.modelGamma.createRecord({ id: 'g1' });
        records.g2 = models.modelGamma.createRecord({ id: 'g2' });
        records.g3 = models.modelGamma.createRecord({ id: 'g3' });
        records.d1 = models.modelDelta.createRecord({ id: 'd1' });
        records.d2 = models.modelDelta.createRecord({ id: 'd2' });
        records.d3 = models.modelDelta.createRecord({ id: 'd3' });

        // One to One
        records.a1.modelBeta = records.b1.id;
        records.a1.parent = records.b2.id;
        records.a1.friend = records.a2.id;
        // One to Many
        records.b1.modelGammaSet = [records.g2.id, records.g1.id];
        records.b1.children = [records.g2.id, records.g3.id];
        // Many to One
        records.g1.modelDelta = records.d1.id;
        records.g2.modelDelta = records.d1.id;
        records.g1.parent2 = records.d2.id;
        records.g3.parent2 = records.d2.id;
        // Many to Many
        records.d1.modelAlphaSet = [records.a1.id, records.a2.id];
        records.d1.friends = [records.a2.id, records.a3.id];
        records.a1.friends2 = [records.a2.id, records.a3.id];
      });

      it('returns the correct result for one to one relationships', () => {
        // Filled field
        expect(records.a1.modelBeta.id).toBe(records.b1.id);
        expect(records.a1.parent.id).toBe(records.b2.id);
        expect(records.a1.friend.id).toBe(records.a2.id);
        // Filled property
        expect(records.b1.modelAlpha.id).toBe(records.a1.id);
        expect(records.b2.child.id).toBe(records.a1.id);
        expect(records.a2.colleague.id).toBe(records.a1.id);
        // Empty field
        expect(records.a2.modelBeta).toBe(undefined);
        expect(records.a2.parent).toBe(undefined);
        expect(records.a2.friend).toBe(undefined);
        // Empty property
        expect(records.b2.modelAlpha).toBe(undefined);
        expect(records.b1.child).toBe(undefined);
        expect(records.a1.colleague).toBe(undefined);
      });

      it('returns the correct result for one to many relationships', () => {
        // Filled field
        expect(records.b1.modelGammaSet.pluck('id')).toEqual([
          records.g2.id,
          records.g1.id,
        ]);
        expect(records.b1.children.pluck('id')).toEqual([
          records.g2.id,
          records.g3.id,
        ]);
        // Filled property
        expect(records.g1.modelBeta.id).toBe(records.b1.id);
        expect(records.g2.modelBeta.id).toBe(records.b1.id);
        expect(records.g2.parent.id).toBe(records.b1.id);
        expect(records.g3.parent.id).toBe(records.b1.id);
        // Empty field
        expect(records.b2.modelGammaSet.size).toBe(0);
        expect(records.b2.children.size).toBe(0);
        // Empty property
        expect(records.g3.modelBeta).toBe(undefined);
        expect(records.g1.parent).toBe(undefined);
      });

      it('returns the correct result for many to one relationships', () => {
        // Filled field
        expect(records.g1.modelDelta.id).toBe(records.d1.id);
        expect(records.g2.modelDelta.id).toBe(records.d1.id);
        expect(records.g1.parent2.id).toBe(records.d2.id);
        expect(records.g3.parent2.id).toBe(records.d2.id);
        // Filled property
        expect(records.d1.modelGammaSet.pluck('id')).toEqual([
          records.g1.id,
          records.g2.id,
        ]);
        expect(records.d2.children2.pluck('id')).toEqual([
          records.g1.id,
          records.g3.id,
        ]);
        // Empty field
        expect(records.g3.modelDelta).toBe(undefined);
        expect(records.g2.parent2).toBe(undefined);
        // Empty property
        expect(records.d2.modelGammaSet.size).toBe(0);
        expect(records.d1.children2.size).toBe(0);
      });

      it('returns the correct result for many to many relationships', () => {
        // Filled field
        expect(records.d1.modelAlphaSet.pluck('id')).toEqual([
          records.a1.id,
          records.a2.id,
        ]);
        expect(records.d1.friends.pluck('id')).toEqual([
          records.a2.id,
          records.a3.id,
        ]);
        expect(records.a1.friends2.pluck('id')).toEqual([
          records.a2.id,
          records.a3.id,
        ]);
        // Filled property
        expect(records.a1.modelDeltaSet.pluck('id')).toEqual([records.d1.id]);
        expect(records.a2.friends.pluck('id')).toEqual([records.d1.id]);
        expect(records.a2.colleagues.pluck('id')).toEqual([records.a1.id]);
        // Empty field
        expect(records.d2.modelAlphaSet.size).toBe(0);
        expect(records.d2.friends.size).toBe(0);
        expect(records.a2.friends2.size).toBe(0);
        // Empty property
        expect(records.a3.modelDeltaSet.size).toBe(0);
        expect(records.a1.friends.size).toBe(0);
        expect(records.a1.colleagues.size).toBe(0);
      });
    });
  });
});
