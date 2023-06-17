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
      fields: {
        description: {
          type: 'string',
        },
        code: 'string',
        language: 'string',
        tags: 'stringArray',
      },
      scopes: {
        cool: record => {
          return record.isCool;
        },
      },
    },
    {
      name: 'category',
      fields: { description: 'string' },
    },
  ],
  relationships: [
    {
      from: { model: 'snippet', name: 'children' },
      to: { model: 'snippet', name: 'parent' },
      type: 'oneToMany',
    },
    {
      from: 'snippet',
      to: 'category',
      type: 'manyToMany',
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
          return snippet.children.pluck('code');
        },
      },
    },
  ],
  config: {
    experimentalAPIMessages: 'off',
  },
});

const snippet = schema.getModel('snippet');

const category = schema.getModel('category');

const snippetA = snippet.createRecord({
  id: 'snippetA',
  description: 'description of snippetA',
  code: 'console.log("Hello World!");',
  language: 'javascript',
  tags: ['hello', 'world'],
});

const snippetB = snippet.createRecord({
  id: 'snippetB',
  description: 'description of snippetB',
  code: 'console.log("Hello World!");',
  tags: ['cool'],
  papaya: 'banana',
});

const categoryA = category.createRecord({
  id: 'categoryA',
  description: 'description of categoryA',
});

const categoryB = category.createRecord({
  id: 'categoryB',
  description: 'description of categoryB',
});

snippet.addField({
  name: 'special',
  type: 'string',
});

snippet.addProperty({
  name: 'isCool',
  body: record => {
    return record.tags.includes('cool');
  },
});

const snippetC = snippet.createRecord({
  id: 'snippetC',
  description: 'description of snippetC',
  code: 'console.log("Hello World!");',
  language: 'javascript',
  tags: ['hello', 'world'],
  categorySet: ['categoryA'],
  children: ['snippetA', 'snippetB'],
});

Array.from({ length: 1000 }).forEach((_, i) => {
  snippet.createRecord({
    id: `snippet${i}`,
    description: `description of snippet${i}`,
    code: `console.log("Hello World!");`,
    language: 'javascript',
    tags: ['hello', 'world'],
  });
});

snippetA.categorySet = ['categoryB', 'categoryA'];

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
