var fs    = require('fs'),
    _     = require('underscore'),
    yaml  = require('js-yaml'),
    opt   = require('optimist'),
    Class = require('./Class');

var argvOpts;

var Config = Class({
    constructor: function () {
        this.opts = {};
    },

    parse: function (argv) {
        if (!argv) {
            argv = process.argv;
        }
        argv = opt.string('c').alias('c', 'config').parse(argv);
        if (argv.c) {
            (Array.isArray(argv.c) ? argv.c : [argv.c]).forEach(function (filename) {
                try {
                    this.load(filename);
                } catch (e) {
                    console.error("Fail to load %s: %s", filename, e.message);
                }                
            }, this);
            delete argv.c;
            delete argv.config;
        }
        Object.keys(argv).forEach(function (name) {
            if (name != '_' && name != '$0') {
                var val = argv[name];
                if (typeof(val) == 'string' && val.substr(0, 5) == 'json:') {
                    try {
                        val = JSON.parse(val.substr(5));
                    } catch (e) {
                        console.error("Ignore invalid value %s = %s : %s", name, val, e.message);
                    }
                }
                this.opts[name] = val;
            }
        }, this);
        return this;
    },
    
    load: function (filename) {
        var opts = yaml.load(fs.readFileSync(filename).toString());
        _.extend(this.opts, opts);
        return opts;
    }
}, {
    statics: {
        conf: function (argv) {
            if (!argvOpts) {
                argvOpts = new Config().parse(argv);
            }
            return argvOpts;
        }
    }
});

module.exports = Config;