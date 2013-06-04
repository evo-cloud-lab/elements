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

function parseArgs(cfg, arg) {
    cfg.args.push(arg);
    return this;
}

function parseConfFile(cfg, arg) {
    var opts;
    try {
        opts = loadConfFile(arg);
    } catch (e) {
        console.error(e.message);
        return parseNormal;
    }
    _.extend(cfg.opts, opts);
    return parseNormal;
}

function mergeOpts(opts, key, val) {
    if (typeof(opts[key]) != 'object') {
        opts[key] = val;
    } else {
        opts = opts[key];
        for (var k in val) {
            if (typeof(val[k]) == 'object') {
                mergeOpts(opts, k, val[k]);
            } else {
                opts[k] = val[k];
            }
        }
    }
}

function parseNormal(cfg, arg) {
    if (arg == '--') {
        return parseArgs;
    } else if (arg == '-c') {
        return parseConfFile;
    } else if (arg.substr(0, 2) == '--') {
        var pos = arg.indexOf('='), key, val, merge;
        if (pos > 2) {
            if (arg[pos - 1] == '+') {
                key = arg.substr(2, pos - 3);
                merge = true;
            } else {
                key = arg.substr(2, pos - 2);
            }
            val = arg.substr(pos + 1);
        } else if (arg.substr(0, 5) == '--no-') {
            key = arg.substr(5);
            val = false;
        } else {
            key = arg.substr(2);
            val = true;
        }
        if (typeof(val) == 'string') {
            val = val.trim();
            if (val === 'true') {
                val = true;
            } else if (val === 'false') {
                val = false;
            } else if ("'{[\"".indexOf(val[0]) >= 0) {
                try {
                    val = JSON.parse(val);
                } catch (e) {
                    // ignored
                }
            } else if (!isNaN(val)) {
                if (val.indexOf('.') >= 0) {
                    val = parseFloat(val);
                } else {
                    val = parseInt(val);
                }
            }
        }
        if (!merge || cfg.opts[key] == undefined) {
            cfg.opts[key] = val;
        } else if (merge) {
            if (typeof(val) == 'object') {
                mergeOpts(cfg.opts, key, val);
            } else if (Array.isArray(val)) {
                if (Array.isArray(cfg.opts[key])) {
                    cfg.opts[key] = cfg.opts[key].concat(val);
                } else {
                    cfg.opts[key] = val;
                }
            } else {
                cfg.opts[key] += val;            
            }
        }
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
            argv = process.argv;
        }
        
        this._argv = argv;
        
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
        return opts || defVal;
    },
    
    load: function (filename) {
        var opts = loadConfFile(filename);
        _.extend(this.opts, opts);
        this.emit('reload', this);
        return this;
    }
}, {
    statics: {
        conf: function (argv) {
            if (!Config._instance) {
                Config._instance = new Config().parse(argv);
            }
            return Config._instance;
        }
    }
});

module.exports = Config;