/** @fileoverview
 * Unified Logger interface backed by winston
 *
 * A sample logger configuration (YAML):
 * logger:
 *   default:
 *     level: notice
 *   drivers:
 *     console:
 *       driver: console
 *     file1:
 *       driver: file
 *       options:
 *         filename: file1.log
 *     file2:
 *       driver: file
 *       options:
 *         filename: file2.log
 */

var _       = require('underscore'),
    winston = require('winston'),
    syslog  = require('winston-syslog'),
    Class   = require('js-class'),
    Config  = require('./Config');

// Syslog levels
var Levels = [
    { name: 'emerg',   color: 'red',      aliases: ['emerge', 'emergent', 'fatal'] },
    { name: 'alert',   color: 'yellow',   aliases: [] },
    { name: 'crit',    color: 'red',      aliases: ['critical'] },
    { name: 'error',   color: 'red',      aliases: ['err'] },
    { name: 'warning', color: 'yellow',   aliases: ['warn'] },
    { name: 'notice',  color: 'green',    aliases: ['note'] },
    { name: 'info',    color: 'blue',     aliases: ['info', 'verbose', 'verb'] },
    { name: 'debug',   color: 'grey',     aliases: ['debug'] }
];

// Supported Drivers
var Drivers = {
    console: {
        type: winston.transports.Console,
        options: {
            colorize: true,
            prettyPrint: true
        }
    },

    file: {
        type: winston.transports.File,
        options: {
            timestamp: true,
            handleExceptions: true
        }
    },

    syslog: {
        type: winston.transports.Syslog,
        options: {
            timestamp: true,
            handleExceptions: true
        }
    }
};

var LoggerDriver = Class({
    constructor: function () {
        this._winston = { levels: {}, colors: {} };
        Levels.forEach(function (def, index) {
            this._winston.levels[def.name] = Levels.length - index - 1;
            this._winston.colors[def.name] = def.color;
        }, this);
        this._loggers = {};
    },

    create: function (name, conf) {
        if (this._loggers[name]) {
            return this._loggers[name];
        }
        var logger = new winston.Logger({
            levels: this._winston.levels,
            colors: this._winston.colors,
            level: 'debug'
        });
        var drivers = conf.query('logger.drivers', { console: { driver: 'console' } });
        var comopts = conf.query(['logger', 'components', name, 'options']);
        var allopts = conf.query('logger.options');
        for (var id in drivers) {
            var d = drivers[id];
            var driver = Drivers[d.driver];
            if (driver) {
                var options = { json: false, level: 'debug' };
                _.extend(options, driver.options);
                typeof(d.options) == 'object' && _.extend(options, d.options);
                typeof(comopts) == 'object' && _.extend(options, comopts);
                typeof(allopts) == 'object' && _.extend(options, allopts);
                options.label = name;
                logger.add(driver.type, options);
            }
        }
        this._loggers[name] = logger;
        return logger;
    },

    clone: function (name, newName) {
        var logger = this._loggers[name];
        if (!logger) {
            throw new Error('Invalid logger: ' + name);
        }
        if (newName && newName != name) {
            if (this._loggers[newName]) {
                return this._loggers[newName];
            }
            this._loggers[newName] = logger;
        }
        return logger;
    }
}, {
    statics: {
        get instance () {
            if (!LoggerDriver._instance) {
                LoggerDriver._instance = new LoggerDriver();
            }
            return LoggerDriver._instance;
        },

        create: function (name, conf) {
            return LoggerDriver.instance.create(name, conf || Config.conf());
        },

        clone: function (name, newName) {
            return LoggerDriver.instance.clone(name, newName);
        }
    }
});

var Logger = Class({
    constructor: function (name, prefix, conf) {
        this.name = name;
        this.prefix = prefix;
        if (conf instanceof Logger) {
            var parentLogger = conf;
            this._logger = LoggerDriver.clone(parentLogger.name, name);
            this.level = parentLogger.level;
            this.levelIndex = parentLogger.levelIndex;
            this._prefixWidth = parentLogger._prefixWidth;
            this._createMethods();
        } else if (name) {
            this._configure((conf || Config.conf()).on('reload', this._configure.bind(this)));
        } else {
            this.levelIndex = -1;
            this._createMethods();
        }
    },

    clone: function (opts) {
        opts == null && (opts = {});
        if (typeof(opts) != 'object') {
            throw new Error('Invalid argument opts');
        }
        return this.levelIndex >= 0 ? new Logger(opts.name || this.name, opts.prefix || this.prefix, this) : this;
    },

    logError: function (err, opts) {
        if (err instanceof Error) {
            opts = _.extend({
                level: 'error',
                stack: 'debug'
            }, opts || {});
            var msg = opts.message || err.message;
            this[opts.level] && this[opts.level].call(this, msg);
            this[opts.stack] && this[opts.stack].call(this, err.stack);
        }
        return this;
    },

    _configure: function (cfg) {
        this._logger = LoggerDriver.create(this.name, cfg);

        var level = cfg.query('logger.level', Logger.DEFAULT_LEVEL);
        level = cfg.query(['logger', 'components', this.name, 'level'], level).toLowerCase();

        var levelIndex, defaultIndex;
        Levels.some(function (def, index) {
            var names = def.aliases.slice();
            names.unshift(def.name);
            if (names.indexOf(Logger.DEFAULT_LEVEL) >= 0) {
                defaultIndex = index;
            }
            if (names.indexOf(level) >= 0) {
                level = def.name;
                levelIndex = index;
                return true;
            }
            return false;
        });

        if (levelIndex == undefined) {
            level = Logger.DEFAULT_LEVEL;
            levelIndex = defaultIndex;
        }
        this.level = level;
        this.levelIndex = levelIndex;

        this._prefixWidth = parseInt(cfg.query('logger.prefix-width'));

        this._createMethods();
    },

    _createMethods: function () {
        Levels.forEach(function (definition, index) {
            var method;
            if (index <= this.levelIndex) {
                method = (function (logger, index) {
                    return function () {
                        var args = [].slice.call(arguments);
                        args.unshift(index);
                        logger._log.apply(logger, args);
                        return this;
                    };
                })(this, index);
                method.enabled = true;
            } else {
                method = function () { };
                method.enabled = false;
            }
            this[definition.name] = method;
            definition.aliases.forEach(function (name) {
                this[name] = this[definition.name];
            }, this);
        }, this);
    },

    _log: function () {
        var level = arguments[0];
        var args = [].slice.call(arguments, 1);
        if (args.length > 0) {
            if (this.prefix) {
                var prefixStr = typeof(this.prefix) == 'function' ? this.prefix.apply(this, arguments) : this.prefix.toString();
                if (!isNaN(this._prefixWidth) && this._prefixWidth > prefixStr.length) {
                    var count = this._prefixWidth - prefixStr.length;
                    for (var i = 0; i < count; i ++) {
                        prefixStr += ' ';
                    }
                }
                if (typeof(args[0]) == 'string') {
                    args[0] = prefixStr + args[0];
                } else {
                    args.unshift(prefixStr + "%j");
                }
            }
            args.unshift(Levels[level].name);
            args.push({});  // to disable meta-data
            this._logger.log.apply(this._logger, args);
        }
    }
}, {
    statics: {
        DEFAULT_LEVEL: 'notice',
        LEVELS: Levels,

        addDriver: function (id, type, options) {
            Drivers[id] = { type: type, options: options || {} };
        },

        wrap: function (logger) {
            if (!logger) {
                logger = new Logger();
                Levels.forEach(function (level) {
                    logger[level.name] = function () { };
                    level.aliases.forEach(function (name) {
                        logger[name] = function () { };
                    });
                });
            }
            return logger;
        },

        clone: function (logger, opts) {
            return Logger.wrap(logger).clone(opts);
        }
    }
});

module.exports = Logger;
