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