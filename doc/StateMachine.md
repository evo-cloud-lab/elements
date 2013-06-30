### StateMachine

A state machine with readable DSL.

```javascript
var stateMachine = new StateMachine()
        .error('error')                     // this declares the global error state
        .state('error', new ErrorState())
        .state('state1', new State1())
            .when('loaded').to('state2')
            .error('error')                 // this is error transition for state1
        .state('state2', new State2())
            .when(/.+-ready$/).to('work')
            .when(['failure', 'failed']).to('state2')
            .when(function (transition) { return transition == 'reset' }).to('state1')
        .state('work', new WorkState())
            .when('reset').to('state1')
            .when('pause').to('paused')
            .when('stop').to('end')
        .state('paused', new PausedState())
            .when('pause').to('paused')
            .when('resume').to('work')
            .fallback('work')
        .state('end', new EndState())
        .init('state1')
    .start()
...

stateMachine.process(...);
```

The `state` can provide following methods:

- `enter`: defined as `function (transit, ...)`. `transit` is the function to transit to another state. Other arguments are passed from last transition call.
- `leave`: defined as `function (newStateName)`. Invoked when current state is transitted to the new state.
- `process`: defined as `function (transit, ...)`. Invoked when @see StateMachine#process is invoked, and passed in the same arguments after `transit` function.

The `transit` function is defined as `function transit(transition, ...)`. `transition` is a transition key to find the next state defined when building the
state machine, @see StateMachine#when, @see StateMachine#to, @see StateMachine#fallback. The following arguments are passed to `enter` of the new state. This
function can also be called from an asynchronous callback.

The following methods are used to define a state machine:

```javascript
stateMachine.state(name, state)
```

Add a new state named `name` to the state machine. `state` is an object which optional provides `enter`, `leave` and `process`.

```javascript
stateMachine.when(condition)
```

Add a transition condition to previously added state. The `condition` can be one of

- a simple string: transition key is matched exactly;
- a `RegExp` instance: transition key is matched with this regular expression;
- an array of strings: transition key is matched if it is in this array;
- a function: transition key is passed to this function, and it is matched when this function returns `true`.

```javascript
stateMachine.to(stateName)
```

Add a transition target to previously added condition. It must be paired with `when`. `stateName` is the name defined by `stateMachine.state`.

```javascript
stateMachine.fallback(stateName)
```

Treat any transition key as matched. It performs a unconditional transition to specified `stateName`.

```javascript
stateMachine.init(stateName)
```

Explicitly specify the initial state. Otherwise the first state added is the initial state.

```javascript
stateMachine.error(stateName)
```

Specify the global error state, and must be specified before all state definition. Otherwise, it becomes a state specific error state. When an instance of
`Error` or the string `error` (followed by `Error` instance) is passed as the transition key, the error transition condition is looked up in current state.
If found, it is used, otherwise the global error state is transitted to. If no error state is defined either in state's scope or globally, the error is thrown.

```javascript
stateMachine.start(...)
```

Finalize the definition of this state machine and transits to the initial state. The arguments will be passed to `enter` of the initial state.
When invoking `start`, all the states must be defined consistently (e.g. it is inconsistent if a `when` is used without a `to`).
And after that, all defining-related methods (`state`, `when`, `to`, `fallback`, `init`, `error`) can't be used.

```javascript
stateMachine.process(...)
```

Invoke `process` of current state with passed in arguments.

Several methods can be used to query states in state machine:

```javascript
var state = stateMachine.current
```

This retrieves the current state object. It is `undefined` if state machine is not started.

```javascript
var name = stateMachine.currentName
```

This retrieves the name of current state. It is `undefined` if state machine is not started.

```javascript
var state = stateMachine.getState(name)
```

This retrieves the state object by name. It can be used at any time.