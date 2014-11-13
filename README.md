mocha-dot-reporter-async
------------------------

Used when reporting from Gulp. Outputs all test results at once to avoid an async console.log mess.

Removed output from successful unit tests, since displaying dots when the process output is only displayed at the end is kinda pointless.

[![Build Status](https://travis-ci.org/TakenPilot/mocha-dot-reporter-async.svg?branch=master)](https://travis-ci.org/TakenPilot/mocha-dot-reporter-async)

[![Code Climate](https://codeclimate.com/github/TakenPilot/mocha-dot-reporter-async/badges/gpa.svg)](https://codeclimate.com/github/TakenPilot/mocha-dot-reporter-async)

[![Coverage Status](https://coveralls.io/repos/TakenPilot/mocha-dot-reporter-async/badge.png?branch=master)](https://coveralls.io/r/TakenPilot/mocha-dot-reporter-async?branch=master)

[![Dependencies](https://david-dm.org/TakenPilot/mocha-dot-reporter-async.svg?style=flat)](https://david-dm.org/TakenPilot/mocha-dot-reporter-async.svg?style=flat)

##Example
```JavaScript
gulp.task('unit-tests', function () {
  var mocha = require('gulp-mocha');

  return gulp.src('./test/unit/**/*.js', {read: false})
      .pipe(mocha({
        reporter: 'mocha-dot-reporter-async',
        ui: 'bdd'
      }));
});
```

##To DO
* Lower code complexity
* Find better way to convert checkmarks and ecks between windows and linux/mac.
