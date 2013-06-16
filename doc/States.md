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