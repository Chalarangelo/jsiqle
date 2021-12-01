const jedql = require('../dist/main').default;
const repl = require('repl');

let replServer = repl.start({
  prompt: 'jedql > ',
});

replServer.context.jedql = jedql;

Object.keys(jedql).forEach(key => {
  replServer.context[key] = jedql[key];
});

// Demos
const { Schema } = jedql;

const schema = new Schema({
  name: 'mySchema',
  models: [
    {
      name: 'snippet',
      key: 'name',
      fields: [
        {
          name: 'description',
          type: 'stringRequired',
          validators: {
            unique: true,
            minLength: 5,
            containsTheWordDescription: value => value.includes('description'),
          },
        },
        {
          name: 'code',
          type: 'stringRequired',
        },
        {
          name: 'language',
          type: 'string',
        },
        {
          name: 'tags',
          type: 'stringArray',
        },
      ],
    },
  ],
});

schema.on('beforeCreateModel', ({ model }) => {
  console.log(`Creating new model named ${model.name}...`);
});

schema.on('modelCreated', ({ model }) => {
  console.log(`Model ${model.name} created!`);
});

const snippet = schema.getModel('snippet');

const category = schema.createModel({
  name: 'category',
  key: 'name',
  fields: [
    {
      name: 'description',
      type: 'stringRequired',
    },
  ],
});

const snippetA = snippet.add({
  name: 'snippetA',
  description: 'description of snippetA',
  code: 'console.log("Hello World!");',
  language: 'javascript',
  tags: ['hello', 'world'],
});

const snippetB = snippet.add({
  name: 'snippetB',
  description: 'description of snippetB',
  code: 'console.log("Hello World!");',
  tags: ['cool'],
  papaya: 'banana',
});

const categoryA = category.add({
  name: 'categoryA',
  description: 'description of categoryA',
});

snippet.addField(
  {
    name: 'special',
    type: 'stringRequired',
  },
  record => {
    if (record.name === 'snippetA') {
      return 'special value for snippetA';
    } else return record.name;
  }
);

snippet.addMethod('isCool', record => {
  return record.tags.includes('cool');
});

snippet.addScope('cool', record => {
  return record.isCool;
});

snippet.addRelationship({
  name: 'category',
  type: 'oneToOne',
  model: 'category',
  foreignKey: 'name',
});

snippet.addRelationship({
  name: 'siblings',
  type: 'oneToMany',
  model: 'snippet',
  foreignKey: 'name',
});

const snippetC = snippet.add({
  name: 'snippetC',
  description: 'description of snippetC',
  code: 'console.log("Hello World!");',
  language: 'javascript',
  tags: ['hello', 'world'],
  category: 'categoryA',
  siblings: ['snippetA', 'snippetB'],
});

replServer.context.schema = schema;

replServer.context.snippet = snippet;
replServer.context.snippetA = snippetA;
replServer.context.snippetB = snippetB;
replServer.context.snippetC = snippetC;

replServer.context.category = category;
replServer.context.categoryA = categoryA;
