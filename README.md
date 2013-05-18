# evo-elements

## Overview

This package includes common and basic building elements for all evo projects.

In this version, it includes:
- Class: defining Class for object-oriented programming
- Trace: simple console logging with predefined levels and customizable component names
- States: a basic framework for building a state machine
- Config: a simple configuration framework to release you from writing similar code in projects
- DelayedJob: ensure a postponed job won't be scheduled multiple times

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

### Class

#### Prototype
```javascript
Class(baseClass, prototype, options);
```

#### Parameters

- `baseClass`: baseClass type, optional, default is Object;
- `prototype`: the prototype for new class;
- `options`: other options like _implements_ and _statics_, see details below.

#### Returns

The newly defined class.

#### Details

A simple and quick sample:

```javascript
var Class = require('evo-elements').Class;

var MyClass = Class({
  constructor: function (value) {
    // this is the constructor
    this._value = value;
  },
    
  print: function () {
    console.log(this._value);
  },
  
  // getter/setter is supported
  get value () {
    return this._value;
  },
  
  set value (value) {
    if (!isFinite(value)) {
      throw new Error('Bad Value');
    }
    this._value = value;
  }
});

var myObject = new MyClass(1);
myObject.print(); // get 1
myObject.value = myObject.value + 100;
myObject.print(); // get 101
```

A simple inheritance sample:

```javascript
var BaseClass = Class({
  constructor: function (value) {
    this.value = value;
  },
  
  print: function () {
    console.log('BaseClass: %d', this.value);
  }
});

var SubClass = Class(BaseClass, {
  constructor: function (val1, val2) {
    BaseClass.prototype.constructor.call(this, val1 + val2);
  },
  
  print: function () {
    console.log('SubClass');
    BaseClass.prototype.print.call(this);
  }
});

var myObject = new SubClass(1, 2);
myObject instanceof SubClass;   // true
myObject instanceof BaseClass;  // true
myObject.print();
// get
// SubClass
// BaseClass: 3
```

Multiple inheritance with _implements_

```javascript
var ActiveBuffer = Class(Buffer, {
  // override Clearable
  clear: function () {
    // TODO I hate to be cleared
    this.emit('cleared');
  }
}, {
  implements: [EventEmitter, Clearable]
});

var buffer = new ActiveBuffer().on('cleared', function () { console.log('CLEARED'); });
buffer.clear();

buffer instanceof Buffer; // true
buffer instanceof EventEmitter; // false
buffer instanceof Clearable;  // false
```

Static members

```javascript
var Singleton = Class({
  constructor: function () {
    // ...
  },
  
  work: function () {
    // ...
  }
}, {
  statics: {
    get instance () {
      if (!Singleton._instance) {
        Singleton._instance = new Singleton();
      }
      return Singleton._instance;
    }
  }
});

Singleton.instance.work();
```

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

### Config

A simple configuration framework to load settings from command line arguments and configuration files.
It also provides a global settings object to be shared by all the modules in one project.
When using this, we don't need to write logic for parsing command line and loading and configuration files.

the configuration can always be shared in modules by

```javascript
var conf = require('evo-elements').Config.conf;
```

Usually in the main script, use

```javascript
var conf = require('evo-elements').Config.parse(myArgv).conf;
```

to parse from specified arguments instead of `process.argv`.

Then, use `conf.opts` to access all the setting options.

Only one command line option is reserved: `-c CONFIG_FILE` or `--config CONFIG_FILE` for long option form.
The `CONFIG_FILE` must be a YAML file, and all the keys are merged into `conf.opts`.
For other options like `--option VALUE` or `--option=VALUE` will become: `conf.opts[option] = VALUE`.
`VALUE` is automatically parsed into `Number`, `String` or `Boolean`, if you want to specify a JSON, use `--option=json:JSON_STRING`.

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

## License

MIT/X11 License
