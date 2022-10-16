class Field {
  static typeChecks = {
    boolean: value => typeof value === 'boolean',
    number: value => typeof value === 'number',
    string: value => typeof value === 'string',
    date: value => value instanceof Date,
  };

  static types = [
    ...Object.keys(Field.typeChecks),
    ...Object.keys(Field.typeChecks).map(key => key + 'Array'),
    'enum',
  ];

  static create({
    name,
    type,
    defaultValue = null,
    notNull = false,
    ...options
  }) {
    if (!Field.types.includes(type))
      throw new TypeError(`Field ${name} has an invalid type ${type}.`);
    if (notNull && defaultValue === null)
      throw new TypeError(
        `Non-nullable field ${name} has a default value of null.`
      );

    // Specific type flags
    const isArrayType = type.endsWith('Array');
    const isDateType = type.startsWith('date');
    const isNumberType = type.startsWith('number');
    const isStringType = type.startsWith('string');
    const isEnum = type === 'enum';
    const valueType = isArrayType ? type.replace(/Array$/, '') : type;

    // Uniqueness validation
    const isUniqueValidated = options.unique;
    const uniqueValues = new Set();

    // Variables for validators
    const arrayValidators = [];
    const typeValidators = [];

    // Error strings
    const typePhrase = isArrayType ? 'Elements of field ' : 'Field ';
    const nullableErrorString = !notNull ? ' or null' : '';

    // Array validators parsing
    if (isArrayType) {
      const { minSize, maxSize, uniqueValues } = options;
      // Check for truthiness, as 0 is the same as not being present
      if (minSize)
        arrayValidators.push(value => {
          if (value.length < minSize)
            throw new Error(
              `Field ${name} must have at least ${minSize} elements.`
            );
        });
      if (maxSize !== undefined)
        arrayValidators.push(value => {
          if (value.length > maxSize)
            throw new Error(
              `Field ${name} must have at most ${maxSize} elements.`
            );
        });
      if (uniqueValues)
        arrayValidators.push(value => {
          const unique = new Set(value);
          if (unique.size !== value.length)
            throw new Error(`Field ${name} must have unique elements.`);
        });
    }

    // Type validators parsing
    if (isDateType || isNumberType) {
      const { min, max } = options;
      if (min !== undefined)
        typeValidators.push(value => {
          if (value < min)
            throw new Error(`${typePhrase}${name} must be at least ${min}.`);
        });
      if (max !== undefined)
        typeValidators.push(value => {
          if (value > max)
            throw new Error(`${typePhrase}${name} must be at most ${max}.`);
        });
    }

    if (isNumberType) {
      const { integer } = options;
      if (integer)
        typeValidators.push(value => {
          if (value % 1 !== 0)
            throw new Error(`${typePhrase}${name} must be an integer.`);
        });
    }

    if (isStringType) {
      const { minLength, maxLength, regex } = options;
      // Check for truthiness, as 0 is the same as not being present
      if (minLength)
        typeValidators.push(value => {
          if (value.length < minLength)
            throw new Error(
              `${typePhrase}${name} must be at least ${minLength} characters.`
            );
        });
      if (maxLength !== undefined)
        typeValidators.push(value => {
          if (value.length > maxLength)
            throw new Error(
              `${typePhrase}${name} must be at most ${maxLength} characters.`
            );
        });
      if (regex)
        typeValidators.push(value => {
          if (!regex.test(value))
            throw new Error(`${typePhrase}${name} must match ${regex}.`);
        });
    }

    // Default value
    const createDefaultValue = () => {
      if (defaultValue === null) return null;
      if (isArrayType) {
        return isDateType
          ? defaultValue.map(date => new Date(date))
          : [...defaultValue];
      } else {
        return isDateType ? new Date(defaultValue) : defaultValue;
      }
    };

    // Validation
    const typeCheck = value => {
      if (!notNull && value === null) return true;
      else if (isEnum && !options.values.includes(value)) {
        throw new Error(`Field ${name} value is invalid.`);
      } else if (isArrayType) {
        if (!Array.isArray(value))
          throw new Error(
            `Field ${name} must be an array${nullableErrorString}.`
          );
        if (value.some(item => !Field.typeChecks[valueType](item)))
          throw new Error(`Field ${name} must contain only ${type}s.`);
        arrayValidators.forEach(validator => validator(value));
        typeValidators.forEach(validator => {
          value.forEach(item => validator(item));
        });
      } else {
        if (!Field.typeChecks[valueType](value))
          throw new Error(
            `Field ${name} must be a ${type}${nullableErrorString}.`
          );
        typeValidators.forEach(validator => validator(value));
      }
      return true;
    };

    // TODO: This needs to be better fleshed out to make sense
    // Right now it's only a placeholder
    // Unique value operations
    const operateOnUniqueValues = (operation, { value, previous }) => {
      if (!isUniqueValidated) return;
      if (operation === 'delete') {
        if (previous !== undefined && previous !== null)
          uniqueValues.delete(previous);
      } else if (operation === 'add') {
        if (value !== undefined && value !== null)
          if (!uniqueValues.has(value)) uniqueValues.add(value);
          else throw new Error(`Field ${name} value is not unique.`);
      } else if (operation === 'update') {
        if (previous !== undefined && previous !== null)
          uniqueValues.delete(previous);
        if (value !== undefined && value !== null)
          if (!uniqueValues.has(value)) uniqueValues.add(value);
          else throw new Error(`Field ${name} value is not unique.`);
      }
    };

    // Value creation
    const create = value => {
      let newValue;
      if (value === null) newValue = null;
      else if (typeof value === 'undefined') newValue = createDefaultValue();
      else if (isArrayType && isDateType)
        newValue = value.map(date => new Date(date));
      else if (isArrayType) newValue = [...value];
      else if (isDateType) newValue = new Date(value);
      else newValue = value;
      typeCheck(newValue);
      return newValue;
    };

    // Prevalidate for uniqueness if needed
    const prevalidate = (operation, { value, previous }) => {
      if (!isUniqueValidated) return true;
      if (operation === 'delete') return true;
      if (operation === 'create') {
        if (value !== undefined && value !== null) return true;
        return !uniqueValues.has(value);
      }
      if (operation === 'update') {
        if (value !== undefined && value !== null) return true;
        if (previous === value) return true;
        return !uniqueValues.has(value);
      }
    };

    const addValue = value => {
      if (!isUniqueValidated) return;
      if (value !== undefined && value !== null)
        if (!uniqueValues.has(value)) uniqueValues.add(value);
        else throw new Error(`Field ${name} value is not unique.`);
    };

    const deleteValue = value => {
      if (!isUniqueValidated) return;
      if (value !== undefined && value !== null) uniqueValues.delete(value);
    };

    const updateValue = (value, previous) => {
      if (!isUniqueValidated) return;
      if (value !== undefined && value !== null) {
        if (previous !== undefined && previous !== null)
          uniqueValues.delete(previous);
        if (!uniqueValues.has(value)) uniqueValues.add(value);
        else throw new Error(`Field ${name} value is not unique.`);
      }
    };

    // Field object
    return {
      get name() {
        return name;
      },
      create,
      prevalidate,
      typeCheck,
      addValue,
      deleteValue,
      updateValue,
      createDefaultValue,
      operateOnUniqueValues,
    };
  }
}

export { Field };
