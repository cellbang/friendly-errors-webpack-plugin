"use strict";

const output = require('../src/output');
const webpack = require('webpack');
const FriendlyErrorsWebpackPlugin = require('../src/friendly-errors-plugin');
const MemoryFileSystem = require('memory-fs');
const path = require('path');

const webpackPromise = function (config, globalPlugins) {
  const compiler = webpack(config);
  compiler.outputFileSystem = new MemoryFileSystem();
  if (Array.isArray(globalPlugins)) {
    globalPlugins.forEach(p => p.apply(compiler));
  }

  return new Promise((resolve, reject) => {
    compiler.run(err => {
      if (err) {
        reject(err)
      }
      resolve()
    });
  });
};

async function executeAndGetLogs(fixture, globalPlugins) {
  try {
    output.capture();
    await webpackPromise(require(fixture), globalPlugins);
    return output.capturedMessages;
  } finally {
    output.endCapture()
  }
}

it('integration : success', async() => {

  const logs = await executeAndGetLogs('./fixtures/success/webpack.config')

  expect(logs.join('\n')).toMatch(/DONE  Compiled successfully in (.\d*)ms/);
});

it('integration : module-errors', async() => {

  const logs = await executeAndGetLogs('./fixtures/module-errors/webpack.config.js');

  expect(logs).toEqual([
    'ERROR  Failed to compile with 3 errors',
    '',
    'This dependency was not found:',
    '',
    '* not-found in ./test/fixtures/module-errors/index.js',
    '',
    'To install it, you can run: npm install --save not-found',
    '',
    '',
    'These relative modules were not found:',
    '',
    '* ../non-existing in ./test/fixtures/module-errors/index.js',
    '* ./non-existing in ./test/fixtures/module-errors/index.js',
  ]);
});

function filename(filePath) {
  return path.join(__dirname, path.normalize(filePath))
}

it('integration : should display eslint warnings', async() => {

  const logs = await executeAndGetLogs('./fixtures/eslint-warnings/webpack.config.js');

  expect(logs.join('\n')).toEqual(
    `WARNING  Compiled with 2 warnings

Module Warning (from ./node_modules/eslint-loader/index.js):

${filename('fixtures/eslint-warnings/index.js')}
  3:7  warning  'unused' is assigned a value but never used   no-unused-vars
  4:7  warning  'unused2' is assigned a value but never used  no-unused-vars

✖ 2 problems (0 errors, 2 warnings)

Module Warning (from ./node_modules/eslint-loader/index.js):

${filename('fixtures/eslint-warnings/module.js')}
  1:7  warning  'unused' is assigned a value but never used  no-unused-vars

✖ 1 problem (0 errors, 1 warning)

You may use special comments to disable some warnings.
Use // eslint-disable-next-line to ignore the next line.
Use /* eslint-disable */ to ignore all warnings in a file.`
  )
});

it('integration : babel syntax error', async() => {

  const logs = await executeAndGetLogs('./fixtures/babel-syntax/webpack.config');

  expect(logs).toEqual([
    'ERROR  Failed to compile with 1 errors',
    '',
    'error  in ./test/fixtures/babel-syntax/index.js',
    '',
    `Syntax Error: Unexpected token (5:11)

  3 |${' '}
  4 |   render() {
> 5 |     return <div>
    |            ^
  6 |   }
  7 | }`,
    ''
  ]);
});

it('integration : mini CSS extract plugin babel error', async() => {

  const logs = await executeAndGetLogs('./fixtures/mini-css-extract-babel-syntax/webpack.config');
  const clean_logs = logs.toString().replace(/\"/g, ""); //<- double quotes issue with slash
  expect(clean_logs).toEqual(
    `ERROR  Failed to compile with 1 errors,,error  in ./test/fixtures/mini-css-extract-babel-syntax/index.scss,,Syntax Error: NonErrorEmittedError: (Emitted value instead of an instance of Error) ReferenceError: window is not defined,`
  );
});

it('integration : webpack multi compiler : success', async() => {

  // We apply the plugin directly to the compiler when targeting multi-compiler
  let globalPlugins = [new FriendlyErrorsWebpackPlugin()];
  const logs = await executeAndGetLogs('./fixtures/multi-compiler-success/webpack.config', globalPlugins);

  expect(logs.join('\n')).toMatch(/DONE  Compiled successfully in (.\d*)ms/)
});

it('integration : webpack multi compiler : module-errors', async() => {

  // We apply the plugin directly to the compiler when targeting multi-compiler
  let globalPlugins = [new FriendlyErrorsWebpackPlugin()];
  const logs = await executeAndGetLogs('./fixtures/multi-compiler-module-errors/webpack.config', globalPlugins);

  expect(logs).toEqual([
    'ERROR  Failed to compile with 2 errors',
    '',
    'This dependency was not found:',
    '',
    '* not-found in ./test/fixtures/multi-compiler-module-errors/index2.js',
    '',
    'To install it, you can run: npm install --save not-found',
    '',
    '',
    'This relative module was not found:',
    '',
    '* ./non-existing in ./test/fixtures/multi-compiler-module-errors/index.js',
  ]);
});
