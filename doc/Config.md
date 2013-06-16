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

`Config` is the class for parsing arguments. `Config.conf()` returns the global instance which can be shared
across your project. It can also be used individually:

```javascript
var conf = new Config();
conf.parse(args);
...
```

The parsed arguments will be remembered, and `reload` will parse them again:

```javascript
var conf = new Config();
conf.parse(args);
...
conf.reload();
```

It is very useful to reload configurations when some of the configuration files are detected to be changed.
Each time `parse` or `reload` is invoked, the event `reload` is emitted on the configuration instance. You can use
this to apply configuration change on the fly.

`reload` accepts one optional boolean parameter. When it is `true`, it will first clear `opts` before re-parse the
arguments. Otherwise, the configurations are reloaded on existing `opts`, which means some values may not be overwritten
but merged.

`Config` instances also provides an easy-to-use `query` method which accepts a key-path like `key1.key2.key3`. It tries to
retrieve the value of `opts.key1.key2.key3`. If any intermediate key doesn't exist or is not an object, it returns the default
value which is optionally specified as the second parameter, or `undefined`. Some examples:

```javascript
var logLevel = conf.query('logger.default.level', 'info');  // get 'info' if key doesn't exist
var namedLevel = conf.query('logger.name.level');           // get undefined if key doesn't exist
```

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