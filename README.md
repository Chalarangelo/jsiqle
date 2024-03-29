# @jsiqle/core

JavaScript In-memory Query Language.

## Installation

```sh
npm install @jsiqle/core
```

## Usage

You would typically use this library much like a traditional ORM, but without the data bindings to interface with a database. In such a scenario, data would be provided by loading data from a filesystem-based data storage such as JSON files.

```js
// Suppose data for yur schema is appropriately stored in data.json
import data from './data.json';
import jsiqle from '@jsiqle/core';

const Ledger = jsiqle.create({
  models: [
    {
      name: 'Person',
      fields: {
        username: 'string',
        role: 'string',
        firstName: 'string',
        lastName: 'string'
      },
      properties: {
        fullName: rec => `${rec.firstName} ${rec.lastName}`
      }
    },
    {
      name: 'Transaction',
      fields: {
        time: 'date',
        amount: 'number'
      }
    }
  ],
  relationships: [
    {
      from: { model: 'Transaction', name: 'payer' },
      to: { model: 'Person', name: 'outgoingTransactions' },
      type: 'manyToOne'
    },
    {
      from: { model: 'Transaction', name: 'payee' },
      to: { model: 'Person', name: 'incomingTransactions' },
      type: 'manyToOne'
    }
  ]
});

const Person = Ledger.getModel('Person');
const Transaction = Ledger.getModel('Transaction');

// Load some data from storage
data.people.forEach(
  personData => Person.createRecord(personData)
);
data.transactions.forEach(
  transactionData => Transaction.createRecord(transactionData)
);

// Get the name of the first person that has at least one outgoing transaction
Person.records.where(p => p.outgoingTransactions.length).first.fullName;
```

**Note:** Data bindings for a standardized JSON-based data storage may be coming soon, either as part of this package or a complementary one.

## API Reference

### Schema definition

A schema instance can be created using `jsiqle.create()`:

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({});
```

Schema definition requires an object argument with the following attributes:

- `models`: (Optional) An array of models that are part of the schema. More information about model definitions can be found in the next section.
- `relationships`: (Optional) An array of relationships between models. More information about relationship definitions can be found in one of the following sections.
- `serializers`: (Optional) An array of serializers for the schema. More information about serializer definitions can be found in one of the following sections.
- `config`: (Optional) A configuration object that supports the following attributes:
  - `experimentalAPIMessages`: One of `'warn'`, `'error'` or `'off'`. Depending on this flag, experimental API messages can either be logged as warnings, throw an error or be turned off entirely.

#### Model definitions

Models can be defined as part of the schema definition.

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [{ name: 'MyModel' }]
});

const MyModel = MySchema.getModel('MyModel');
```

Model definition options require an object argument with the following attributes:

- `name`: The name of the model. By convention, model names and variables should be title-cased (i.e. `MyModel` instead of `myModel`). Model names must be globally unique.
- `fields`: (Optional) An object containing key-value pairs for fields that make up the model. More information about field definitions can be found in the next section.
- `properties`: (Optional) An object containing key-value pairs for getter properties to be defined on the model. All properties expect a single argument representing a record of the given model. More information about property definitions can be found in one of the following sections.
- `scopes`: (Optional) An object containing key-value pairs for getter properties to be defined on the record set of the model. All scopes expect a single argument representing the record set or a subset of records from the current model. Alternatively, an object with a `matcher` and `sorter` key can be supplied for ordered scopes. More information about scope definitions can be found in one of the following sections.

You can retrieve an already defined model by calling `Schema.prototype.getModel()` with the model name:

```js
const MyModel = MySchema.getModel('MyModel');
```

#### Field definitions

Fields can be defined as part of a model definition.

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        age: 'number',
        username: 'string',
        role: 'string'
      }
    }
  ]
});
```

Field definition options require an object argument with the following attributes:

- `name`: The name of the field. By convention, field names should be camel-cased (i.e. `myField`). Field names must be unique for each model.
- `type`: The type of the field. Read below for more information on types and validation.

In the case of defining the field in the model definition, the field `name` should be defined as the key that the type string corresponds to.

##### Field types

There are a few standard field types corresponding to primitives and certain common field type values:

```
boolean string number date object
booleanArray numberArray stringArray dateArray
```

#### Property definitions

Properties can be defined as part of a model definition.

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      },
      properties: {
        fullName: record => `${record.firstName} ${record.lastName}`,
        formalName: {
          body: record => `${record.lastName} ${record.firstName}`,
          cache: true
        }
      }
    }
  ]
});
```

Properties are specified as key-value pairs. The value can either be a function or an object containing a `body` and optional `cache`.

Property functions can expect up to two arguments. If they do not expect any arguments or only expect a single argument, they are called with the current record as their sole argument. If they expect two arguments, they are considered "lazy" properties and their second argument is automatically bound to the current schema object representation (`{ models, serializers }`). These can only be defined as part of the model definition, are added to the model post initialization and are useful if you need access to other models or serializers.

Properties can receive an additional boolean key, `cache`, indicating if the property should be cached. Property caches are persisted as long as there are no field changes for a given record and cannot be specified for relationships. This means that properties that depend on other properties, methods or external values are not good candidates for caching. If a cached property is stale, yo can force a recalculation is via updating any field on the record manually. Additionally, all cached properties across all models can be cleared via `Schema.prototype.clearPropertyCache()`.

Boolean properties can receive an additional string key, `inverse`, defining the name of the inverse boolean property. Inverse boolean properties are automatically updated when the property is updated and vice versa and can be called like regular properties on any records of the model. Caching is also applied to inverse boolean properties, if specified via the `cache` boolean key.

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      },
      properties: {
        fullName: record => `${record.firstName} ${record.lastName}`,
        formalName: {
          body: record => `${record.lastName} ${record.firstName}`,
          cache: true
        },
        hasLongLastName: {
          body: record => record.lastName.length > 10,
          inverse: 'hasShortLastName'
        },
      }
    },
    {
      name: 'AnotherModel',
      properties: {
        myModelName: (record, { models: { myModel }}) => myModel.name
      }
    }
  ]
});
```

#### Method definitions

Methods can be defined as part of a model definition.

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      },
      methods: {
        prefixedName: (record, prefix) => `${prefix} ${record.lastName}`,
        suffixedName: (record, suffix) => `${record.firstName} ${suffix}`,
        isModelNameCorrect: (record, { models: { myModel }}, valey) => value === myModel.name
      }
    }
  ]
});
```

Methods definition are specified as key-value pairs.

Methods expect any number of arguments, the current record and any arguments passed to them when called, and may return any type of value. They are called with the current record as their first argument, any other arguments passed to them at call time and the current schema object representation (`{ models, serializers }`) as their last argument. This means that methods can access other models and serializers.

#### Scope definitions

Scopes can be defined as part of a model definition.

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      },
      scopes: {
        smiths: record => record.lastName === 'Smith'
        does: record => record.lastName === 'Doe'
        orderedSmiths: {
          matcher: record => record.lastName === 'Smith',
          sorter: (a, b) => a.firstName.localeCompare(b.firstName)
        }
      }
    }
  ]
});
```

Scopes definition are specified as key-value pairs.

Scopes expect one argument, the current record, and must return a boolean indicating if the scope should include the record or not. Alternatively, scopes can be specified as objects when defined as part of the model definition with a `matcher` function and a `sorter` function. This will create an ordered scope that will always apply the `sorter` to matched records before returning them.

#### Relationship definitions

**Note:** The relationships API is not currently stable and is considered experimental. While no major changes are expected in the future, it might not be fit for use in production just yet.

Relationships can be defined as part of the schema definition.

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'Person',
      fields: {
        username: 'string',
      }
    },
    {
      name: 'Transaction',
      fields: {
        amount: 'number',
      },
    }
  ],
  relationships: [
    {
      from: { model: 'Transaction', name: 'payer' },
      to: { model: 'Person', name: 'outgoingTransactions' },
      type: 'manyToOne'
    },
    {
      from: { model: 'Transaction', name: 'payee' },
      to: { model: 'Person', name: 'incomingTransactions' },
      type: 'manyToOne'
    }
  ]
});
```

A relationship definition is an object with the following keys:

- `from`: Either a string representing the name of a model or an object with a `model` key and a `name` key. In the latter case, the `name` key is the name that will be given to the field in the specified `model`.
- `to`: Either a string representing the name of a model or an object with a `model` key and a `name` key. In the latter case, the `name` key is the name that will be given to the field in the specified `model`.
- `type`: One of `oneToOne`, `oneToMany`, `manyToOne`, `manyToMany` depending on the type of relationship.

When a relationship is defined between to models, the model specified as `from` will receive a new field named accordingly. Similarly, the `to` model will receive a new property instead that performs the reverse operation. Only the field on the `from` model is writeable.

The names for the field and property are automatically generated if not specified, must be valid names and not already exist in the model. For singular relationships, the name of the other model is used, whereas for plural the name of the model followed by `Set`. For example, a `manyToOne` relationship between two models, `Person` and `Transaction`, would be named `transactionSet` on `Person` and `person` on `Transaction`.

Relationships between records of the same model are allowed. The only caveat is that symemtric (i.e. `oneToOne` and `manyToMany`) relationships in the same model need to be named on both sides.

#### Serializer definitions

Serializers can be defined as part of the schema definition.

```js
import jsiqle from '@jsiqle/core';

const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      }
    }
  ],
  serializers: [
    {
      name: 'MySerializer',
      attributes: [
        'firstName,
        ['lastName', 'surname'],
        ['fullName', 'name']
        'truncatedName'
      ],
      methods: {
        fullName: (record) => `${record.firstName} ${record.lastName}`,
        truncatedName: (record) => record.fullName.slice(0, 20)
      }
    }
  ]
});
```

Serializer definition options require an object argument with the following attributes:

- `name`: The name of the serializer. Must be unique.
- `attributes`: An array of strings or arrays of strings. Each string represents the name of a model field or property or a serializer method. Each array represents the name of a model field or property or a serializer method and the name that should be used in the serializer. For example, `['lastName', 'surname']` would create a field named `surname` in the serializer that would be populated with the value of the `lastName` field on the model.
- `methods`: An object with key-value pairs. Each key represents the name of a serializer method and each value a function that will be called with the current record as its first argument and any arguments passed to the serializer at call time as an object as its second argument. The method can return any value.

### Record manipulation

At the heart of datasets are records, which represent individual data points. Each record belongs to a model and must comply with the model's definition.

#### Creating records

Records can be created using the `Model.prototype.createRecord()` method:

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      },
      properties: {
        fullName: record => `${record.firstName} ${record.lastName}`
      }
    }
  ]
});

const MyModel = MySchema.getModel('MyModel');
MyModel.createRecord({ id: 'jsmith', firstName: 'John', lastName: 'Smith' });
MyModel.createRecord({ id: 'jdoe', firstName: 'John', lastName: 'Doe' });
```

Each record definition consists of an object with the appropriate key-value pairs. Fields without a value will be automatically set to `null`. All records must contain an `id` key with a string value that is unique within the model. Key-value pairs that do not match a field definition will be stored in the record. This can be useful for fields that might be added in later operations (e.g. adding relationships to a populated model).

#### Updating records

Records can be updated in place (i.e. retrieving them from the record set and updating their attributes). They can also be updated by calling `Model.prototype.updateRecord()`:

```js
MyModel.records.first.firstName = 'Jim';
MyModel.updateRecord('jdoe', { firstName: 'Josh' });
```

When calling `Model.prototype.updateRecord()`, the given object will be merged into the existing record, allowing for partial record updating.

#### Removing records

Records can be removed using `Model.prototype.removeRecord()`. Note that record removal does not currently run any validations or perform any cascade operations to ensure relationship stability.

```js
MyModel.removeRecord('jdoe');
```

### Querying

Data from a model is stored in records that make up the model's record set. Records and record sets can be queried in various ways.

#### Querying individual models

To query the record set of an individual model, use the `Model.prototype.records` getter. This returns the record set along with all the tools neccessary to filter and transform results.

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      },
      properties: {
        fullName: record => `${record.firstName} ${record.lastName}`
      }
    }
  ]
});

const MyModel = MySchema.getModel('MyModel');
MyModel.createRecord({ id: 'jsmith', firstName: 'John', lastName: 'Smith' });
MyModel.createRecord({ id: 'jdoe', firstName: 'John', lastName: 'Doe' });

const records = MyModel.records;
```

#### Record set operations

Record sets can be filtered, mapped and sorted much like regular arrays. Here's a list of operations:

- `RecordSet.prototype.forEach()`: Executes a provided function once for every element in the calling record set. This method takes a callback function as an argument that expects three arguments (`record`, `id`, `recordSet`), similar to `Array.prototype.forEach()`. The method does not return a result.
- `RecordSet.prototype.map()`: Creates an array or object populated with the results of calling a provided mapping function on every element in the calling record set. This method takes a mapping callback function as an argument that expects three arguments (`record`, `id`, `recordSet`), similar to `Array.prototype.map()`. The result is an array object with each id mapped to the result of the mapping function. Pass the `{ flat: true }` option to return an array instead of an object.
- `RecordSet.prototype.reduce()`: Executes a user-supplied reducer callback function on each element of the record set, passing in the return value from the calculation on the preceding element. This method takes a reducer callback function as an argument that expects four arguments (`accumulator`, `record`, `id`, `recordSet`) and an initial value, similar to `Array.prototype.reduce()`. The final result of running the reducer across all elements of the record set is a single value.
- `RecordSet.prototype.filter()`: Creates a new record set or array with all elements that pass the test implemented by the provided filtering function. This method takes a filtering callback function as an argument that expects three arguments (`record`, `id`, `recordSet`), similar to `Array.prototype.filter()`. The result is a record set or array containing only the records that pass the test. Pass the `{ flat: true }` option to return an array instead of a record set.
- `RecordSet.prototype.find()`: Retrieves the first record matching the condition implemented by the provided testing function. This method takes a testing callback function as an argument that expects three arguments (`record`, `id`, `recordSet`), similar to `Array.prototype.find()`. The result is a record or `undefined` if none match the condition.
- `RecordSet.prototype.findId()`: Same as `RecordSet.prototype.find()` except that the resulting value is the record's id instead of the record itself.
- `RecordSet.prototype.only()`: Returns a new record set containing only objects that match the id/ids provided. Records are returned in order of appearance in the provided ids. Expects any number of ids as arguments.
- `RecordSet.prototype.except()`: Returns a new record set containing only objects that don't match the id/ids provided. Expects any number of ids as arguments.
- `RecordSet.prototype.every()`: Returns a boolean indicating if all the records in the record set pass the test implemented by the provided testing function. This method takes a testing callback function as an argument that expects three arguments (`record`, `id`, `recordSet`), similar to `Array.prototype.every()`.
- `RecordSet.prototype.some()`: Returns a boolean indicating if any of the records in the record set pass the test implemented by the provided testing function. This method takes a testing callback function as an argument that expects three arguments (`record`, `id`, `recordSet`), similar to `Array.prototype.some()`.
- `RecordSet.prototype.where()`: Creates a new record set with all elements that pass the test implemented by the provided filtering function. This method takes a filtering callback function as an argument that expects three arguments (`record`, `id`, `recordSet`), similar to `Array.prototype.filter()`. The result is a record set containing only the records that pass the test.
- `RecordSet.prototype.whereNot()`: Creates a new record set with all elements that fail the test implemented by the provided filtering function. This method takes a filtering callback function as an argument that expects three arguments (`record`, `id`, `recordSet`), similar to `Array.prototype.filter()`. The result is a record set containing only the records that fail the test.

#### Attribute selection

Specific attributes can be selected from records via the following properties:

- `RecordSet.prototype.select()`: Expects any number of field names in a record. Returns an array of objects with only the selected fields.
- `RecordSet.prototype.pluck()`: Expects any number of field names in a record. Returns an array of arrays with only the selected field values. If only one key is provided, an array of individual attributes will be returned instead.

#### Sorting and grouping

Record sets can be grouped or sorted via the following properties:

- `RecordSet.prototype.groupBy()`: Expects a field name and groups the records based on its value. Returns an object with value-based keys containing record sets.
- `RecordSet.prototype.sort()`: Sorts the elements of the record set and returns a new sorted record set. Expects a comparator callback function as an argument that takes three arguments (`firstValue`, `secondValue`, `firstId`, `secondId`) and returns an appropriate value for sorting similar to `Array.prototype.sort()`.

#### Iterating over records

Record sets are iterable, meaning you can use `for` loops to iterate over them, similar to a regular ES6 `Map`. Additionally, `RecordSet.prototype.batchIterator()` is available expecting a `batchSize` numeric argument and allowing for the records in a record set to be iterated in batches. An additional `{ flat: true }` argument can be passed to return an array of records instead of a record set for each batch.

#### Accessing specific records

You can acces the first record of a record set using `RecordSet.prototype.first`. Similarly, you can acces the last record of a record set using `RecordSet.prototype.last`.

Additionally, you can get the first `n` elements of a record set using `RecordSet.prototype.limit()` with an appropriate numeric argument or skip over them and get all other records using `RecordSet.prototype.offset()` with an appropriate numeric argument. These properties can be combined to get specific records in a record set based on the order of insertion.


#### Querying scopes

Scopes defined on a model are defined as getters on its record set. Thus, they can be used by calling them on the record set:

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      },
      scopes: {
        smiths: record => record.lastName === 'Smith'
      }
    }
  ]
});

const MyModel = MySchema.getModel('MyModel');
MyModel.createRecord({ id: 'jsmith', firstName: 'John', lastName: 'Smith' });
MyModel.createRecord({ id: 'jdoe', firstName: 'John', lastName: 'Doe' });

const smithsFamily = MyModel.records.smiths;
```

#### Querying relationships

Relationships can be queried from either side of the relationship using the field/property name added to the model. For more information refer to the section about relationship definitions and how they are represented in models.

#### Querying from the schema

The schema provides a quick way to access a model, record or even an attribute using the `Schema.prototype.get()` method. This method takes a `.`-separated path and returns the value at that particular location:

```js
import jsiqle from '@jsiqle/core';
const MySchema = jsiqle.create({
  models: [
    {
      name: 'MyModel',
      fields: {
        firstName: 'string',
        lastName: 'string'
      },
    }
  ]
});

const MyModel = MySchema.getModel('MyModel');
MyModel.createRecord({ id: 'jsmith', firstName: 'John', lastName: 'Smith' });
MyModel.createRecord({ id: 'jdoe', firstName: 'John', lastName: 'Doe' });

const myModel = MySchema.get('MyModel');
const johnSmith = MySchema.get('MyModel.jsmith');
const johnSmithsName = MySchema.get('MyModel.jsmith.firstName');
```

### Serializing data

Records and record sets can be serialized to regular objects, arrays or JSON. Calling `JSON.stringify()` will suffice in most cases, as all records and record sets have appropriate properties to handle serialization. Apart from that, `Record.prototype.toObject()` can be called for individual records to convert them into regular objects.

Additionally, record sets implement the following serialization properties:

- `RecordSet.prototype.toArray()`: Returns an array of records contained in the record set.
- `RecordSet.prototype.toObject()`: Returns an object of records representing the key-value pairs of the records in the record set.

Both of these methods can be called with an optional `{ flat: true }` options argument to convert records into objects.

#### Using serializers

Serializers can be used to serialize records and record sets into custom formats. They are defined on the schema level and can be used by calling one of the methods available as part of the individual serializer:

- `Serializer.prototype.serialize()`: Serializes a record in the format defined by the serializer. Expects a record as the first argument and an optional options object as the second argument.
- `Serializer.prototype.serializeArray()`: Serializes an array of records in the format defined by the serializer. Expects an array of records as the first argument and an optional options object as the second argument.
- `Serializer.prototype.serializeRecordSet()`: Serializes a record set in the format defined by the serializer. Expects a record set as the first argument and an optional options object as the second argument. A third argument can be passed to specify a function mapping each record to a key in the serialized object.

### Naming conventions

Certain naming conventions and rules are in place.

Generally, names can only include alphanumeric characters and underscores and are expected to be unique in their scope. There are a few exceptions to this rule that are not enforced (e.g. scope names), but it should be followed across as part of the convention.

Additionally, conventions dictate that model and schema names are title-cased, and that all other names are camel-cased. Variables should also match this convention.

### Terminology

To clear up any confusion, here are the names of the definition types and the names of the corresponding data objects they create:

- A schema is a set of definitions that contain models, fields, relationships etc. The data contained within a schema is called a dataset.
- A model is a set of field, property and scope definitions. The data contained within a model is called a record set and each individual item within it is called a record.
- A record is a set of values corresponding to different keys. Each of these values is called an attribute.

## License

This project is licensed under the MIT license.
