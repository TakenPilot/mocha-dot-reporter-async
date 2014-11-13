var sinon = require('sinon'),
  expect = require('chai').expect,
  Reporter = require('../.');

describe('Reporter', function () {

  function listenToEvents(mockRunner) {
    var fn = {};
    sandbox.stub(mockRunner, 'on', function (eventName, eventFn) { fn[eventName] = eventFn; });
    return fn;
  }

  function stubPrint(reporter) {
    return sandbox.stub(reporter, 'print');
  }

  function expectEventToPrint(event, expected, args) {
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);

    fn[event].apply(null, args);

    expect(reporter.getBuffer()).to.equal(expected);
  }

  var mockRunner = {
    on: function() {}
  };

  var sandbox, reporter;

  beforeEach(function () {
    Reporter.useColors = false;
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('able to load', function () {
    reporter = new Reporter(mockRunner);
  });

  it('should handle start', function () {
    expectEventToPrint('start', '\n');
  });

  it('should handle start (colors)', function () {
    Reporter.useColors = true;
    expectEventToPrint('start', '\n');
  });

  it('should handle end', function () {
    expectEventToPrint('end', '\n  0 passing\n\n');
  });

  it('should handle end (colors)', function () {
    Reporter.useColors = true;
    expectEventToPrint('end', '\n\u001b[92m \u001b[0m\u001b[32m 0 passing\u001b[0m\n\n');
  });

  it('should handle pending', function () {
    expectEventToPrint('pending', '  - \n', [{}]);
  });

  it('should handle pending (colors)', function () {
    Reporter.useColors = true;
    expectEventToPrint('pending', '\u001b[36m  - \u001b[0m\n', [{}]);
  });

  it('should handle pending with title', function () {
    expectEventToPrint('pending', '  - test title\n', [{title: "test title"}]);
  });

  it('should handle pending with title (colors)', function () {
    Reporter.useColors = true;
    expectEventToPrint('pending', '\u001b[36m  - test title\u001b[0m\n', [{title: "test title"}]);
  });

  it('should handle suite end', function () {
    expectEventToPrint('suite end', '');
  });

  it('should handle unnamed suite', function () {
    expectEventToPrint('suite', '\n', [{}]);
  });

  it('should handle named suite', function () {
    expectEventToPrint('suite', 'someName\n', [{title: "someName"}]);
  });

  it('should handle unnamed pass', function () {
    expectEventToPrint('pass', '', [{}]);
  });

  it('should handle named pass', function () {
    expectEventToPrint('pass', '', [{title: 'someTestName'}]);
  });

  it('should handle named pass (colors)', function () {
    Reporter.useColors = true;
    expectEventToPrint('pass', '', [{title: 'someTestName'}]);
  });

  it('should handle named pass with slow speed', function () {
    expectEventToPrint('pass', '', [{
      title: 'someSlowTest',
      slow: function () { return 100; },
      duration: 200
    }]);
  });

  it('should handle named pass with medium speed', function () {
    expectEventToPrint('pass', '', [{
      title: 'someSlowTest',
      slow: function () { return 100; },
      duration: 75
    }]);
  });

  it('should handle named pass with fast speed', function () {
    expectEventToPrint('pass', '', [{
      title: 'someSlowTest',
      slow: function () { return 100; },
      duration: 25
    }]);
  });

  it('should handle fail', function () {
    expectEventToPrint('fail', '  1) someTestName\n', [{title: 'someTestName'}]);
  });

  it('should handle fail (colors)', function () {
    Reporter.useColors = true;
    expectEventToPrint('fail', '\u001b[31m  1) someTestName\u001b[0m\n', [{title: 'someTestName'}]);
  });

  it('should count failures', function () {
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);

    //act
    fn['fail']({title: 'someTestName'});
    fn['fail']({title: 'someTestName'});
    fn['fail']({title: 'someTestName'});

    //assert
    expect(reporter.getBuffer()).to.equal("  1) someTestName\n  2) someTestName\n  3) someTestName\n");
  });

  it('should handle end with stats', function () {
    var number = 7;
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);
    reporter.stats = {pending: number};

    fn['end']();

    expect(reporter.getBuffer()).to.equal('\n  0 passing\n  ' + number + ' pending\n\n');
  });

  it('should handle end with failure with test title', function () {
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);
    reporter.stats = {failures: 1};
    reporter.failures = [{err: {message: "test title"}}];

    fn['end']();

    expect(reporter.getBuffer()).to.equal('\n  0 passing\n  1 failing\n\n  1) :\n     test title\n  \n\n\n\n');
  });

  it('should handle end with failure with no test title', function () {
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);
    reporter.stats = {failures: 1};
    reporter.failures = [{err: {}}];

    fn['end']();

    expect(reporter.getBuffer()).to.equal('\n  0 passing\n  1 failing\n\n  1) :\n     \n  \n\n\n\n');
  });

  it('should handle end with uncaught failure', function () {
    var expected = '\n  0 passing\n' +
      '  1 failing\n\n' +
      '  1) :\n\n      Uncaught \n' +
      '      + expected - actual\n\n' +
      '      +"ABbbb"\n      -"AAaab"\n' +
      '      \n  \n\n\n\n';
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);
    reporter.stats = {failures: 1};
    reporter.failures = [{
      err: {
        uncaught: true,
        showDiff: true,
        actual: "AAaab",
        expected: "ABbbb"
      }
    }];

    fn['end']();

    expect(reporter.getBuffer()).to.equal(expected);
  });

  it('should handle end with duration', function () {
    var expected = /\n  0 passing \(10.?ms\)\n  1 failing\n\n  1\) :\n     \n  \n\n\n\n/;
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);
    reporter.stats.failures = 1;
    reporter.stats.start = new Date(new Date().getTime() - 100);
    reporter.failures = [{ err: {} }];

    fn['end']();

    expect(reporter.getBuffer()).to.match(expected);
  });

  it('should handle end with uncaught failure with inline diffs', function () {
    var expected = '\n  0 passing\n' +
      '  1 failing\n\n  1) :\n\n' +
      '      Uncaught       \n' +
      '      actual expected\n      \n' +
      '      "BbbAaa"\n      \n  \n\n\n\n';
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);

    reporter.stats = {failures: 1};
    Reporter.inlineDiffs = true;
    reporter.failures = [{
      err: {
        uncaught: true,
        showDiff: true,
        actual: "Aaa",
        expected: "Bbb"
      }
    }];

    fn['end']();

    expect(reporter.getBuffer()).to.equal(expected);
  });

  it('should handle test end', function () {
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);

    //act
    fn['test end']();

    expect(reporter.getBuffer()).to.equal('');
  });

  it('should increase indents on new suite', function () {
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);
    reporter.indents = 3;

    fn['suite']({'title': 'named suite'});

    expect(reporter.getBuffer()).to.equal('      named suite\n');
    expect(reporter.indents).to.equal(4);
  });

  it('should decrease indent after suite end', function () {
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);
    reporter.indents = 4;

    //act
    fn['suite end']();

    expect(reporter.indents).to.equal(3);
  });

  it('should go to new line after finished all suites', function () {
    var fn = listenToEvents(mockRunner);
    reporter = new Reporter(mockRunner);
    stubPrint(reporter);
    reporter.indents = 2;

    //act
    fn['suite end']();

    expect(reporter.getBuffer()).to.equal('\n');
    expect(reporter.indents).to.equal(1);
  });
});