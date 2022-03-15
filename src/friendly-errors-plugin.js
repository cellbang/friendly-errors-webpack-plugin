'use strict';

const transformErrors = require('./core/transformErrors');
const formatErrors = require('./core/formatErrors');
const output = require('./output');
const utils = require('./utils');
let currentBackend = 0;
let currentFrontend = 0;

const concat = utils.concat;
const uniqueBy = utils.uniqueBy;

const defaultTransformers = [
  require('./transformers/babelSyntax'),
  require('./transformers/moduleNotFound'),
  require('./transformers/esLintError'),
];

const defaultFormatters = [
  require('./formatters/moduleNotFound'),
  require('./formatters/eslintError'),
  require('./formatters/defaultError'),
];

class FriendlyErrorsWebpackPlugin {

  constructor(options) {
    options = options || {};
    this.compilationSuccessInfo = options.compilationSuccessInfo || {};
    this.onErrors = options.onErrors;
    this.shouldClearConsole = options.clearConsole == null ? true : Boolean(options.clearConsole);
    this.formatters = concat(defaultFormatters, options.additionalFormatters);
    this.transformers = concat(defaultTransformers, options.additionalTransformers);
    this.previousEndTimes = {};
  }

  apply(compiler) {


    const doneFn = (stats) => {
      if (this.compilationSuccessInfo.target == 'backend') {
        currentBackend++;
      }
      if (this.compilationSuccessInfo.target == 'frontend') {
        currentFrontend++;
      }

      stats.toString();
    };

    const doErrors = (stats, compilation) => {
      if (hasErrors(compilation)) {
        this.displayErrors(extractErrorsFromStats(stats, 'errors', compilation), 'error');
        return;
      }
      if (hasWarnings(compilation)) {
        this.displayErrors(extractErrorsFromStats(stats, 'warnings', compilation), 'warning');
        return;
      }
    }

    const doSuccess = (stats) => {

      this.clearConsole();
      this.displaySuccess(stats);

      return;
    }

    const hasErrors = (compilation) => {
      return compilation.getErrors().length > 0;
    }
    const hasWarnings = (compilation) => {
      return compilation.getWarnings().length > 0;
    }

    const invalidFn = () => {
      this.clearConsole();
      output.title('info', 'WAIT', 'Compiling...');
      return;
    };

    if (compiler.hooks) {
      const plugin = { name: 'FriendlyErrorsWebpackPlugin' };
      compiler.hooks.afterCompile.tap(plugin, compilation => {
        if (hasErrors(compilation) || hasWarnings(compilation)) {
          compiler.hooks.done.tap(plugin, stats => {
            doErrors(stats, compilation)
          });
          return;
        }
      });
      compiler.hooks.done.tap(plugin, stats => {
        const targetInfo = this.compilationSuccessInfo.messages[0].split(' ')[1].toString();
        this.compilationSuccessInfo.target = targetInfo.indexOf('backend') != -1 ? 'backend' : 'frontend';
        output.log();
        if ((this.compilationSuccessInfo.target == 'backend' && currentBackend == 0) || (this.compilationSuccessInfo.target == 'frontend' && currentFrontend == 0)) {
          doneFn(stats)
          doSuccess(stats)
        }
      });
      compiler.hooks.invalid.tap(plugin, invalidFn);
    } else {
      compiler.plugin('done', doneFn);
      compiler.plugin('invalid', invalidFn);
    }
  }

  clearConsole() {
    if (this.shouldClearConsole) {
      output.clearConsole();
    }
  }

  displaySuccess(stats) {
    const time = isMultiStats(stats) ? this.getMultiStatsCompileTime(stats) : this.getStatsCompileTime(stats);
    output.title('success', 'DONE', 'Compiled successfully in ' + time + 'ms');
    if (this.compilationSuccessInfo.messages) {
      this.compilationSuccessInfo.messages.forEach(message => output.info(message));
    }
    if (this.compilationSuccessInfo.notes) {
      output.log();
      this.compilationSuccessInfo.notes.forEach(note => output.note(note));
    }
  }

  displayErrors(errors, severity) {
    const processedErrors = transformErrors(errors, this.transformers);

    const topErrors = getMaxSeverityErrors(processedErrors);
    const nbErrors = topErrors.length;

    const subtitle = severity === 'error' ?
      `Failed to compile with ${nbErrors} ${severity}${nbErrors === 1 ? '' : 's'}` :
      `Compiled with ${nbErrors} ${severity}${nbErrors === 1 ? '' : 's'}`;
    output.title(severity, severity.toUpperCase(), subtitle);

    if (this.onErrors) {
      this.onErrors(severity, topErrors);
    }

    formatErrors(topErrors, this.formatters, severity)
      .forEach(chunk => output.log(chunk));
  }

  getStatsCompileTime(stats, statsIndex) {
    // When we have multi compilations but only one of them is rebuilt, we need to skip the
    // unchanged compilers to report the true rebuild time.
    if (statsIndex !== undefined) {
      if (this.previousEndTimes[statsIndex] === stats.endTime) {
        return 0;
      }

      this.previousEndTimes[statsIndex] = stats.endTime;
    }

    return stats.endTime - stats.startTime;
  }

  getMultiStatsCompileTime(stats) {
    // Webpack multi compilations run in parallel so using the longest duration.
    // https://webpack.github.io/docs/configuration.html#multiple-configurations
    return stats.stats
      .reduce((time, stats, index) => Math.max(time, this.getStatsCompileTime(stats, index)), 0);
  }
}

function extractErrorsFromStats(stats, type, compilation) {
  const findErrorsRecursive = (compilation) => {
    const errors = type === 'warnings' ? compilation.getWarnings() : compilation.getErrors();
    return uniqueBy(errors, error => error.message);
  };
  return findErrorsRecursive(compilation);
}

function isMultiStats(stats) {
  return stats.stats;
}

function getMaxSeverityErrors(errors) {
  const maxSeverity = getMaxInt(errors, 'severity');
  return errors.filter(e => e.severity === maxSeverity);
}

function getMaxInt(collection, propertyName) {
  return collection.reduce((res, curr) => {
    return curr[propertyName] > res ? curr[propertyName] : res;
  }, 0)
}

module.exports = FriendlyErrorsWebpackPlugin;
