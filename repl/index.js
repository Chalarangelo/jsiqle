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
const { Model, FieldTypes } = jedql;
const snippet = new Model({
  name: 'snippet',
  key: 'name',
  fields: [
    {
      name: 'description',
      type: FieldTypes.string,
      required: true,
      defaultValue: '',
    },
    {
      name: 'code',
      type: FieldTypes.string,
      required: true,
      defaultValue: '',
    },
    {
      name: 'language',
      type: FieldTypes.string,
      required: false,
    },
    {
      name: 'tags',
      type: FieldTypes.arrayOf(FieldTypes.string),
      required: false,
      defaultValue: [],
    },
  ],
  validators: {
    uniqueDescription: (snippet, snippets) => {
      return !snippets.some(s => s.description === snippet.description);
    },
  },
});

const category = new Model({
  name: 'category',
  key: 'name',
  fields: [
    {
      name: 'description',
      type: FieldTypes.string,
      required: true,
      defaultValue: '',
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
    type: 'string',
    required: true,
    defaultValue: '',
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

// snippetA.category = 'categoryA';
// snippetB.category = 'categoryA';

replServer.context.snippet = snippet;
replServer.context.snippetA = snippetA;
replServer.context.snippetB = snippetB;
replServer.context.snippetC = snippetC;

replServer.context.category = category;
replServer.context.categoryA = categoryA;
