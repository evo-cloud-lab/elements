### States

Consolidating the difference between current state and expected state.

To use this class, define a sub-class with a bunch of methods following the naming convention:

```javascript
'currentState:expectedState': function () {
    ...
    return ['validState1', 'validState2', ...];
}
```

The instance accepts an expectation, and invoke the corresponding method to solve the difference
between current state and expected state. E.g.

```javascript

var MyStates = Class({
    constructor: function (machine) {
        States.prototype.constructor.call(this, machine.state);
        this.machine = machine;
        this.machine.on('state', function (state) {
            this.current = state;
        }.bind(this));
    },

    'idle:running': function () {
        ...
        this.machine.prepare();
        ...
        return ['preparing', 'prepared', 'running'];
    },

    'prepared:running': function () {
        this.machine.start();
        return ['starting', 'running'];
    }
});

var m = new Machine();
...
var s = new MyStates(m);
s.setExpectation('running');
```

In the example above, if the current state of machine is `idle`,
the machine will go through `preparing`, `prepared`, `starting`, and finally reaches `running`.

In case the machine needs fix and fails after transits to `starting`, it will turn to `stopped`
but not `running`. Then MyStates will find `stopped` is not in valid states, `error` is raised
for consoliation failure. Current state is still accepted and expectation is cleared.
