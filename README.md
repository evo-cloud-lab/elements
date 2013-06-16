# evo-elements

## Overview

This package includes common and basic building elements for all evo projects.

In this version, it includes:
- Logger: logging infrastructure using syslog levels
- Config: a simple configuration framework to release you from writing similar code in projects
- Trace: simple console logging with predefined levels and customizable component names
- States: a basic framework for building a state machine
- DelayedJob: ensure a postponed job won't be scheduled multiple times
- Try: simple try/catch block wrapper to save you writing try/catch by routing exception to callback

## Install

```bash
npm install evo-elements
```

or pull directly from github.com and link to your project:

```bash
git clone https://github.com/evo-cloud/elements
npm link elements --prefix=node_modules
```

In your JavaScript code, use

```javascript
var elements = require('evo-elements');
```

## How to Use

### Logger

The usage is very simple by:

```javascript
logger = new Logger('componentName', 'prefix'); // prefix is optional
logger.emerg(...);  // aliases: emergent, fatal
logger.alert(...); 
logger.crit(...);   // aliases: critical
logger.error(...);  // aliases: err
logger.warning(...);// aliases: warn
logger.notice(...);
logger.info(...);   // aliases: verbose
logger.debug(...);  // aliases: dbg
```

The arguments are same as `util.format(...)`.

The logging drivers and levels are provided by `Config.conf()`. The schema is like:

```javascript
{
    logger: {
        default: {  // this is default configuration
            level: 'default log level' // default is 'notice'
        },
        componentName: {
            level: 'component-specific level'
        },
        drivers: {  // select logging drivers
            driverId1: {
                driver: 'console',  // use console driver
                options: {          // console specific options
                    json: true,     // optional
                    level: 'debug', // console driver specific level
                }
            },
            driverId2: {
                driver: 'file',     // use file driver
                options: {
                    filename: 'logfile.log'
                }
            },
            ...
        }
    }
}
```

`Logger` is backed by [winston](http://npmjs.org/package/winston) package.

### Config

A simple configuration framework to load settings from command line arguments and configuration files.
It also provides a global settings object to be shared by all the modules in one project.
When using this, we don't need to write logic for parsing command line and loading and configuration files.

the configuration can always be shared in modules by

```javascript
var conf = require('evo-elements').Config.conf();
```

Usually in the main script, use

```javascript
var conf = require('evo-elements').Config.conf(myArgv);
```

to parse from specified arguments instead of `process.argv`.

Then, use `conf.opts` to access all the setting options.

All command line arguments follow the unified schema:

- `-c CONFIG_FILE`: merge configurations from file, the file can be `json` or `yaml` determined by extension;
- `-C CONFIG_FILE`: load configurations from file, but replace all top-level keys with new values instead of merging;
- `-D KEY_PATH=VAL`: set a value for a key. KEY_PATH is like `key1.key2.keyN` from top-level;
- `--KEY=VAL`: set a value for a top-level key.

The `VAL` above can be in the format like:

- `true` or `false`: interpreted as `true` or `false`;
- Numeric value: interpreted by `parseInt` or `parseFloat`;
- `"string"`: quoted string, treated as a JSON string value;
- `{ ... }`: a JSON object;
- `[ ... ]`: a JSON array;
- `string`: a simple string;
- `@filename`: load values from configuration file;
- Empty value: interpreted as `undefined`.

### Trace

#### Prototype

```javascript
var trace = Trace(componentName);
trace.error(...);
trace.warn(...);
trace.info(...);
trace.verbose(...);
trace.debug(...);
// aliases
trace.err(...); // same as error
trace.log(...); // same as info
trace.dbg(...); // same as debug
trace.verb(...); // same as verbose
```

#### Parameters

- `componentName`: a string which will be prefixed to the logged line


#### Returns

The trace object. All the methods follow the same usage as `console.log`.

#### Details

The implementation is backed by [debug](http://npmjs.org/package/debug) package. 
You can use environment variable `DEBUG` to control which information should be logged.
See [here](https://github.com/visionmedia/debug) for details.

### States

A simple state machine.

```javascript
var states = new States(initialState);
states.transit(newState);
states.from(currState).transit(newState)
```

- `initialState`: optional, initialize the state machine with the provided state.
- `newState`: the next state to switch to. It can be an object or a function. 
              If it is a function, it gets invoked when transit happens and 
              is expected to return the new state object.
- `currState`: used with `from` to assert current state must be currState, otherwise `transit` will not happen.

A state object can provides two methods: `enter` and `leave`, both are optional.

```javascript
state.enter(previousState)
```

Expects returning a state object for next state. If it is different from current state, transition keeps runing.

```javascript
state.leave(nextState)
```

Invoked when the state machine transits to `nextState` before invoking `nextState.enter`.

### DelayedJob

If you know `process.nextTick` or `setTimeout`, then you know what a `DelayedJob` instance does.
But a little differently. Each time invoking `process.nextTick` or `setTimeout` will schedule a job, 
the job executes as many times as you schedule. With a single instance of `DelayedJob`, the job is only scheduled once.
The next time you schedule before the job gets run, it does nothing.

The usage is simple:

```javascript
var job = new DelayedJob(function () {
  // Do what you want ...
});

job.schedule(1000); // it will be scheduled in 1 second
job.schedule();     // you want to scheduled in next tick, but actually do nothing, because already scheduled
job.schedule(200);  // still do nothing.
```

Why is this pattern useful? It is used to collect some small events, and perform all of them in one shot, like:

```javascript
var queue = [];
var job = new DelayedJob(function () {
  console.log(queue.join(','));
  // clear queue
  queue = [];
});

queue.push('something');
job.schedule();

queue.push('something more');
job.schedule();
...

// finally, all the message are processed in one shot
// printed: something,something more
```

### Try

It is a simple try/catch wrapper to route the exception to a specified handler. First create a `Try` instance:

```javascript
var tries = new Try(exceptionHandlerFn);
```

Then, perform you logic:

```javascript
tries.tries(function () {
    // do some logic, or throw something
});

// or with multiple functions executed one-by-one
tries.tries([
    function () {
        // do something
    },
    function () {
        // do something more
    },
    ...
]);
```

If nothing is thrown, all functions get executed.
Otherwise, `exceptionHandlerFn` passed to constructor will be called with exception, and the following functions are not executed.

The returned value follows the schema:

```javascript
{
    ok: true/false, // to indicate if any error is caught
    error: error object, // only present when ok is false
    result: returned value by tried functions   // it is an array if the passed in argument is an array
}
```

If you want the `exceptionHandlerFn` always be called even there is nothing thrown, use:

```javascript
tries.final(function () { ... });
// or
tries.final([function () { ... }, function () { ... }, ...]);
```

There are two static methods which avoids creating the object:

```javascript
Try.tries(fn, exceptionHandler, final);
// fn can be a single function or an array of functions
// final is optional, if true, it invokes final instead of tries
Try.final(fn, exceptionHandler);
// simple wrapper for final
```

This is very used especially in [mocha](http://npmjs.org/package/mocha) async tests to check something in a callback.

## License

MIT/X11 License
