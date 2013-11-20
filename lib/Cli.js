var Class  = require('js-class'),
    tty    = require('tty'),
    util   = require('util'),
    nomnom = require('nomnom'),
    colors = require('colors');

var THEME = {
    warn: function (str) { return str.yellow; },
    err:  function (str) { return str.red; },
    verb: function (str) { return str.yellow; },
    ok:   function (str) { return str.green; },
    hi:   function (str) { return str.white; },
    lo:   function (str) { return str.grey; },
    live: function (str) { return str.cyan; },
    hot:  function (str) { return str.red; },
    cold: function (str) { return str.blue; },
    em:   function (str) { return str.bold; },
    inv:  function (str) { return str.inverse; },
    _:    function (str) { return str.underline; }
};

var Cli = Class({
    constructor: function (scriptName) {
        this.scriptName = scriptName;
        this.options = nomnom;
        this.debugging = false;

        this.options
            .script(scriptName)
            .option('debug', {
                flag: true,
                default: false,
                help: 'Print more information for debugging',
                callback: function (val) {
                    this.debugging = val;
                }.bind(this)
            })
            .option('color', {
                flag: true,
                default: true,
                help: 'Display in color',
                callback: function (val) {
                    if (!val) {
                        for (var method in THEME) {
                            this[method] = function (str) { return str; };
                        }
                    }
                }.bind(this)
            })
        ;

        if (tty.isatty(process.stdout)) {
            for (var method in THEME) {
                this[method] = THEME[method];
            }
        } else {
            for (var method in THEME) {
                this[method] = function (str) { return str; };
            }
        }
    },

    run: function () {
        try {
            this.options.parse();
        } catch (err) {
            this.fatal(err);
        }
    },

    pad: function () {
        Cli.pad.apply(Cli, arguments);
        return this;
    },

    assert: function (callback) {
        return function (err) {
            err ? this.fatal(err)
                : (callback && callback.apply(undefined, [].slice.call(arguments, 1)));
        }.bind(this);
    },

    fatal: function (err) {
        this.logErr(this.err('FATAL: ' + (err instanceof Error ? err.message : err.toString())));
        this.debugging && err instanceof Error && this.logErr(err.stack);
        process.exit(1);
    },

    success: function (message) {
        this.log(this.ok(message == null ? 'OK' : message));
    },

    exit: function (err) {
        err ? this.fatal(err) : this.success();
        process.exit(err ? 1 : 0);
    },

    log: function () {
        process.stdout.write(util.format.apply(util, arguments) + "\n");
        return this;
    },

    logErr: function () {
        process.stderr.write(util.format.apply(util, arguments) + "\n");
        return this;
    },

    logObject: function (object, opts, level) {
        var indent = opts && opts.indent || 4;
        level || (level = 0);
        var paddings = Cli.pad('', indent * level);

        var array = Array.isArray(object);
        if (array || (object != null && typeof(object) == 'object')) {
            for (var k in object) {
                var val = object[k];
                var key = array ? this.hi('-') : (this.hi(opts && opts.keyWidth ? Cli.pad(k, opts.keyWidth) : k) + ':');
                if (val == null || typeof(val) != 'object') {
                    this.log(paddings + key + ' ' +
                             (opts && opts.renders && opts.renders[k] ? opts.renders[k](val) : this.renderValue(val)));
                } else {
                    this.log(paddings + key);
                    this.logObject(val, opts, level + 1);
                }
            }
        } else {
            this.log(paddings + this.renderValue);
        }
    },

    renderValue: function (val) {
        if (val === undefined) {
            return this.lo('undefined');
        } else if (val === null) {
            return this.lo('null');
        } else {
            switch (typeof(val)) {
                case 'string':
                    return val;
                case 'boolean':
                    return this.verb(val.toString());
                case 'number':
                    return this.live(val.toString());
            }
        }
        return '';
    }
}, {
    statics: {
        pad: function (str, width, align) {
            if (str.length > width) {
                return str.substr(0, width - 3) + '...';
            }
            var rest = width - str.length, padl = 0, padr = 0;
            switch (align) {
                case 'center':
                    padl = rest / 2;
                    padr = rest - padl;
                    break;
                case 'right':
                    padl = rest;
                    break;
                default:
                    padr = rest;
                    break;
            }
            var spaces = [padl, padr].map(function (sz) {
                var sp = '';
                for (var i = 0; i < sz; i ++) {
                    sp += ' ';
                }
                return sp;
            });
            return spaces[0] + str + spaces[1];
        }
    }
});

module.exports = Cli;
