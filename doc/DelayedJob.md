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

Or specify a default delay in constructor:

```javascript
var job = new DelayedJob(function () { ... }, 100);
job.schedule();     // it will be scheduled in 100ms
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