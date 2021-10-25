const jedql = require('../dist/main').default;
const repl = require('repl');

let replServer = repl.start({
  prompt: 'jedql > ',
});

replServer.context.jedql = jedql;

Object.keys(jedql).forEach(key => {
  replServer.context[key] = jedql[key];
});
