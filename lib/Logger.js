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
    { name: 'emerg',   color: 'red',      aliases: ['emergent', 'fatal'] },
    { name: 'alert',   color: 'yellow',   aliases: [] },
    { name: 'crit',    color: 'red',      aliases: ['critical'] },
    { name: 'error',   color: 'red',      aliases: ['err'] },
    { name: 'warning', color: 'yellow',   aliases: ['warn'] },
    { name: 'notice',  color: 'cyan',     aliases: [] },
    { name: 'info',    color: 'green',    aliases: ['verbose'] },
    { name: 'debug',   color: 'blue',     aliases: ['dbg'] }
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
    
    create: function (name) {
        if (this._loggers[name]) {
            return this._loggers[name];
        }
        var logger = new winston.Logger({
            levels: this._winston.levels,
            colors: this._winston.colors,
            level: 'debug'
        });
        var drivers = Config.conf().query('logger.drivers', { console: { driver: 'console' } });
        var comopts = Config.conf().query(['logger', 'components', name, 'options']);
        var allopts = Config.conf().query('logger.options');
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
    }
}, {
    statics: {
        create: function (name) {
            if (!LoggerDriver._instance) {
                LoggerDriver._instance = new LoggerDriver();
            }
            return LoggerDriver._instance.create(name);
        }
    }
});

var Logger = Class({
    constructor: function (name, prefix) {
        this.name = name;
        this.prefix = prefix;
        this._configure(Config.conf().on('reload', this._configure.bind(this)));
    },
    
    _configure: function (cfg) {
        this._logger = LoggerDriver.create(this.name);
        
        var level = cfg.query('logger.level', Logger.DEFAULT_LEVEL);
        level = cfg.query(['logger', 'components', this.name, 'level'], level).toLowerCase();

        var levelIndex, defaultIndex;
        Levels.some(function (def, index) {
            if (def.name == Logger.DEFAULT_LEVEL) {
                defaultIndex = index;
            }
            if (def.name == level) {
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
        
        Levels.forEach(function (definition, index) {
            var method;
            if (index <= this.levelIndex) {
                method = (function (logger, index) {
                    return function () {
                        var args = [].slice.call(arguments);
                        args.unshift(index);
                        logger._log.apply(logger, args);
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
        
        addDriver: function (id, type, options) {
            Drivers[id] = { type: type, options: options || {} };
        },
        
        wrap: function (logger) {
            if (!logger) {
                logger = {};
                Levels.forEach(function (level) {
                    logger[level.name] = function () { };
                    level.aliases.forEach(function (name) {
                        logger[name] = function () { };
                    });
                });
            }
            return logger;
        }
    }
});

module.exports = Logger;