### Logger

Import `Logger` from `evo-elements`:

```javascript
var Logger = require('evo-elements').Logger;
```

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