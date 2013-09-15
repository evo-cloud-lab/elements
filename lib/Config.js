var fs    = require('fs'),
    path  = require('path'),
    Class = require('js-class'),
    _     = require('underscore'),
    yaml  = require('js-yaml');

function loadConfFile(filename) {
    var content = fs.readFileSync(filename).toString();
    var ext = path.extname(filename).toLowerCase();
    if (ext == '.yml' || ext == '.yaml') {
        return yaml.load(content);
    } else if (ext == '.json') {
        return JSON.parse(content);
    } else {
        try {
            return yaml.load(content);
        } catch (e) {
            // ignored
        }
        try {
            return JSON.parse(content);
        } catch (e) {
            // ignored
        }
        var err = new Error('Unknown config file format');
        err.filename = filename;
        throw err;
    }
}

function mergeObject(des, src) {
    for (var key in src) {
        if (Array.isArray(des[key]) && Array.isArray(src[key])) {
            des[key] = des[key].concat(src[key]);
        }  else if (typeof(des[key]) == 'object' && typeof(src[key]) == 'object') {
            mergeObject(des[key], src[key]);
        } else {
            des[key] = src[key];
        }
    }
}

function splitAssignment(assignment, noflag) {
    var pos = assignment.indexOf('='), key, val, merge;
    if (pos > 0) {
        if (assignment[pos - 1] == '+') {
            key = assignment.substr(0, pos - 1);
            merge = true;
        } else {
            key = assignment.substr(0, pos);
        }
        val = assignment.substr(pos + 1);
        if (val.length == 0) {
            val = undefined;
        }
    } else if (noflag && assignment.substr(0, 3) == 'no-') {
        key = assignment.substr(3);
        val = false;
    } else {
        key = assignment;
        val = true;
    }
    if (typeof(val) == 'string') {
        val = val.trim();
        if (val === 'true') {
            val = true;
        } else if (val === 'false') {
            val = false;
        } else if ('{["'.indexOf(val[0]) >= 0) {
            try {
                val = JSON.parse(val);
            } catch (e) {
                // ignored
            }
        } else if (val[0] == '@') {
            try {
                val = loadConfFile(val.substr(1));
            } catch (e) {
                console.error(e);
                key = '';   // make this invalid
            }
        } else if (!isNaN(val)) {
            if (val.indexOf('.') >= 0) {
                val = parseFloat(val);
            } else {
                val = parseInt(val);
            }
        }
    }
    return { key: key, val: val, merge: merge };
}

function applyAssignment(cfg, v) {
    if (v.key.length > 0) {
        var opts = cfg.opts, names = v.key.split('.'), last;
        for (var i = 0; i < names.length; i ++) {
            if (names[i].length == 0) {
                continue;
            }
            if (typeof(opts[names[i]]) != 'object') {
                if (v.val == undefined) {
                    if (i == names.length - 1) {
                        delete opts[names[i]];
                    }
                    return;
                }
                opts[names[i]] = {};
            }
            last = { opts: opts, name: names[i] };
            opts = opts[names[i]];
        }
        if (v.val == undefined) {
            delete last.opts[last.name];
        } else if (typeof(v.val) == 'object' && v.merge) {
            mergeObject(opts, v.val);
        } else {
            last.opts[last.name] = v.val;
        }
    }
}

function parseArgs(cfg, arg) {
    cfg.args.push(arg);
    return this;
}

function parseConfFile(merge) {
    return function (cfg, arg) {
        var opts;
        try {
            opts = loadConfFile(arg);
        } catch (e) {
            console.error(e.message);
            return parseNormal;
        }
        merge ? mergeObject(cfg.opts, opts) : _.extend(cfg.opts, opts);
        return parseNormal;
    };
}

function parseDefinition(cfg, arg) {
    var v = splitAssignment(arg, false);
    applyAssignment(cfg, v);
    return parseNormal;
}

function parseNormal(cfg, arg) {
    if (arg == '--') {
        return parseArgs;
    } else if (arg == '-c') {
        return parseConfFile(true);
    } else if (arg == '-C') {
        return parseConfFile(false);
    } else if (arg == '-D') {
        return parseDefinition;
    } else if (arg.substr(0, 2) == '--') {
        var v = splitAssignment(arg.substr(2), true);
        v.key = v.key.replace(/-+/g, '.');
        applyAssignment(cfg, v);
    } else {
        cfg.args.push(arg);
    }
    return this;
}

var Config = Class(process.EventEmitter, {
    constructor: function () {
        this.opts = {};
        this.args = [];
    },

    parse: function (argv) {
        if (!argv) {
            argv = process.argv.slice(2);
        }

        this._argv = argv;  // save for reload

        var state = parseNormal;
        argv.forEach(function (arg) {
            state = state.call(state, this, arg);
        }, this);

        this.emit('reload', this);

        return this;
    },

    reload: function (clear) {
        if (this._argv) {
            if (clear) {
                this.opts = {};
            }
            this.args = [];
            this.parse(this._argv);
        }
        return this;
    },

    query: function (path, defVal) {
        var opts = this.opts;
        (Array.isArray(path) ? path : path.split('.')).every(function (key) {
            opts = opts[key];
            return !!opts;
        });
        return opts == undefined ? defVal : opts;
    }
}, {
    statics: {
        conf: function (argv, opts) {
            if (!Config._instance) {
                if (argv && !Array.isArray(argv)) {
                    opts = argv;
                    argv = undefined;
                }
                Config._instance = new Config().parse(argv);
                if (opts && opts.reloadSignal) {
                    process.on(typeof(opts.reloadSignal) == 'string' ? opts.reloadSignal : 'SIGHUP', function () {
                        Config._instance && Config._instance.reload();
                    });
                }
            }
            return Config._instance;
        }
    }
});

module.exports = Config;