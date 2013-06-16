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