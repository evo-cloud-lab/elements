var Class  = require('js-class'),
    tty    = require('tty'),
    util   = require('util'),
    yaml   = require('js-yaml'),
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
        this.theme = tty.isatty(process.stdout) ? 'color' : 'plain';

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
            .option('theme', {
                metavar: 'THEME',
                default: this.theme,
                type: 'string',
                help: 'Display theme: color, plain, code, json',
                callback: function (val) {
                    this.theme = val;
                    if (this.theme != 'color') {
                        for (var method in THEME) {
                            this[method] = function (str) { return str; };
                        }
                    }
                    switch (this.theme) {
                        case 'code':
                            this.logOut = this._logOutCode;
                            this.logErr = this._logErrCode;
                            this.logList = this._logListCode;
                            this.logAction = this._logActionCode;
                            this.logObject = this._logObjectCode;
                            break;
                        case 'json':
                            this.logOut = this.logErr = function () { };
                            this.logList = this._logListJson;
                            this.logAction = this._logActionJson;
                            this.logObject = this._logObjectJson;
                            break;
                        default:
                            this.logOut = this._logOut;
                            this.logErr = this._logErr;
                            this.logList = this._logListHuman;
                            this.logAction = this._logActionHuman;
                            this.logObject = this._logObjectHuman;
                            break;
                    }
                }.bind(this)
            })
        ;

        if (this.theme == 'color') {
            for (var method in THEME) {
                this[method] = THEME[method];
            }
        } else {
            for (var method in THEME) {
                this[method] = function (str) { return str; };
            }
        }

        this.logOut = this._logOut;
        this.logErr = this._logErr;
        this.logList = this._logListHuman;
        this.logAction = this._logActionHuman;
        this.logObject = this._logObjectHuman;
    },

    run: function () {
        try {
            this.options.parse();
        } catch (err) {
            this.fatal(err);
        }
    },

    pad: function () {
        return Cli.pad.apply(Cli, arguments);
    },

    assert: function (callback) {
        return function (err) {
            err ? this.fatal(err)
                : (callback && callback.apply(undefined, [].slice.call(arguments, 1)));
        }.bind(this);
    },

    fatal: function (errs) {
        errs && !Array.isArray(errs) && (errs = [errs]);
        errs.forEach(function (err) {
            this.logErr(this.err('FATAL: ' + (err instanceof Error ? err.message : err.toString())));
            this.debugging && err instanceof Error && this.logErr(err.stack);
        }, this);
        process.exit(1);
    },

    success: function (message) {
        this.logOut(this.ok(message == null ? 'OK' : message));
    },

    exit: function (err) {
        err ? this.fatal(err) : this.success();
        process.exit(err ? 1 : 0);
    },

    writeOut: function (data) {
        process.stdout.write(data);
        return this;
    },

    writeErr: function (data) {
        process.stderr.write(data);
        return this;
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
    },

    _logActionHuman: function (verb, subject, state, stylus) {
        stylus || (stylus = {});
        var tokens = [];
        verb && tokens.push(stylus.verb ? stylus.verb(verb) : this.verb(verb));
        if (subject) {
            var padding = stylus.padding || stylus.p;
            if (padding) {
                var width, align;
                if (typeof(padding) == 'object') {
                    width = padding.w;
                    align = padding.a;
                } else {
                    width = padding;
                }
                width = parseInt(width);
                if (!isNaN(width)) {
                    subject = Cli.pad(subject, width, align);
                }
            }
            tokens.push(stylus.subject ? stylus.subject(subject) : this.hi(subject));
        }
        var line = tokens.join(' ');
        if (state) {
            line.length > 0 && (line += ': ');
            line += stylus.state ? stylus.state(state) : state;
        }
        this.writeOut(line + "\n");
        return this;
    },

    _logActionCode: function (verb, subject, state) {
        var line = verb;
        subject && (line += '[' + subject + ']');
        if (state) {
            line.length > 0 && (line += ' ');
            line += state;
        }
        this.writeOut(line + "\n");
        return this;
    },

    _logActionJson: function (verb, subject, state) {
        this.writeOut(JSON.stringify({ action: verb, subject: subject, state: state }) + "\n");
        return this;
    },

    _logListHuman: function (list, sep) {
        sep || (sep = ' ');
        this.writeOut(list.join(sep) + "\n");
    },

    _logListCode: function (list, sep) {
        sep || (sep = ' ');
        this.writeOut(list.join(sep) + "\n");
    },

    _logListJson: function (list) {
        this.writeOut(JSON.stringify(list) + "\n");
    },

    _logOut: function () {
        this.writeOut(util.format.apply(util, arguments) + "\n");
        return this;
    },

    _logErr: function () {
        this.writeErr(util.format.apply(util, arguments) + "\n");
        return this;
    },

    _logOutCode: function () {
        this.writeOut('# ' + util.format.apply(util, arguments) + "\n");
        return this;
    },

    _logErrCode: function () {
        this.writeErr('# ' + util.format.apply(util, arguments) + "\n");
        return this;
    },

    _logObjectHuman: function (object, opts, level) {
        var indent = opts && opts.indent || 4;
        level || (level = 0);
        var paddings = Cli.pad('', indent * level);

        var array = Array.isArray(object);
        if (array || (object != null && typeof(object) == 'object')) {
            for (var k in object) {
                var val = object[k];
                var key = array ? this.hi('-') : (this.hi(opts && opts.keyWidth ? Cli.pad(k, opts.keyWidth) : k) + ':');
                if (val == null || typeof(val) != 'object') {
                    this.writeOut(paddings + key + ' ' +
                             (opts && opts.renders && opts.renders[k] ? opts.renders[k](val) : this.renderValue(val)) + "\n");
                } else {
                    this.writeOut(paddings + key + "\n");
                    this.logObject(val, opts, level + 1);
                }
            }
        } else {
            this.writeOut(paddings + this.renderValue + "\n");
        }
        return this;
    },

    _logObjectCode: function (object, opts) {
        this.writeOut(yaml.dump(object, { indent: opts && opts.indent || 4, flowLevel: 0 }) + "\n");
        return this;
    },

    _logObjectJson: function (object) {
        this.writeOut(JSON.stringify(object) + "\n");
        return this;
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
