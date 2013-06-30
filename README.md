[![Build Status](https://travis-ci.org/evo-cloud/elements.png?branch=master)](https://travis-ci.org/evo-cloud/elements)

# evo-elements

## Overview

This package includes common and basic building elements for all evo projects.

In this version, it includes:
- BiMap: a bi-directional map which maps a key entity <key1, key2> to a value;
- Config: a simple configuration framework to release you from writing similar code in projects;
- DelayedJob: ensure a postponed job won't be scheduled multiple times;
- Logger: logging infrastructure using syslog levels;
- StateMachine: a state machine with easy-to-use DSL;
- States: a basic framework for building a state machine;
- Trace: simple console logging with predefined levels and customizable component names;
- Try: simple try/catch block wrapper to save you writing try/catch by routing exception to callback.

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

See [doc](https://github.com/evo-cloud/elements/tree/master/doc) for manuals of individual components.

## License

MIT/X11 License
