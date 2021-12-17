!(function (root, factory) {
  typeof exports == 'object' && typeof module == 'object'
    ? (module.exports = factory())
    : typeof define == 'function' && define.amd
    ? define([], factory)
    : typeof exports == 'object'
    ? (exports['@jsiqle/core'] = factory())
    : (root['@jsiqle/core'] = factory());
})(global, function () {
  return (() => {
    'use strict';
    var __webpack_require__ = {
        n: module => {
          var getter =
            module && module.__esModule ? () => module.default : () => module;
          return __webpack_require__.d(getter, { a: getter }), getter;
        },
        d: (exports, definition) => {
          for (var key in definition)
            __webpack_require__.o(definition, key) &&
              !__webpack_require__.o(exports, key) &&
              Object.defineProperty(exports, key, {
                enumerable: !0,
                get: definition[key],
              });
        },
        o: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop),
        r: exports => {
          typeof Symbol != 'undefined' &&
            Symbol.toStringTag &&
            Object.defineProperty(exports, Symbol.toStringTag, {
              value: 'Module',
            }),
            Object.defineProperty(exports, '__esModule', { value: !0 });
        },
      },
      __webpack_exports__ = {};
    __webpack_require__.r(__webpack_exports__),
      __webpack_require__.d(__webpack_exports__, { default: () => src });
    var isUndefined = require('events'),
      external_events_default = __webpack_require__.n(isUndefined),
      symbols = [
        'fields',
        'key',
        'keyType',
        'methods',
        'scopes',
        'relationships',
        'relationshipField',
        'validators',
        'recordModel',
        'recordValue',
        'wrappedRecordValue',
        'recordHandler',
        'recordTag',
        'defaultValue',
        'addScope',
        'addRelationshipAsField',
        'addRelationshipAsMethod',
        'getField',
        'getMethod',
        'removeScope',
        'copyScopes',
        'instances',
        'isRecord',
        'groupTag',
        'get',
        'handleExperimentalAPIMessage',
      ].reduce((acc, curr) => ((acc['$' + curr] = Symbol.for(curr)), acc), {});
    class NameError extends Error {
      constructor(message) {
        super(message), (this.name = 'NameError');
      }
    }
    class ValidationError extends Error {
      constructor(message) {
        super(message), (this.name = 'ValidationError');
      }
    }
    class DuplicationError extends Error {
      constructor(message) {
        super(message), (this.name = 'DuplicationError');
      }
    }
    class DefaultValueError extends Error {
      constructor(message) {
        super(message), (this.name = 'DefaultValueError');
      }
    }
    class ExperimentalAPIUsageError extends Error {
      constructor(message) {
        super(message), (this.name = 'ExperimentalAPIUsageError');
      }
    }
    class Validator {
      static unique(field) {
        return (value, data) =>
          data.every(item => item[field] !== value[field]);
      }
      static length(field, [min, max]) {
        return value =>
          value[field].length >= min && value[field].length <= max;
      }
      static minLength(field, min) {
        return value => value[field].length >= min;
      }
      static maxLength(field, max) {
        return value => value[field].length <= max;
      }
      static range(field, [min, max]) {
        return value => value[field] >= min && value[field] <= max;
      }
      static min(field, min) {
        return value => value[field] >= min;
      }
      static max(field, max) {
        return value => value[field] <= max;
      }
      static integer(field) {
        return value => Number.isInteger(value[field]);
      }
      static regex(field, regex) {
        return value => regex.test(value[field]);
      }
      static uniqueValues(field) {
        return value => new Set(value[field]).size === value[field].length;
      }
      static sortedAscending(field) {
        return value =>
          value[field].every(
            (item, index) => index === 0 || item >= value[field][index - 1]
          );
      }
      static sortedDescending(field) {
        return value =>
          value[field].every(
            (item, index) => index === 0 || item <= value[field][index - 1]
          );
      }
      static custom(field, fn) {
        return (value, data) =>
          fn(
            value[field],
            data.map(item => item[field])
          );
      }
    }
    const restrictedNames = {
        Model: ['toString', 'toObject', 'toJSON'],
        Field: ['toString', 'toObject', 'toJSON'],
        Relationship: ['toString', 'toObject', 'toJSON'],
      },
      validateName = (objectType, name) => {
        var [isValid, message] = ((name, restrictedNames = []) =>
          typeof name != 'string'
            ? [!1, 'must be a string']
            : name
            ? /^\d/.test(name)
              ? [!1, 'cannot start with a number']
              : restrictedNames.includes(name)
              ? [!1, 'is reserved']
              : [
                  /^\w+$/.test(name),
                  'must contain only alphanumeric characters, numbers or underscores',
                ]
            : [!1, 'is required'])(name, restrictedNames[objectType]);
        if (!isValid) throw new NameError(objectType + ` name ${message}.`);
        return name;
      },
      capitalize = ([first, ...rest]) => first.toUpperCase() + rest.join(''),
      reverseCapitalize = ([first, ...rest]) =>
        first.toLowerCase() + rest.join(''),
      deepClone = obj => {
        if (obj === null) return null;
        if (obj instanceof Date) return new Date(obj);
        let clone = Object.assign({}, obj);
        return (
          Object.entries(clone).forEach(
            ([key, value]) =>
              (clone[key] =
                typeof obj[key] == 'object' ? deepClone(value) : value)
          ),
          Array.isArray(obj)
            ? ((clone.length = obj.length), Array.from(clone))
            : clone
        );
      },
      validateObjectWithUniqueName = (
        { objectType, parentType, parentName },
        obj,
        collection
      ) => {
        if (!(obj => obj && typeof obj == 'object')(obj))
          throw new TypeError(objectType + ` ${obj} is not an object.`);
        if (
          ((collection, item) => collection.includes(item))(
            collection,
            obj.name
          )
        )
          throw new DuplicationError(
            `${parentType} ${parentName} already has a ${objectType.toLowerCase()} named ${
              obj.name
            }.`
          );
        return !0;
      };
    var isBoolean = val => typeof val == 'boolean',
      isNumber = val => typeof val == 'number' && val == val,
      isString = val => typeof val == 'string',
      isDate = val => val instanceof Date,
      and =
        (...types) =>
        val =>
          types.every(type => type(val));
    const or =
      (...types) =>
      val =>
        types.some(type => type(val));
    var isPositive = val => val >= 0;
    const isArrayOf = type => val => Array.isArray(val) && val.every(type);
    var standardTypes = shape => {
        const props = Object.keys(shape);
        return val => {
          return (
            val != null &&
            typeof val == 'object' &&
            (props.length === 0 ||
              (Object.keys(val).length === props.length &&
                props.every(prop => shape[prop](val[prop]))))
          );
        };
      },
      isObjectOf = type => val =>
        val != null &&
        typeof val == 'object' &&
        Object.keys(val).every(prop => type(val[prop])),
      isNull = val => val === null,
      isUndefined = val => void 0 === val;
    const isNil = or(isNull, isUndefined);
    const types = {
      bool: isBoolean,
      number: isNumber,
      positiveNumber: and(isNumber, isPositive),
      string: isString,
      date: isDate,
      stringOrNumber: or(isString, isNumber),
      numberOrString: or(isString, isNumber),
      enum:
        (...values) =>
        val =>
          values.includes(val),
      boolArray: isArrayOf(isBoolean),
      numberArray: isArrayOf(isNumber),
      stringArray: isArrayOf(isString),
      dateArray: isArrayOf(isDate),
      oneOf: or,
      arrayOf: isArrayOf,
      oneOrArrayOf: type => val => or(isArrayOf(type), type)(val),
      object: standardTypes,
      objectOf: isObjectOf,
      optional: type => val => or(isNil, type)(val),
      null: isNull,
      undefined: isUndefined,
      nil: isNil,
    };
    standardTypes = {
      boolean: { type: isBoolean, defaultValue: !1 },
      number: { type: isNumber, defaultValue: 0 },
      positiveNumber: { type: and(isNumber, isPositive), defaultValue: 0 },
      string: { type: isString, defaultValue: '' },
      date: { type: isDate, defaultValue: new Date() },
      stringOrNumber: { type: or(isString, isNumber), defaultValue: '' },
      numberOrString: { type: or(isString, isNumber), defaultValue: 0 },
      booleanArray: { type: isArrayOf(isBoolean), defaultValue: [] },
      numberArray: { type: isArrayOf(isNumber), defaultValue: [] },
      stringArray: { type: isArrayOf(isString), defaultValue: [] },
      dateArray: { type: isArrayOf(isDate), defaultValue: [] },
      object: { type: standardTypes({}), defaultValue: {} },
      booleanObject: { type: isObjectOf(isBoolean), defaultValue: { a: !0 } },
      numberObject: { type: isObjectOf(isNumber), defaultValue: {} },
      stringObject: { type: isObjectOf(isString), defaultValue: {} },
      dateObject: { type: isObjectOf(isDate), defaultValue: {} },
      objectArray: { type: isArrayOf(standardTypes({})), defaultValue: [] },
    };
    const key = and(isString, val => val.trim().length !== 0),
      { $defaultValue, $validators } = symbols;
    class Field {
      #name;
      #defaultValue;
      #required;
      #type;
      #validators;
      constructor({
        name,
        type,
        required = !1,
        defaultValue = null,
        validators = {},
      }) {
        (this.#name = validateName('Field', name)),
          (this.#required = Field.#validateRequired(required)),
          (this.#type = Field.#validateType(type, required)),
          (this.#defaultValue = Field.#validateDefaultValue(
            defaultValue,
            this.#type,
            this.#required
          )),
          (this.#validators = new Map()),
          Object.entries(validators).forEach(([validatorName, validator]) => {
            this.addValidator(validatorName, validator);
          });
      }
      addValidator(validatorName, validator) {
        this.#validators.set(
          ...Field.#parseFieldValidator(this.#name, validatorName, validator)
        );
      }
      get name() {
        return this.#name;
      }
      get required() {
        return this.#required;
      }
      typeCheck(value) {
        return this.#type(value);
      }
      get [$defaultValue]() {
        return this.#defaultValue;
      }
      get [$validators]() {
        return this.#validators;
      }
      static #validateType(type, required) {
        if (typeof type != 'function')
          throw new TypeError('Field type must be a function.');
        return required ? type : types.optional(type);
      }
      static #validateRequired(required) {
        if (typeof required != 'boolean')
          throw new TypeError('Field required must be a boolean.');
        return required;
      }
      static #validateDefaultValue(defaultValue, type, required) {
        if (required && types.nil(defaultValue))
          throw new ValidationError(
            'Default value cannot be null or undefined.'
          );
        if (!type(defaultValue))
          throw new ValidationError('Default value must be valid.');
        return defaultValue;
      }
      static #parseFieldValidator(fieldName, validatorName, validator) {
        if (void 0 !== Validator[validatorName])
          return [
            '' + fieldName + capitalize(validatorName),
            Validator[validatorName](fieldName, validator),
          ];
        if (typeof validator != 'function')
          throw new TypeError(`Validator ${validatorName} is not defined.`);
        return [
          '' + fieldName + capitalize(validatorName),
          Validator.custom(fieldName, validator),
        ];
      }
    }
    Object.entries(standardTypes).forEach(([typeName, standardType]) => {
      const { type, defaultValue: typeDefaultValue } = standardType;
      (Field[typeName] = options =>
        typeof options == 'string'
          ? new Field({ name: options, type })
          : new Field({ ...options, type })),
        (Field[typeName + 'Required'] = options => {
          if (typeof options == 'string')
            return new Field({
              name: options,
              type,
              required: !0,
              defaultValue: typeDefaultValue,
            });
          var defaultValue = options.defaultValue || typeDefaultValue;
          return new Field({ ...options, type, required: !0, defaultValue });
        });
    }),
      (Field.enum = ({ name, values }) =>
        new Field({ name, type: types.enum(...values) })),
      (Field.enumRequired = ({ name, values, defaultValue = values[0] }) =>
        new Field({
          name,
          type: types.enum(...values),
          required: !0,
          defaultValue,
        })),
      (Field.auto = autoField => {
        autoField = typeof autoField == 'string' ? autoField : autoField.name;
        const generator = (function* () {
          let i = 0;
          for (;;) yield i++;
        })();
        let currentValue = 0;
        autoField = new Field({
          name: autoField,
          type: value => value === currentValue,
          required: !0,
          defaultValue: currentValue,
        });
        return (
          Object.defineProperty(autoField, $defaultValue, {
            get() {
              var value = generator.next().value;
              return (currentValue = value);
            },
          }),
          autoField
        );
      });
    const {
      $recordValue,
      $wrappedRecordValue,
      $recordHandler,
      $recordModel,
      $recordTag,
      $key,
    } = symbols;
    class Record {
      #recordValue;
      #recordHandler;
      #proxiedRecord;
      constructor(value, handler) {
        return (
          (this.#recordValue = value),
          (this.#recordHandler = handler),
          (this.#proxiedRecord = new Proxy(this, this.#recordHandler)),
          this.#proxiedRecord
        );
      }
      get [$recordHandler]() {
        return this.#recordHandler;
      }
      get [$recordValue]() {
        return this.#recordValue;
      }
      get [$wrappedRecordValue]() {
        return this.#proxiedRecord;
      }
      get [$recordModel]() {
        return this.#recordHandler.model;
      }
      get [$recordTag]() {
        var model = this[$recordModel],
          key = model[$key].name;
        return model.name + '#' + this[$recordValue][key];
      }
      get [Symbol.toStringTag]() {
        return this[$recordTag];
      }
    }
    const record = Record,
      partial_$recordTag = symbols['$recordTag'];
    class PartialRecord {
      #tag;
      constructor(value, tag) {
        Object.keys(value).forEach(key => {
          this[key] = value[key];
        }),
          (this.#tag = tag);
      }
      get [partial_$recordTag]() {
        return this.#tag;
      }
      get [Symbol.toStringTag]() {
        return this[partial_$recordTag];
      }
      toObject() {
        return { ...this };
      }
      toJSON() {
        return this.toObject();
      }
    }
    const fragment_$recordTag = symbols['$recordTag'];
    class RecordFragment extends Array {
      #tag;
      constructor(values, tag) {
        super(),
          values.forEach(value => {
            this.push(value);
          }),
          (this.#tag = tag);
      }
      get [fragment_$recordTag]() {
        return this.#tag;
      }
      get [Symbol.toStringTag]() {
        return this[fragment_$recordTag];
      }
      toObject() {
        return [...this];
      }
      toJSON() {
        return this.toObject();
      }
    }
    const {
      $recordModel: set_$recordModel,
      $recordTag: set_$recordTag,
      $scopes,
      $addScope,
      $removeScope,
      $copyScopes,
      $isRecord,
      $key: set_$key,
    } = symbols;
    class RecordSet extends Map {
      #frozen;
      #scopes;
      constructor({ iterable = [], copyScopesFrom = null } = {}) {
        super();
        for (var [key, value] of iterable) this.set(key, value);
        (this.#scopes = new Map()),
          copyScopesFrom && this[$copyScopes](copyScopesFrom),
          (this.#frozen = !1);
      }
      freeze() {
        return (this.#frozen = !0), this;
      }
      set(key, value) {
        if (this.#frozen)
          throw new TypeError('Cannot modify a frozen RecordSet.');
        return super.set(key, value), this;
      }
      delete(key) {
        if (this.#frozen)
          throw new TypeError('Cannot modify a frozen RecordSet.');
        return super.delete(key);
      }
      clear() {
        if (this.#frozen)
          throw new TypeError('Cannot modify a frozen RecordSet.');
        super.clear();
      }
      map(callbackFn) {
        return [...this.entries()].reduce(
          (newMap, [key, value]) => (
            (newMap[key] = callbackFn(value, key, this)), newMap
          ),
          {}
        );
      }
      flatMap(callbackFn) {
        return [...this.entries()].map(([key, value]) =>
          callbackFn(value, key, this)
        );
      }
      reduce(callbackFn, initialValue) {
        return [...this.entries()].reduce(
          (acc, [key, value]) => callbackFn(acc, value, key, this),
          initialValue
        );
      }
      filter(callbackFn) {
        return [...this.entries()]
          .reduce(
            (newMap, [key, value]) => (
              callbackFn(value, key, this) && newMap.set(key, value), newMap
            ),
            new RecordSet({ copyScopesFrom: this })
          )
          .freeze();
      }
      flatFilter(callbackFn) {
        return [...this.entries()].reduce(
          (arr, [key, value]) => (
            callbackFn(value, key, this) && arr.push(value), arr
          ),
          []
        );
      }
      find(callbackFn) {
        var match = [...this.entries()].find(([key, value]) =>
          callbackFn(value, key, this)
        );
        if (match) return match[1];
      }
      findKey(callbackFn) {
        var match = [...this.entries()].find(([key, value]) =>
          callbackFn(value, key, this)
        );
        if (match) return match[0];
      }
      only(...keys) {
        return new RecordSet({
          iterable: [...this.entries()].filter(([key]) => keys.includes(key)),
          copyScopesFrom: this,
        }).freeze();
      }
      except(...keys) {
        return new RecordSet({
          iterable: [...this.entries()].filter(([key]) => !keys.includes(key)),
          copyScopesFrom: this,
        }).freeze();
      }
      sort(comparatorFn) {
        var sorted = [...this.entries()].sort(
          ([key1, value1], [key2, value2]) =>
            comparatorFn(value1, value2, key1, key2)
        );
        return new RecordSet({
          iterable: sorted,
          copyScopesFrom: this,
        }).freeze();
      }
      every(callbackFn) {
        return (
          this.size === 0 ||
          [...this.entries()].every(([key, value]) =>
            callbackFn(value, key, this)
          )
        );
      }
      some(callbackFn) {
        return (
          this.size !== 0 &&
          [...this.entries()].some(([key, value]) =>
            callbackFn(value, key, this)
          )
        );
      }
      select(...keys) {
        return new RecordSet({
          iterable: [...this.entries()].map(([key, value]) => {
            const obj = {};
            return (
              keys.forEach(key => (obj[key] = value[key])),
              [key, new PartialRecord(obj, value[set_$recordTag])]
            );
          }),
          copyScopesFrom: this,
        }).freeze();
      }
      flatSelect(...keys) {
        return [...this.values()].map(value =>
          keys.reduce((obj, key) => ({ ...obj, [key]: value[key] }), {})
        );
      }
      pluck(...keys) {
        return new RecordSet({
          iterable: [...this.entries()].map(([key, value]) => {
            var values = keys.map(key => value[key]);
            return [key, new RecordFragment(values, value[set_$recordTag])];
          }),
          copyScopesFrom: this,
        }).freeze();
      }
      flatPluck(...keys) {
        const isSingleKey = keys.length === 1;
        return [...this.values()].map(value =>
          isSingleKey ? value[keys[0]] : keys.map(key => value[key])
        );
      }
      groupBy(key) {
        const res = new RecordSet({ copyScopesFrom: this, iterable: [] });
        for (var [recordKey, value] of this.entries()) {
          let keyValue = value[key];
          void 0 !== keyValue &&
            keyValue !== null &&
            keyValue[$isRecord] &&
            (keyValue = value[key][set_$key]),
            res.has(keyValue) ||
              res.set(
                keyValue,
                new RecordGroup({
                  copyScopesFrom: this,
                  iterable: [],
                  groupName: keyValue,
                })
              ),
            res.get(keyValue).set(recordKey, value);
        }
        for (const value of res.values()) value.freeze();
        return res.freeze();
      }
      where(callbackFn) {
        return this.filter(callbackFn);
      }
      whereNot(callbackFn) {
        return this.filter((value, key, map) => !callbackFn(value, key, map));
      }
      *batchIterator(batchSize) {
        let batch = [];
        for (var [, value] of this)
          batch.push(value),
            batch.length === batchSize && (yield batch, (batch = []));
        batch.length && (yield batch);
      }
      limit(n) {
        let records = [];
        for (var [key, value] of this)
          if ((records.push([key, value]), records.length === n)) break;
        return new RecordSet({
          iterable: records,
          copyScopesFrom: this,
        }).freeze();
      }
      offset(n) {
        let counter = 0,
          records = [];
        for (var [key, value] of this)
          counter < n ? counter++ : records.push([key, value]);
        return new RecordSet({
          iterable: records,
          copyScopesFrom: this,
        }).freeze();
      }
      get first() {
        for (var [, value] of this) return value;
      }
      get last() {
        if (this.size !== 0) return [...this.entries()].pop()[1];
      }
      get count() {
        return this.size;
      }
      toArray() {
        return [...this.values()];
      }
      toFlatArray() {
        return [...this.values()].map(value =>
          value instanceof RecordGroup ? value.toFlatArray() : value.toObject()
        );
      }
      toObject() {
        return [...this.entries()].reduce(
          (obj, [key, value]) => ((obj[key] = value), obj),
          {}
        );
      }
      toFlatObject() {
        return [...this.entries()].reduce(
          (obj, [key, value]) => (
            (obj[key] =
              value instanceof RecordGroup
                ? value.toFlatArray()
                : value.toObject()),
            obj
          ),
          {}
        );
      }
      toJSON() {
        return this.toObject();
      }
      get [Symbol.toStringTag]() {
        var records = [...this.values()];
        try {
          const firstModel = records[0][set_$recordModel].name;
          if (
            ((arr, fn) => {
              const eql = fn(arr[0]);
              return arr.every(val => fn(val) === eql);
            })(records, value => value[set_$recordModel].name === firstModel)
          )
            return firstModel;
        } catch (e) {
          return '';
        }
        return '';
      }
      static get [Symbol.species]() {
        return Map;
      }
      [$addScope](name, scope) {
        if (
          (RecordSet.#validateMethod('Scope', name, scope, this.#scopes),
          this[name] ||
            Object.getOwnPropertyNames(RecordSet.prototype).includes(name))
        )
          throw new NameError(`Scope name ${name} is already in use.`);
        this.#scopes.set(name, scope),
          Object.defineProperty(this, name, {
            configurable: !0,
            get: () => this.where(this.#scopes.get(name)),
          });
      }
      [$removeScope](name) {
        this.#scopes.delete(
          RecordSet.#validateContains('Scope', name, this.#scopes)
        ),
          delete this[name];
      }
      [$copyScopes](otherRecordSet) {
        otherRecordSet[$scopes].forEach((scope, name) => {
          this[$addScope](name, scope);
        });
      }
      get [$scopes]() {
        return this.#scopes;
      }
      static #validateMethod(callbackType, callbackName, callback, callbacks) {
        if (typeof callback != 'function')
          throw new TypeError(
            callbackType + ` ${callbackName} is not a function.`
          );
        if (callbacks.has(callbackName))
          throw new DuplicationError(
            callbackType + ` ${callbackName} already exists.`
          );
        return callback;
      }
      static #validateContains(objectType, objectName, objects) {
        if (!objects.has(objectName))
          throw new ReferenceError(
            objectType + ` ${objectName} does not exist.`
          );
        return objectName;
      }
    }
    const set = RecordSet,
      $groupTag = symbols['$groupTag'];
    class RecordGroup extends set {
      #groupName;
      constructor({
        iterable = [],
        copyScopesFrom = null,
        groupName = '',
      } = {}) {
        super({ iterable, copyScopesFrom }), (this.#groupName = groupName);
      }
      get [$groupTag]() {
        return this.#groupName;
      }
      get [Symbol.toStringTag]() {
        return this[$groupTag];
      }
    }
    const {
      $fields,
      $defaultValue: handler_$defaultValue,
      $key: handler_$key,
      $keyType,
      $methods,
      $relationships,
      $validators: handler_$validators,
      $recordValue: handler_$recordValue,
      $wrappedRecordValue: handler_$wrappedRecordValue,
      $recordModel: handler_$recordModel,
      $recordTag: handler_$recordTag,
      $isRecord: handler_$isRecord,
      $get,
    } = symbols;
    class RecordHandler {
      #model;
      constructor(model) {
        this.#model = model;
      }
      get model() {
        return this.#model;
      }
      createRecord(recordData) {
        if (!recordData) throw new TypeError('Record data cannot be empty.');
        if (typeof recordData != 'object')
          throw new TypeError('Record data must be an object.');
        const modelName = this.#getModelName(),
          newRecordKey = RecordHandler.#validateNewRecordKey(
            modelName,
            this.#getKey(),
            recordData[this.#getKey().name],
            this.#model.records
          ),
          clonedRecord = deepClone(recordData),
          extraProperties = Object.keys(clonedRecord).filter(
            property => !this.#hasField(property) && !this.#isModelKey(property)
          );
        extraProperties.length > 0 &&
          console.warn(
            `${modelName} record has extra fields: ${extraProperties.join(
              ', '
            )}.`
          );
        const newRecord = new record(
          {
            [this.#getKey().name]: newRecordKey,
            ...extraProperties.reduce(
              (obj, property) => ({
                ...obj,
                [property]: clonedRecord[property],
              }),
              {}
            ),
          },
          this
        );
        return (
          this.#getFieldNames().forEach(field => {
            this.set(newRecord, field, clonedRecord[field], newRecord, !0);
          }),
          this.#getValidators().forEach((validator, validatorName) => {
            if (!validator(newRecord, this.#model.records))
              throw new RangeError(
                `${modelName} record with key ${newRecordKey} failed validation for ${validatorName}.`
              );
          }),
          [newRecordKey, newRecord]
        );
      }
      get(record, property) {
        return this.#hasRelationshipField(property)
          ? this.#getRelationship(record, property)
          : this.#isModelKey(property) || this.#hasField(property)
          ? this.#getFieldValue(record, property)
          : this.#hasMethod(property)
          ? this.#getMethod(record, property)
          : this.#isCallToSerialize(property)
          ? RecordHandler.#recordToObject(record, this.#model, this)
          : this.#isCallToString(property)
          ? () => this.#getKeyValue(record)
          : this.#isKnownSymbol(property)
          ? this.#getKnownSymbol(record, property)
          : void 0;
      }
      set(record, property, value, receiver, skipValidation) {
        const recordValue = record[handler_$recordValue],
          recordKey = this.#getKeyValue(record),
          otherRecords = this.#model.records.except(recordKey);
        if (this.#hasMethod(property))
          throw new TypeError(
            `${this.#getModelName()} record ${recordKey} cannot set method ${property}.`
          );
        if (this.#hasField(property)) {
          const field = this.#getField(property);
          RecordHandler.#setRecordField(
            this.#model.name,
            recordValue,
            field,
            value
          ),
            field[handler_$validators].forEach((validator, validatorName) => {
              if (
                ![null, void 0].includes(recordValue[property]) &&
                !validator(recordValue, otherRecords)
              )
                throw new RangeError(
                  `${this.#getModelName()} record with key ${recordKey} failed validation for ${validatorName}.`
                );
            });
        } else
          console.warn(
            this.#model.name + ` record has extra field: ${property}.`
          ),
            (recordValue[property] = value);
        return (
          skipValidation ||
            this.#getValidators().forEach((validator, validatorName) => {
              if (!validator(recordValue, otherRecords))
                throw new RangeError(
                  `${this.#getModelName()} record with key ${recordKey} failed validation for ${validatorName}.`
                );
            }),
          !0
        );
      }
      static #setRecordField(modelName, record, field, recordValue) {
        recordValue =
          field.required && types.nil(recordValue)
            ? field[handler_$defaultValue]
            : recordValue;
        if (!field.typeCheck(recordValue))
          throw new TypeError(
            `${modelName} record has invalid value for field ${field.name}.`
          );
        record[field.name] = recordValue;
      }
      static #recordToObject(record, key, handler) {
        const recordValue = record[handler_$recordValue],
          fields = key[$fields],
          methods = key[$methods];
        key = key[handler_$key].name;
        const object = { [key]: recordValue[key] };
        fields.forEach(field => {
          void 0 !== recordValue[field.name] &&
            (object[field.name] = recordValue[field.name]);
        });
        return ({ include = [] } = {}) => {
          var result = object;
          const included = include.map(name => {
            const [field, ...props] = name.split('.');
            return [field, props.join('.')];
          });
          return (
            included.forEach(([includedField, props]) => {
              if (object[includedField])
                if (Array.isArray(object[includedField])) {
                  const records = handler.get(record, includedField);
                  object[includedField] = records.map(record =>
                    record.toObject({ include: [props] })
                  );
                } else
                  object[includedField] = handler
                    .get(record, includedField)
                    .toObject({ include: [props] });
              else
                methods.has(includedField) &&
                  (object[includedField] = handler.get(record, includedField));
            }),
            result
          );
        };
      }
      static #validateNewRecordKey = (
        modelName,
        modelKey,
        recordKey,
        records
      ) => {
        let newRecordKey = recordKey;
        if (
          modelKey[$keyType] === 'string' &&
          !modelKey.typeCheck(newRecordKey)
        )
          throw new TypeError(
            `${modelName} record has invalid value for key ${modelKey.name}.`
          );
        if (
          (modelKey[$keyType] === 'auto' &&
            (newRecordKey = modelKey[handler_$defaultValue]),
          records.has(newRecordKey))
        )
          throw new DuplicationError(
            `${modelName} record with key ${newRecordKey} already exists.`
          );
        return newRecordKey;
      };
      #getModelName() {
        return this.#model.name;
      }
      #getFieldNames() {
        return [...this.#model[$fields].keys()];
      }
      #getValidators() {
        return this.#model[handler_$validators];
      }
      #isModelKey(property) {
        return this.#model[handler_$key].name === property;
      }
      #getKey() {
        return this.#model[handler_$key];
      }
      #getKeyValue(record) {
        return record[handler_$recordValue][this.#model[handler_$key].name];
      }
      #hasField(property) {
        return this.#model[$fields].has(property);
      }
      #getField(property) {
        return this.#model[$fields].get(property);
      }
      #getFieldValue(record, property) {
        return record[handler_$recordValue][property];
      }
      #hasMethod(property) {
        return this.#model[$methods].has(property);
      }
      #getMethod(record, property) {
        return this.#model[$methods].get(property)(
          record[handler_$wrappedRecordValue]
        );
      }
      #hasRelationshipField(property) {
        return (
          !!this.#hasField(property) &&
          this.#model[$relationships].has(property + '.' + property)
        );
      }
      #getRelationship(record, property) {
        return this.#model[$relationships]
          .get(property + '.' + property)
          [$get](this.#getModelName(), property, record[handler_$recordValue]);
      }
      #isCallToSerialize(property) {
        return property === 'toObject' || property === 'toJSON';
      }
      #isCallToString(property) {
        return property === 'toString';
      }
      #isKnownSymbol(property) {
        return [
          handler_$recordModel,
          handler_$recordTag,
          handler_$recordValue,
          handler_$isRecord,
          handler_$key,
        ].includes(property);
      }
      #getKnownSymbol(record, property) {
        return (
          property === handler_$isRecord ||
          (property === handler_$key && this.#getKey(), record[property])
        );
      }
    }
    const handler = RecordHandler,
      {
        $fields: model_$fields,
        $defaultValue: model_$defaultValue,
        $key: model_$key,
        $keyType: model_$keyType,
        $methods: model_$methods,
        $scopes: model_$scopes,
        $relationships: model_$relationships,
        $validators: model_$validators,
        $recordHandler: model_$recordHandler,
        $addScope: model_$addScope,
        $addRelationshipAsField,
        $addRelationshipAsMethod,
        $getField,
        $getMethod,
        $removeScope: model_$removeScope,
        $instances,
        $handleExperimentalAPIMessage,
      } = symbols,
      allStandardTypes = [
        ...Object.keys(standardTypes),
        ...Object.keys(standardTypes).map(type => type + 'Required'),
        'enum',
        'enumRequired',
        'auto',
      ];
    class Model extends external_events_default() {
      #records;
      #recordHandler;
      #fields;
      #key;
      #methods;
      #relationships;
      #validators;
      #updatingField = !1;
      static #instances = new Map();
      constructor({
        name,
        fields = [],
        key = 'id',
        methods = {},
        scopes = {},
        validators = {},
      } = {}) {
        if (
          (super(),
          (this.name = validateName('Model', name)),
          Model.#instances.has(name))
        )
          throw new DuplicationError(`A model named ${name} already exists.`);
        (this.#records = new set()),
          (this.#recordHandler = new handler(this)),
          (this.#key = Model.#parseKey(this.name, key)),
          (this.#fields = new Map()),
          (this.#methods = new Map()),
          (this.#relationships = new Map()),
          (this.#validators = new Map()),
          fields.forEach(field => this.addField(field)),
          Object.entries(methods).forEach(([methodName, method]) => {
            this.addProperty(methodName, method);
          }),
          Object.entries(scopes).forEach(([scopeName, scope]) => {
            this.addScope(scopeName, scope);
          }),
          Object.entries(validators).forEach(([validatorName, validator]) => {
            this.addValidator(validatorName, validator);
          }),
          Model.#instances.set(this.name, this);
      }
      addField(fieldOptions, retrofill) {
        this.#updatingField ||
          this.emit('beforeAddField', { field: fieldOptions, model: this });
        var field = Model.#parseField(this.name, fieldOptions, [
          ...this.#fields.keys(),
          this.#key.name,
          ...this.#methods.keys(),
        ]);
        return (
          this.#fields.set(fieldOptions.name, field),
          this.#updatingField ||
            this.emit('fieldAdded', { field, model: this }),
          this.emit('beforeRetrofillField', { field, retrofill, model: this }),
          Model.#applyFieldRetrofill(field, this.#records, retrofill),
          this.emit('fieldRetrofilled', { field, retrofill, model: this }),
          this.#updatingField ||
            this.emit('change', { type: 'fieldAdded', field, model: this }),
          field
        );
      }
      removeField(name) {
        if (!Model.#validateContains(this.name, 'Field', name, this.#fields))
          return !1;
        var field = this.#fields.get(name);
        return (
          this.#updatingField ||
            this.emit('beforeRemoveField', { field, model: this }),
          this.#fields.delete(name),
          this.#updatingField ||
            (this.emit('fieldRemoved', { field: { name }, model: this }),
            this.emit('change', { type: 'fieldRemoved', field, model: this })),
          !0
        );
      }
      updateField(name, field, newField) {
        if (field.name !== name)
          throw new NameError(
            `Field name ${field.name} does not match ${name}.`
          );
        if (!Model.#validateContains(this.name, 'Field', name, this.#fields))
          throw new ReferenceError(`Field ${name} does not exist.`);
        var prevField = this.#fields.get(name);
        (this.#updatingField = !0),
          this.emit('beforeUpdateField', { prevField, field, model: this }),
          this.removeField(name);
        newField = this.addField(field, newField);
        this.emit('fieldUpdated', { field: newField, model: this }),
          (this.#updatingField = !1),
          this.emit('change', {
            type: 'fieldUpdated',
            field: newField,
            model: this,
          });
      }
      addProperty(name, method) {
        this.emit('beforeAddProperty', {
          method: { name, body: method },
          model: this,
        });
        var methodName = validateName('Method', name);
        this.#methods.set(
          methodName,
          Model.#validateMethod('Method', name, method, [
            ...this.#fields.keys(),
            this.#key.name,
            ...this.#methods.keys(),
          ])
        ),
          this.emit('methodAdded', {
            method: { name: methodName, body: method },
            model: this,
          }),
          this.emit('change', {
            type: 'methodAdded',
            method: { name: methodName, body: method },
            model: this,
          });
      }
      removeMethod(name) {
        if (!Model.#validateContains(this.name, 'Method', name, this.#methods))
          return !1;
        var method = this.#methods.get(name);
        return (
          this.emit('beforeRemoveMethod', {
            method: { name, body: method },
            model: this,
          }),
          this.#methods.delete(name),
          this.emit('methodRemoved', { method: { name }, model: this }),
          this.emit('change', {
            type: 'methodRemoved',
            method: { name, body: method },
            model: this,
          }),
          !0
        );
      }
      addScope(scopeName, scope) {
        this.emit('beforeAddScope', {
          scope: { name: scopeName, body: scope },
          model: this,
        });
        scopeName = validateName('Scope', scopeName);
        this.#records[model_$addScope](scopeName, scope),
          this.emit('scopeAdded', {
            scope: { name: scopeName, body: scope },
            model: this,
          }),
          this.emit('change', {
            type: 'scopeAdded',
            scope: { name: scopeName, body: scope },
            model: this,
          });
      }
      removeScope(name) {
        if (
          !Model.#validateContains(
            this.name,
            'Scope',
            name,
            this.#records[model_$scopes]
          )
        )
          return !1;
        var scope = this.#records[model_$scopes].get(name);
        return (
          this.emit('beforeRemoveScope', {
            scope: { name, body: scope },
            model: this,
          }),
          this.#records[model_$removeScope](name),
          this.emit('scopeRemoved', { scope: { name }, model: this }),
          this.emit('change', {
            type: 'scopeRemoved',
            scope: { name, body: scope },
            model: this,
          }),
          !0
        );
      }
      addValidator(name, validator) {
        this.emit('beforeAddValidator', {
          validator: { name, body: validator },
          model: this,
        }),
          this.#validators.set(
            name,
            Model.#validateMethod('Validator', name, validator, [
              ...this.#validators.keys(),
            ])
          ),
          this.emit('validatorAdded', {
            validator: { name, body: validator },
            model: this,
          }),
          this.emit('change', {
            type: 'validatorAdded',
            validator: { name, body: validator },
            model: this,
          });
      }
      removeValidator(name) {
        if (
          !Model.#validateContains(
            this.name,
            'Validator',
            name,
            this.#validators
          )
        )
          return !1;
        var validator = this.#validators.get(name);
        return (
          this.emit('beforeRemoveValidator', {
            validator: { name, body: validator },
            model: this,
          }),
          this.#validators.delete(name),
          this.emit('validatorRemoved', { validator: { name }, model: this }),
          this.emit('change', {
            type: 'validatorRemoved',
            validator: { name, body: validator },
            model: this,
          }),
          !0
        );
      }
      createRecord(newRecord) {
        this.emit('beforeCreateRecord', { record: newRecord, model: this });
        var [newRecordKey, newRecord] =
          this.#recordHandler.createRecord(newRecord);
        return (
          this.#records.set(newRecordKey, newRecord),
          this.emit('recordCreated', { newRecord, model: this }),
          newRecord
        );
      }
      removeRecord(recordKey) {
        if (!this.#records.has(recordKey))
          return console.warn(`Record ${recordKey} does not exist.`), !1;
        var record = this.#records.get(recordKey);
        return (
          this.emit('beforeRemoveRecord', { record, model: this }),
          this.#records.delete(recordKey),
          this.emit('recordRemoved', {
            record: { [this.#key.name]: recordKey },
            model: this,
          }),
          !0
        );
      }
      updateRecord(recordKey, record) {
        if (typeof record != 'object')
          throw new TypeError('Record data must be an object.');
        if (!this.#records.has(recordKey))
          throw new ReferenceError(`Record ${recordKey} does not exist.`);
        const oldRecord = this.#records.get(recordKey);
        return (
          this.emit('beforeUpdateRecord', {
            record: oldRecord,
            newRecord: { [this.#key.name]: recordKey, ...record },
            model: this,
          }),
          Object.entries(record).forEach(([fieldName, fieldValue]) => {
            oldRecord[fieldName] = fieldValue;
          }),
          this.emit('recordUpdated', { record: oldRecord, model: this }),
          oldRecord
        );
      }
      get records() {
        return this.#records;
      }
      static get [$instances]() {
        return Model.#instances;
      }
      get [model_$recordHandler]() {
        return this.#recordHandler;
      }
      get [model_$fields]() {
        return this.#fields;
      }
      get [model_$key]() {
        return this.#key;
      }
      get [model_$methods]() {
        return this.#methods;
      }
      get [model_$relationships]() {
        return this.#relationships;
      }
      get [model_$validators]() {
        return this.#validators;
      }
      [$addRelationshipAsField](relationship) {
        var { name, type, fieldName, field } = relationship[$getField](),
          relationshipName = name + '.' + fieldName;
        if (
          (this.emit('beforeAddRelationship', {
            relationship: { name, type },
            model: this,
          }),
          [
            ...this.#fields.keys(),
            this.#key.name,
            ...this.#methods.keys(),
          ].includes(fieldName))
        )
          throw new NameError(
            `Relationship field ${fieldName} is already in use.`
          );
        if (this.#relationships.has(relationshipName))
          throw new NameError(
            `Relationship ${relationshipName} is already in use.`
          );
        this.#fields.set(fieldName, field),
          this.#relationships.set(relationshipName, relationship),
          this.emit('relationshipAdded', {
            relationship: { name, type },
            model: this,
          }),
          this.emit('change', {
            type: 'relationshipAdded',
            relationship: { relationship: { name, type }, model: this },
            model: this,
          });
      }
      [$addRelationshipAsMethod](relationship) {
        var { name, type, methodName, method } = relationship[$getMethod](),
          relationshipName = name + '.' + methodName;
        if (
          (this.emit('beforeAddRelationship', {
            relationship: { name, type },
            model: this,
          }),
          [
            ...this.#fields.keys(),
            this.#key.name,
            ...this.#methods.keys(),
          ].includes(methodName))
        )
          throw new NameError(
            `Relationship method ${methodName} is already in use.`
          );
        if (this.#relationships.has(relationshipName))
          throw new NameError(`Relationship ${name} is already in use.`);
        this.#methods.set(methodName, method),
          this.#relationships.set(relationshipName, relationship),
          this.emit('relationshipAdded', {
            relationship: { name, type },
            model: this,
          }),
          this.emit('change', {
            type: 'relationshipAdded',
            relationship: { relationship: { name, type }, model: this },
            model: this,
          });
      }
      static #createKey(options) {
        let name = 'id',
          type = 'string';
        typeof options == 'string'
          ? (name = options)
          : typeof options == 'object' &&
            ((name = options.name || name), (type = options.type || type));
        let keyField;
        return (
          type === 'string'
            ? ((keyField = new Field({
                name,
                type: key,
                required: !0,
                defaultValue: '__emptyKey__',
              })),
              Object.defineProperty(keyField, model_$defaultValue, {
                get() {
                  throw new DefaultValueError(
                    `Key field ${name} does not have a default value.`
                  );
                },
              }))
            : type === 'auto' && (keyField = Field.auto(name)),
          Object.defineProperty(keyField, model_$keyType, {
            get() {
              return type;
            },
          }),
          keyField
        );
      }
      static #parseKey(modelName, key) {
        if (typeof key != 'string' && typeof key != 'object')
          throw new TypeError(
            modelName + ` key ${key} is not a string or object.`
          );
        if (typeof key == 'object' && !key.name)
          throw new TypeError(modelName + ` key ${key} is missing a name.`);
        if (typeof key == 'object' && !['auto', 'string'].includes(key.type))
          throw new TypeError(
            modelName + ` key ${key} type must be either "string" or "auto".`
          );
        return Model.#createKey(key);
      }
      static #parseField(modelName, field, restrictedNames) {
        return (
          validateObjectWithUniqueName(
            { objectType: 'Field', parentType: 'Model', parentName: modelName },
            field,
            restrictedNames
          ),
          allStandardTypes.includes(field.type)
            ? Field[field.type](field)
            : (typeof field.type == 'function' &&
                Schema[$handleExperimentalAPIMessage](
                  `The provided type for ${field.name} is not part of the standard types. Function types are experimental and may go away in a later release.`
                ),
              new Field(field))
        );
      }
      static #validateMethod(
        callbackType,
        callbackName,
        callback,
        restrictedNames
      ) {
        if (typeof callback != 'function')
          throw new TypeError(
            callbackType + ` ${callbackName} is not a function.`
          );
        if (restrictedNames.includes(callbackName))
          throw new DuplicationError(
            callbackType + ` ${callbackName} already exists.`
          );
        return callback;
      }
      static #validateContains(modelName, objectType, objectName, objects) {
        return (
          !!objects.has(objectName) ||
          (console.warn(
            `Model ${modelName} does not contain a ${objectType.toLowerCase()} named ${objectName}.`
          ),
          !1)
        );
      }
      static #applyFieldRetrofill(field, records, retrofill) {
        if (field.required || void 0 !== retrofill) {
          const retrofillFunction =
            void 0 !== retrofill
              ? typeof retrofill == 'function'
                ? retrofill
                : () => retrofill
              : record => record[field.name] || field[model_$defaultValue];
          records.forEach(record => {
            record[field.name] = retrofillFunction(record);
          });
        }
      }
    }
    const {
        $key: relationship_$key,
        $recordValue: relationship_$recordValue,
        $fields: relationship_$fields,
        $getField: relationship_$getField,
        $getMethod: relationship_$getMethod,
        $get: relationship_$get,
        $defaultValue: relationship_$defaultValue,
        $instances: relationship_$instances,
        $handleExperimentalAPIMessage:
          relationship_$handleExperimentalAPIMessage,
      } = symbols,
      relationshipEnum = {
        oneToOne: 'oneToOne',
        oneToMany: 'oneToMany',
        manyToOne: 'manyToOne',
        manyToMany: 'manyToMany',
      };
    class Relationship {
      #type;
      #from;
      #to;
      #name;
      #reverseName;
      #relationshipField;
      #relationshipMethod;
      constructor({ from: fromName, to: toModel, type: toName } = {}) {
        Schema[relationship_$handleExperimentalAPIMessage](
          'Relationships are experimental in the current version. There is neither validation of existence in foreign tables nor guarantee that associations work. Please use with caution.'
        ),
          (this.#type = Relationship.#validateType(toName));
        var [fromModel, fromName, toModel, toName] =
          Relationship.#parseModelsAndNames(fromName, toModel, toName);
        if (
          ((this.#from = fromModel),
          (this.#to = toModel),
          (this.#name = fromName),
          (this.#reverseName = toName),
          this.#to === this.#from &&
            Relationship.#isSymmetric(this.#type) &&
            this.#name === this.#reverseName)
        )
          throw new RangeError(
            'Relationship cannot be symmetric if the from and to models are the same and no name is provided for either one.'
          );
        (this.#relationshipField = Relationship.#createField(
          this.#name,
          this.#type,
          this.#to[relationship_$key]
        )),
          (this.#relationshipMethod = record =>
            this.#getAssociatedRecordsReverse(record));
      }
      [relationship_$getField]() {
        return {
          name: this.#name,
          type: this.#type,
          fieldName: this.#name,
          field: this.#relationshipField,
        };
      }
      [relationship_$getMethod]() {
        return {
          name: this.#name,
          type: this.#type,
          methodName: this.#reverseName,
          method: this.#relationshipMethod,
        };
      }
      [relationship_$get](modelName, property, record) {
        return modelName === this.#from.name && property === this.#name
          ? this.#getAssociatedRecords(record)
          : modelName === this.#to.name && property === this.#reverseName
          ? (console.warn(
              'Relationship getter called by the receiver model. This might indicate an issue with the library and should be reported.'
            ),
            this.#getAssociatedRecordsReverse(record))
          : void 0;
      }
      #getAssociatedRecords(record) {
        if (Relationship.#isToOne(this.#type)) {
          var associationValue = record[this.#name];
          return this.#to.records.get(associationValue);
        }
        const associationValues = record[this.#name] || [],
          associatedRecordsKeyName = this.#to[relationship_$key].name;
        return this.#to.records.where(associatedRecord =>
          associationValues.includes(associatedRecord[associatedRecordsKeyName])
        );
      }
      #getAssociatedRecordsReverse(matcher) {
        const associationValue = matcher[this.#to[relationship_$key].name];
        matcher = Relationship.#isToOne(this.#type)
          ? associatedRecord =>
              associatedRecord[relationship_$recordValue][this.#name] ===
              associationValue
          : associatedRecord => {
              var associatedRecordValue =
                associatedRecord[relationship_$recordValue][this.#name];
              return (
                ![void 0, null].includes(associatedRecordValue) &&
                associatedRecord[relationship_$recordValue][
                  this.#name
                ].includes(associationValue)
              );
            };
        return Relationship.#isFromOne(this.#type)
          ? this.#from.records.find(matcher)
          : this.#from.records.where(matcher);
      }
      static #isToOne(type) {
        return [relationshipEnum.oneToOne, relationshipEnum.manyToOne].includes(
          type
        );
      }
      static #isToMany(type) {
        return [
          relationshipEnum.oneToMany,
          relationshipEnum.manyToMany,
        ].includes(type);
      }
      static #isFromOne(type) {
        return [relationshipEnum.oneToMany, relationshipEnum.oneToOne].includes(
          type
        );
      }
      static #isFromMany(type) {
        return [
          relationshipEnum.manyToOne,
          relationshipEnum.manyToMany,
        ].includes(type);
      }
      static #isSymmetric(type) {
        return [
          relationshipEnum.oneToOne,
          relationshipEnum.manyToMany,
        ].includes(type);
      }
      static #createField(name, type, foreignField) {
        var isSingleSource = Relationship.#isFromOne(type),
          relationshipField = Relationship.#isToMany(type),
          type = relationshipField
            ? types.arrayOf(value => foreignField.typeCheck(value))
            : value => foreignField.typeCheck(value);
        const validators = {};
        isSingleSource && !relationshipField && (validators.unique = !0),
          relationshipField && (validators.uniqueValues = !0);
        relationshipField = new Field({
          name,
          type,
          required: !1,
          defaultValue: relationshipField ? [] : null,
          validators,
        });
        return (
          Object.defineProperty(relationshipField, relationship_$defaultValue, {
            get() {
              throw new DefaultValueError(
                'Relationship field does not have a default value.'
              );
            },
          }),
          relationshipField
        );
      }
      static #validateType(relationshipType) {
        if (!Object.values(relationshipEnum).includes(relationshipType))
          throw new TypeError(
            `Invalid relationship type: ${relationshipType}.`
          );
        return relationshipType;
      }
      static #validateModel(modelName) {
        modelName = typeof modelName == 'string' ? modelName : modelName.model;
        if (!Model[relationship_$instances].has(modelName))
          throw new ReferenceError(`Model ${modelName} does not exist.`);
        return Model[relationship_$instances].get(modelName);
      }
      static #createName(type, to) {
        return Relationship.#isToOne(type)
          ? reverseCapitalize(to)
          : Relationship.#isToMany(type)
          ? reverseCapitalize(to) + 'Set'
          : void 0;
      }
      static #createReverseName = (type, from) =>
        Relationship.#isFromOne(type)
          ? reverseCapitalize(from)
          : Relationship.#isFromMany(type)
          ? reverseCapitalize(from) + 'Set'
          : void 0;
      static #validateModelParams(name) {
        const model = Relationship.#validateModel(name);
        name =
          typeof name == 'string' ? null : validateName('Field', name.name);
        if (name !== null && model[relationship_$fields].has(name))
          throw new DuplicationError(
            `Field ${name} already exists in ${model.name}.`
          );
        return [model, name];
      }
      static #parseModelsAndNames(from, to, type) {
        let fromModel, fromName, toModel, toName;
        return (
          ([fromModel, fromName] = Relationship.#validateModelParams(from)),
          ([toModel, toName] = Relationship.#validateModelParams(to)),
          fromName === null &&
            (fromName = Relationship.#createName(type, toModel.name)),
          toName === null &&
            (toName = Relationship.#createReverseName(type, fromModel.name)),
          [fromModel, fromName, toModel, toName]
        );
      }
    }
    const {
      $addRelationshipAsField: schema_$addRelationshipAsField,
      $addRelationshipAsMethod: schema_$addRelationshipAsMethod,
      $handleExperimentalAPIMessage: schema_$handleExperimentalAPIMessage,
      $key: schema_$key,
      $keyType: schema_$keyType,
    } = symbols;
    class Schema extends external_events_default() {
      #name;
      #models;
      static defaultConfig = { experimentalAPIMessages: 'warn' };
      static config = { ...Schema.defaultConfig };
      static #schemas = new Map();
      constructor({ name, models = [], config = {} } = {}) {
        super(),
          (this.#name = validateName('Schema', name)),
          (this.#models = new Map()),
          Schema.#parseConfig(config),
          Schema.#schemas.set(this.#name, this),
          models.forEach(model => this.createModel(model));
      }
      createModel(modelData) {
        this.emit('beforeCreateModel', { model: modelData, schema: this });
        const model = Schema.#parseModel(this.#name, modelData, this.#models);
        return (
          this.#models.set(model.name, model),
          model.on('change', ({ type, ...eventData }) => {
            this.emit('change', {
              type: 'model' + capitalize(type),
              ...eventData,
              schema: this,
            });
          }),
          this.emit('modelCreated', { model, schema: this }),
          this.emit('change', { type: 'modelCreated', model, schema: this }),
          model
        );
      }
      getModel(name) {
        return this.#models.get(name);
      }
      removeModel(name) {
        var model = this.getModel(name);
        if (
          (this.emit('beforeRemoveModel', { model, schema: this }),
          !this.#models.has(name))
        )
          throw new ReferenceError(
            `Model ${name} does not exist in schema ${this.#name}.`
          );
        this.#models.delete(name),
          this.emit('modelRemoved', { model: { name }, schema: this }),
          this.emit('change', { type: 'modelRemoved', model, schema: this });
      }
      createRelationship(relationship) {
        this.emit('beforeCreateRelationship', { relationship, schema: this });
        relationship = Schema.#applyRelationship(
          this.#name,
          relationship,
          this.#models
        );
        return (
          this.emit('relationshipCreated', { relationship, schema: this }),
          this.emit('change', {
            type: 'relationshipCreated',
            relationship,
            schema: this,
          }),
          relationship
        );
      }
      get name() {
        return this.#name;
      }
      get models() {
        return this.#models;
      }
      static create(schemaData) {
        return new Schema(schemaData);
      }
      static get(name) {
        return Schema.#schemas.get(name);
      }
      get(pathName) {
        this.emit('beforeGet', { pathName, schema: this });
        const [modelName, recordKey, ...rest] = pathName.split('.'),
          model = this.getModel(modelName);
        if (!model)
          throw new ReferenceError(
            `Model ${modelName} does not exist in schema ${this.#name}.`
          );
        if (void 0 === recordKey) return model;
        var result = model[schema_$key][schema_$keyType],
          result = model.records.get(
            result === 'string' ? recordKey : Number.parseInt(recordKey)
          );
        if (!rest.length) return result;
        if (!result)
          throw new ReferenceError(
            `Record ${recordKey} does not exist in model ${modelName}.`
          );
        result = rest.reduce((acc, key) => acc[key], result);
        return this.emit('got', { pathName, result, schema: this }), result;
      }
      static [schema_$handleExperimentalAPIMessage](message) {
        var experimentalAPIMessages = Schema.config['experimentalAPIMessages'];
        if (experimentalAPIMessages === 'warn') console.warn(message);
        else if (experimentalAPIMessages === 'error')
          throw new ExperimentalAPIUsageError(message);
      }
      static #parseModel(schemaName, modelData, models) {
        return (
          validateObjectWithUniqueName(
            {
              objectType: 'Model',
              parentType: 'Schema',
              parentName: schemaName,
            },
            modelData,
            [...models.keys()]
          ),
          new Model(modelData)
        );
      }
      static #applyRelationship(relationship, toModelName, models) {
        const { from, to, type } = toModelName;
        [from, to].forEach(model => {
          if (!['string', 'object'].includes(typeof model))
            throw new TypeError(`Invalid relationship model: ${model}.`);
        });
        var fromModelName = typeof from == 'string' ? from : from.model,
          toModelName = typeof to == 'string' ? to : to.model;
        const fromModel = models.get(fromModelName),
          toModel = models.get(toModelName);
        if (!fromModel)
          throw new ReferenceError(
            `Model ${fromModelName} not found in schema ${relationship} when attempting to create a relationship.`
          );
        if (!toModel)
          throw new ReferenceError(
            `Model ${toModelName} not found in schema ${relationship} when attempting to create a relationship.`
          );
        relationship = new Relationship({ from, to, type });
        return (
          fromModel[schema_$addRelationshipAsField](relationship),
          toModel[schema_$addRelationshipAsMethod](relationship),
          relationship
        );
      }
      static #parseConfig(config = {}) {
        config &&
          ['experimentalAPIMessages'].forEach(key => {
            void 0 !== config[key] &&
              ['warn', 'error', 'off'].includes(config[key]) &&
              (Schema.config[key] = config[key]);
          });
      }
    }
    const src = Schema;
    return __webpack_exports__;
  })();
});
