/* jshint -W100 */

var tty = require('tty'),
  util = require('util'),
  diff = require('diff'),
  ms = require('mocha/lib/ms'),
  _ = require('lodash'),
  utils = require('mocha/lib/utils');

exports = module.exports = Base;

/**
 * Enable coloring by default.
 */
exports.useColors = (tty.isatty(1) && tty.isatty(2)) || (process.env.MOCHA_COLORS !== undefined);

/**
 * Inline diffs instead of +/-
 */
exports.inlineDiffs = false;

/**
 * Default color map.
 */
var colors = {
  'pass': 90,
  'fail': 31,
  'bright pass': 92,
  'bright fail': 91,
  'bright yellow': 93,
  'pending': 36,
  'suite': 0,
  'error title': 0,
  'error message': 31,
  'error stack': 90,
  'checkmark': 32,
  'fast': 90,
  'medium': 33,
  'slow': 31,
  'green': 32,
  'light': 90,
  'diff gutter': 90,
  'diff added': 42,
  'diff removed': 41
};

/**
 * Color `str` with the given `type`,
 * allowing colors to be disabled,
 * as well as user-defined color
 * schemes.
 *
 * @param {String} type
 * @param {String} str
 * @return {String}
 * @api private
 */

function color(type, str) {
  if (!exports.useColors) {
    return str;
  }
  return '\u001b[' + colors[type] + 'm' + str + '\u001b[0m';
}

function indent(indents) {
  var str = "";
  for (var i = 1; i < indents; i++) {
    str += '  ';
  }
  return str;
}

function onStart() {
  var stats = this.stats;

  stats.start = new Date();
  this.log(); //blank line
}

function onSuite(suite) {
  var stats = this.stats,
    title = suite.title || "";

  stats.suites = stats.suites || 0;
  if (!suite.root) {
    stats.suites++;
  }
  this.indents += 1;
  this.log(color('suite', '%s%s'), indent(this.indents), title);
}

function onSuiteEnd() {
  this.indents -= 1;
  if (1 === this.indents) {
    this.log();
  }
}

function onTestEnd() {
  var stats = this.stats;

  stats.tests = stats.tests || 0;
  stats.tests++;
}

function getTestSpeed(test) {
  var result, slow, medium, duration = test.duration;
  if (test && _.isFunction(test.slow)) {
    slow = test.slow();
    medium = slow / 2;
    if (duration > slow) {
      result = 'slow';
    } else if (duration > medium) {
      result = 'medium';
    } else {
      result = 'fast';
    }
  } else {
    result = 'fast';
  }
  return result;
}

function onPass(test) {
  var stats = this.stats;

  stats.passes = stats.passes || 0;
  test.speed = getTestSpeed(test);
  stats.passes += 1;

  this.logPass(test);
}

function onFail(test, err) {
  var stats = this.stats,
    failures = this.failures;

  stats.failures = stats.failures || 0;
  stats.failures++;
  test.err = err;
  failures.push(test);

  this.logFail(test);
}

function onEnd() {
  var stats = this.stats;

  stats.end = new Date();
  stats.duration = new Date() - stats.start;
  this.epilogue();
}

function onPending(test) {
  var stats = this.stats,
    indents = this.indents;

  stats.pending++;
  var fmt = indent(indents) + color('pending', '  - %s');
  this.log(fmt, test.title || "");
}

/**
 * Initialize a new `Base` reporter.
 *
 * All other reporters generally
 * inherit from this reporter, providing
 * stats such as test duration, number
 * of tests passed / failed etc.
 *
 * @param {Runner} runner
 * @api public
 */
function Base(runner) {
  this.indents = 0;
  this.n = 0;
  this.stats = {
    suites: 0,
    tests: 0,
    passes: 0,
    pending: 0,
    failures: 0
  };
  this.failures = [];
  this.runner = runner;

  if (!runner) {
    return;
  }

  runner.stats = this.stats;
  runner.on('start', onStart.bind(this));
  runner.on('suite', onSuite.bind(this));
  runner.on('suite end', onSuiteEnd.bind(this));
  runner.on('test end', onTestEnd.bind(this));
  runner.on('pass', onPass.bind(this));
  runner.on('fail', onFail.bind(this));
  runner.on('end', onEnd.bind(this));
  runner.on('pending', onPending.bind(this));
}
Base.prototype = {
  getSymbols: function () {
    if ('win32' === process.platform) {
      // With node.js on Windows: use symbols available in terminal default fonts
      return {
        ok: '\u221A',
        err: '\u00D7',
        dot: '․'
      };
    } else {
      return {
        ok: '✓',
        err: '✖',
        dot: '․'
      };
    }
  },
  getBuffer: function () {
    return this._buffer || '';
  },
  print: function () {
    var buffer = this._buffer;
    console.log(buffer);
    this._buffer = "";
  },
  error: function () {
    var buffer = this._buffer || "";
    buffer += util.format.apply(util, Array.prototype.slice.call(arguments)) + '\n';
    this._buffer = buffer;
  },
  log: function () {
    var buffer = this._buffer || "";
    buffer += util.format.apply(util, Array.prototype.slice.call(arguments)) + '\n';
    this._buffer = buffer;
  },
  getTestTitle: function (test) {
    return typeof test.fullTitle === 'function' && test.fullTitle() || test.title || '';
  },
  indentAllLinesAfterFirst: function (str, index) {
    return str.slice(index ? index + 1 : index).replace(/^/gm, '  ');
  },
  addErrorToMessage: function (err, msg, escape) {
    var message = err.message || '';
    var match = message.match(/^([^:]+): expected/);
    msg = '\n      ' + color('error message', match ? match[1] : msg);
    msg += exports.inlineDiffs ? inlineDiff(err, escape) : unifiedDiff(err, escape);
    return msg;
  },
  logPass: function (test) {
    //display nothing
  },
  logPasses: function () {
    var fmt,
      stats = this.stats;
    if (stats.duration) {
      fmt = color('bright pass', ' ') + color('green', ' %d passing') + color('light', ' (%s)');
      this.log(fmt, stats.passes || 0, ms(stats.duration));
    } else {
      fmt = color('bright pass', ' ') + color('green', ' %d passing');
      this.log(fmt, stats.passes || 0);
    }
  },
  logPending: function () {
    var fmt,
      stats = this.stats;
    if (stats.pending) {
      fmt = color('pending', ' ') + color('pending', ' %d pending');
      this.log(fmt, stats.pending);
    }
  },
  logFail: function (test) {
    var indents = this.indents;
    this.n += 1; //count logged to screen, pretend we're keeping track
    this.log(indent(indents) + color('fail', '  %d) %s'), this.n, test.title || "");
  },
  logFailures: function () {
    var fmt,
      stats = this.stats;
    if (stats.failures) {
      fmt = color('fail', '  %d failing');
      this.error(fmt, stats.failures);
      this.error(); //blank line
      this.failures.forEach(this.logFailure.bind(this));
      this.error(); //blank line
    }
  },
  logFailure: function (test, i) {
    // format
    var fmt = color('error title', '  %s) %s:\n') + color('error message', '     %s') +
      color('error stack', '\n%s\n');

    // msg
    var err = test.err,
      message = err.message || '',
      stack = err.stack || message,
      index = stack.indexOf(message) + message.length,
      msg = stack.slice(0, index),
      escape = true;

    // uncaught
    if (err.uncaught) {
      msg = 'Uncaught ' + msg;
    }

    // explicitly show diff
    if (err.showDiff && sameType(err.actual, err.expected)) {
      escape = false;
      err.actual = utils.stringify(err.actual);
      err.expected = utils.stringify(err.expected);
    }

    // actual / expected diff
    if ('string' === typeof err.actual && 'string' === typeof err.expected) {
      fmt = color('error title', '  %s) %s:\n%s') + color('error stack', '\n%s\n');
      msg = this.addErrorToMessage(err, msg, escape);
    }

    // indent stack trace without msg
    stack = this.indentAllLinesAfterFirst(stack, index);

    this.error(fmt, (i + 1), this.getTestTitle(test), msg, stack);
  },
  epilogue: function () {
    this.log(); //blank line

    this.logPasses();
    this.logPending();
    this.logFailures();

    this.log(); //blank line

    this.print(); //output to screen
  }
};

/**
 * Pad the given `str` to `len`.
 *
 * @param {String} str
 * @param {Number} len
 * @return {String}
 * @api private
 */
function pad(str, len) {
  len = len - str.length + 1;
  var padding = "";
  for (var i = 0; i < len; i++) {
    padding += ' ';
  }
  str = String(str);
  return padding + str;
}


/**
 * Returns an inline diff between 2 strings with coloured ANSI output
 *
 * @param {{actual: *, expected: *}} err Error with actual/expected
 * @param {boolean} escape
 * @return {String} Diff
 * @api private
 */
function inlineDiff(err, escape) {
  var msg = errorDiff(err, 'WordsWithSpace', escape);

  // line numbers
  var lines = msg.split('\n');
  if (lines.length > 4) {
    var width = String(lines.length).length;
    msg = lines.map(function (str, i) {
      i++;
      return pad(i, width) + ' |' + ' ' + str;
    }).join('\n');
  }

  // legend
  msg = '\n' + color('diff removed', 'actual') + ' ' + color('diff added', 'expected') +
    '\n\n' + msg + '\n';

  // indent
  msg = msg.replace(/^/gm, '      ');
  return msg;
}

function cleanUp(escape, indent, line) {
  if (escape) {
    line = escapeInvisibles(line);
  }
  if (line[0] === '+') {
    return indent + colorLines('diff added', line);
  }
  if (line[0] === '-') {
    return indent + colorLines('diff removed', line);
  }
  if (line.match(/\@\@/)) {
    return null;
  }
  if (line.match(/\\ No newline/)) {
    return null;
  } else {
    return indent + line;
  }
}

function notBlank(line) {
  return line !== null;
}

/**
 * Returns a unified diff between 2 strings
 *
 * @param {{actual: *, expected: *}} err Error with actual/expected
 * @param {String} escape
 * @return {String} difference
 * @api private
 */
function unifiedDiff(err, escape) {
  var indent = '      ';
  var msg = diff.createPatch('string', err.actual, err.expected);
  var lines = msg.split('\n').splice(4);
  return '\n      ' +
    colorLines('diff added', '+ expected') + ' ' +
    colorLines('diff removed', '- actual') + '\n\n' +
    lines.map(cleanUp.bind(null, escape, indent)).filter(notBlank).join('\n');
}

/**
 * Return a character diff for `err`.
 *
 * @param {{actual: *, expected: *}} err
 * @param {String} type
 * @param {Boolean} escape
 * @return {String}
 * @api private
 */
function errorDiff(err, type, escape) {
  var actual = escape ? escapeInvisibles(err.actual) : err.actual;
  var expected = escape ? escapeInvisibles(err.expected) : err.expected;
  return diff['diff' + type](actual, expected).map(function (str) {
    if (str.added) {
      return colorLines('diff added', str.value);
    }
    if (str.removed) {
      return colorLines('diff removed', str.value);
    }
    return str.value;
  }).join('');
}

/**
 * Returns a string with all invisible characters in plain text
 *
 * @param {String} line
 * @return {String}
 * @api private
 */
function escapeInvisibles(line) {
  return line.replace(/\t/g, '<tab>').replace(/\r/g, '<CR>').replace(/\n/g, '<LF>\n');
}

/**
 * Color lines for `str`, using the color `name`.
 *
 * @param {String} name
 * @param {String} str
 * @return {String}
 * @api private
 */
function colorLines(name, str) {
  return str.split('\n').map(function (str) {
    return color(name, str);
  }).join('\n');
}

/**
 * Check that a / b have the same type.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Boolean}
 * @api private
 */
function sameType(a, b) {
  a = Object.prototype.toString.call(a);
  b = Object.prototype.toString.call(b);
  return a == b;
}