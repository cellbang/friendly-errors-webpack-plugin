'use strict';

const path = require('path');
const chalk = require('chalk');
const os = require('os');
const transformErrors = require('./core/transformErrors');
const formatErrors = require('./core/formatErrors');
const output = require('./output');
const utils = require('./utils');
const DefaultStatsFactoryPlugin = require("webpack/lib/stats/DefaultStatsFactoryPlugin");

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

    const doneFn = (stats, compilation) => {
      this.clearConsole();

      stats.toString();
      const hasErrors = compilation.getErrors().length > 0;
      const hasWarnings = compilation.getWarnings().length > 0;

      if (!hasErrors && !hasWarnings) {
        this.displaySuccess(stats);
        return;
      }

      if (hasErrors) {
        this.displayErrors(extractErrorsFromStats(stats, 'errors',compilation), 'error');
        return;
      }

      if (hasWarnings) {
        this.displayErrors(extractErrorsFromStats(stats, 'warnings',compilation), 'warning');
      }
    };

    const invalidFn = () => {
      this.clearConsole();
      output.title('info', 'WAIT', 'Compiling...');
    };

    if (compiler.hooks) {
      const plugin = { name: 'FriendlyErrorsWebpackPlugin' };
      compiler.hooks.afterCompile.tap(plugin, compilation => {
        compiler.hooks.done.tap(plugin, stats => {
          doneFn(stats, compilation)
        });
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
