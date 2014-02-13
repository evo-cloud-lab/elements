/** @fileoverview
 * Provide Plugins
 */

var Class = require('js-class'),
    fs    = require('fs'),
    path  = require('path');

/** @class ModulePlugin
 * Plugin loaded from a Node.js module
 */
var ModulePlugin = Class({
    constructor: function (base, info) {
        this._baseDir = base;
        this._info = info;
    },

    create: function () {
        var factory, moduleFile, object;

        if (typeof(this._info) == 'string') {
            if (this._info.indexOf('/') >= 0) {
                moduleFile = path.resolve(this._baseDir, this._info);
            } else {
                moduleFile = this._baseDir;
                object = this._info;
            }
        } else {
            moduleFile = typeof(this._info.module) == 'string' ? path.resolve(this._baseDir, this._info.module) : this._baseDir;
            object = this._info.object;
        }

        try {
            factory = require(moduleFile);
        } catch (e) {
            // ignored
        }

        if (factory && typeof(object) == 'string') {
            factory = factory[object];
        }

        this.create = typeof(factory) == 'function' ? factory : function () { return null; };
        return this.create.apply(this, arguments);
    }
}, {
    statics: {
        factory: function (base, info) {
            var plugin = new ModulePlugin(base, info);
            return function () {
                return this.create.apply(this, arguments);
            }.bind(plugin);
        }
    }
});

/** @class Plugins
 * This is a root scope for all plugins and provides
 * functionalities for connecting extensions with consumers.
 */
var Plugins = Class({
    constructor: function () {
        this._extensions = {};
    },

    /** @function
     * @description Register an extension.
     *
     * @param {String} extensionPoint   Name of extension point
     * @param {String} name             Name of extension
     * @param {Function} factory        Factory to instantiate the extension.
     */
    register: function (extensionPoint, name, factory) {
        if (typeof(factory) != 'function') {
            throw new Error('Plugin factory is not a function');
        }
        var exts = this._extensions[extensionPoint];
        if (!exts) {
            exts = this._extensions[extensionPoint] = [];
            exts.names = {};
        }
        exts.names[name] || exts.push(name);
        exts.names[name] = factory;
        return this;
    },

    /** @function
     * @description Create extensions on specified extensionPoint
     *
     * @param {object} host the consumer of extensionPoint
     * @param {String} extenionPoint name of extension point
     * @param {object} options defined as
     *                   - data passed to extension factory
     *                   - multi when true, connect all available extensions
     *                           when false, the first extension is connected
     *                   - name when is a string, explicitly specify the named plugin
     *                          when is an array, alternatives are considered
     *
     * @returns when multi is true, an array of extensions is returned,
     *          otherwise, only a single extension or null is returned.
     */
    connect: function (host, extensionPoint, options) {
        options || (options = {});
        var exts = this._extensions[extensionPoint];
        var instances = [], data = options.data;

        var instantiate = function (names) {
            for (var i in names) {
                var name = names[i];
                var factory = exts.names[name];
                var instance = factory && factory(data, host, extensionPoint, name);
                instance && instances.push(instance);
                if (instance && !options.multi) {
                    break;
                }
            }
        };

        if (exts) {
            if (options.name) {
                var names = options.name;
                Array.isArray(names) || (names = [names]);
                instantiate(names);
            } else {
                instantiate(exts);
            }
        }
        return options.multi ? instances : instances[0];
    },

    scanSubdirs: function (dirs) {
        Array.isArray(dirs) || (dirs = [dirs]);
        for (var n in dirs) {
            var dir = dirs[n], subdirs;
            try {
                subdirs = fs.readdirSync(dir);
            } catch (e) {
                // ignore invalid dirs
                continue;
            }

            for (var i in subdirs) {
                this.loadPackage(path.join(dir, subdirs[i]));
            }
        }
        return this;
    },

    scan: function () {
        // scan directories are in reverse order of
        // module loading
        var dirs = [], mainDir;
        process.config && process.config.variables &&
            dirs.push(path.join(process.config.variables.node_prefix, 'lib/node_modules'));
        if (process.env.HOME) {
            dirs.push(path.join(process.env.HOME, '.node_libraries'));
            dirs.push(path.join(process.env.HOME, '.node_modules'));
        }
        if (require.main && Array.isArray(require.main.paths)) {
            dirs = dirs.concat(require.main.paths.slice().reverse());
            require.main.paths[0] && (mainDir = path.dirname(require.main.paths[0]));
        }
        this.scanSubdirs(dirs);
        mainDir && this.loadPackage(mainDir);
        return this;
    },

    loadPackage: function (dir) {
        var metadata;
        try {
            metadata = fs.readFileSync(path.join(dir, 'package.json'));
            metadata = JSON.parse(metadata);
        } catch (e) {
            // ignore invalid modules
        }
        var exts = metadata && metadata.extensions;
        if (typeof(exts) == 'object') {
            for (var extPoint in exts) {
                var ext = exts[extPoint];
                if (typeof(ext) != 'object') {
                    continue;
                }
                for (var name in ext) {
                    var extInfo = ext[name];
                    this.register(extPoint, name, ModulePlugin.factory(dir, extInfo));
                }
            }
        }
    }
}, {
    statics: {
        /** @property {Plugins} instance The global instance */
        get instance() {
            var inst = global['evo-elements:Plugins'];
            inst || (inst = global['evo-elements:Plugins'] = new Plugins());
            return inst;
        }
    }
});

module.exports = Plugins;
