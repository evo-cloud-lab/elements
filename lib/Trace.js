var debug = require('debug'),
    Logger = require('./Logger');

function traceFactory(name, prefix) {
    var trace = {
        error:   debug(name + '[E]'),
        warn:    debug(name + '[W]'),
        info:    debug(name + '[I]'),
        verbose: debug(name + '[V]'),
        debug:   debug(name + '[D]'),
        prefix:  prefix
    };
    ['error', 'warn', 'info', 'verbose', 'debug'].forEach(function (method) {
        if (trace[method].enabled) {
            var debugFn = trace[method];
            trace[method] = function () {
                var args = [].slice.call(arguments);
                if (args.length > 0) {
                    var prefixStr = typeof(trace.prefix) == 'function' ? trace.prefix.apply(this, arguments) : (trace.prefix || '').toString();
                    if (typeof(args[0]) == 'string') {
                        args[0] = prefixStr + args[0];
                    } else {
                        args.unshift(prefixStr + "%j");
                    }
                    debugFn.apply(this, args);
                } else {
                    debugFn.apply(this, arguments);
                }
            }
        }
    });

    trace.err = trace.error;
    trace.log = trace.info;
    trace.verb = trace.verbose;
    trace.dbg = trace.debug;
    return trace;
};

// Creates a Logger compatible logger but backed by trace

// mappings
var LEVEL_MAP = {
    emerg: 'error',
    alert: 'error',
    crit:  'error',
    error: 'error',
    warning: 'warn',
    notice: 'info',
    info: 'verbose',
    debug: 'debug'
};

traceFactory.logger = function (name, prefix) {
    var trace = traceFactory(name, prefix);
    var logger = Object.create({
        name: name,

        get prefix () {
            return trace.prefix;
        },

        set prefix (_prefix) {
            return trace.prefix = _prefix;
        }
    });
    Logger.LEVELS.forEach(function (level) {
        logger[level.name] = trace[LEVEL_MAP[level.name]].bind(trace);
        level.aliases.forEach(function (alias) {
            logger[alias] = logger[level.name];
        });
    });
    return logger;
};

module.exports = traceFactory;
