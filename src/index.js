import { Schema } from 'src/schema';
import { Model } from 'src/model';
import { Field, Key } from 'src/field';
import { Relationship } from 'src/relationship';
import types from 'src/types';

// TODO: Records, Models, Schema
const jedql = {
  Schema,
  Model,
  Field,
  Key,
  Relationship,
  FieldTypes: types,
};

export default jedql;
