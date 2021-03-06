const jsiqle = require('../dist/main').default;
const repl = require('repl');

let replServer = repl.start({
  prompt: 'jsiqle > ',
});

replServer.context.jsiqle = jsiqle;

// Demos
const schema = jsiqle.create({
  name: 'mySchema',
  models: [
    {
      name: 'snippet',
      key: 'name',
      fields: [
        {
          name: 'description',
          type: 'stringRequired',
          // Refactor to flatten validators in the definition?
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
  relationships: [
    {
      from: { model: 'snippet', name: 'children' },
      to: { model: 'snippet', name: 'parent' },
      type: 'oneToMany',
    },
  ],
  serializers: [
    {
      name: 'snippet',
      attributes: [
        'name',
        ['description', 'regularDescription'],
        ['specialDescription', 'description'],
        'children',
      ],
      methods: {
        specialDescription: snippet => {
          return snippet.description + '!!';
        },
        children: snippet => {
          return snippet.children.flatPluck('code');
        },
      },
    },
  ],
  config: {
    experimentalAPIMessages: 'off',
  },
});

schema.on('beforeCreateModel', ({ model }) => {
  console.log(`Creating new model named ${model.name}...`);
});

schema.on('modelCreated', ({ model }) => {
  console.log(`Model ${model.name} created!`);
});

schema.on('change', data => {
  console.log(data.type);
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

const snippetA = snippet.createRecord({
  name: 'snippetA',
  description: 'description of snippetA',
  code: 'console.log("Hello World!");',
  language: 'javascript',
  tags: ['hello', 'world'],
});

const snippetB = snippet.createRecord({
  name: 'snippetB',
  description: 'description of snippetB',
  code: 'console.log("Hello World!");',
  tags: ['cool'],
  papaya: 'banana',
});

const categoryA = category.createRecord({
  name: 'categoryA',
  description: 'description of categoryA',
});

const categoryB = category.createRecord({
  name: 'categoryB',
  description: 'description of categoryB',
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

snippet.addProperty('isCool', record => {
  return record.tags.includes('cool');
});

snippet.addScope('cool', record => {
  return record.isCool;
});

schema.createRelationship({
  from: 'snippet',
  to: 'category',
  type: 'manyToMany',
});

const snippetC = snippet.createRecord({
  name: 'snippetC',
  description: 'description of snippetC',
  code: 'console.log("Hello World!");',
  language: 'javascript',
  tags: ['hello', 'world'],
  categorySet: ['categoryA'],
  children: ['snippetA', 'snippetB'],
});

Array.from({ length: 1000 }).forEach(() => {
  snippet.createRecord({
    name: `snippet${i}`,
    description: `description of snippet${i}`,
    code: `console.log("Hello World!");`,
    language: 'javascript',
    tags: ['hello', 'world'],
  });
});

snippetA.categorySet = ['categoryB', 'categoryA'];

// categoryA.snippetSet = ['snippetC'];

replServer.context.schema = schema;

replServer.context.snippet = snippet;
replServer.context.snippetA = snippetA;
replServer.context.snippetB = snippetB;
replServer.context.snippetC = snippetC;

replServer.context.category = category;
replServer.context.categoryA = categoryA;
replServer.context.categoryB = categoryB;

const snippetSerializer = schema.getSerializer('snippet');

replServer.context.snippetSerializer = snippetSerializer;

replServer.context.traceFn = (name, fn) => {
  console.time(`traceFn: ${name}`);
  fn();
  console.timeEnd(`traceFn: ${name}`);
};

// try {
//   snippetA.snippetSet;
// } catch (e) {
//   console.trace(e);
// }
