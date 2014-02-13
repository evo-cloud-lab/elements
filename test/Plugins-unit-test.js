var assert = require('assert'),
    sandbox = require('sandboxed-module'),

    Plugins = require('..').Plugins;

describe('Plugins', function () {
    it('global instance', function () {
        assert.strictEqual(Plugins.instance, Plugins.instance);
    });

    it('#register', function () {
        var plugins = new Plugins();
        var testPlugin = function () {
            return 'plugin';
        };
        assert.strictEqual(plugins.register('test.extension', 'test', testPlugin), plugins);
        assert.equal(plugins.connect({}, 'test.extension'), 'plugin');
    });

    it('#register override', function () {
        var plugins = new Plugins();
        var testPlugin1 = function () {
            return 'plugin';
        };
        var testPlugin2 = function () {
            return 'plugin2';
        };

        assert.strictEqual(plugins.register('test.extension', 'test', testPlugin1), plugins);
        assert.strictEqual(plugins.register('test.extension', 'test', testPlugin2), plugins);
        assert.equal(plugins.connect({}, 'test.extension'), 'plugin2');
    });

    it('#connect options data', function () {
        var plugins = new Plugins();
        var testPlugin = function (data) {
            return data;
        };
        plugins.register('test.extension', 'test', testPlugin);
        assert.equal(plugins.connect({}, 'test.extension', { data: 'data' }), 'data');
    });

    it('#connect options name', function () {
        var plugins = new Plugins();
        var testPlugin = function (data) {
            return 'plugin';
        };
        plugins.register('test.extension', 'test', testPlugin);
        assert.equal(plugins.connect({}, 'test.extension', { name: 'nonexist' }), null);
        assert.equal(plugins.connect({}, 'test.extension', { name: 'test' }), 'plugin');
    });

    it('#connect options multi', function () {
        var plugins = new Plugins();
        var testPlugin1 = function (data) {
            return 'plugin1';
        };
        var testPlugin2 = function (data) {
            return 'plugin2';
        };

        plugins.register('test.extension', 'test1', testPlugin1);
        plugins.register('test.extension', 'test2', testPlugin2);

        assert.deepEqual(plugins.connect({}, 'test.extension', { multi: true }), ['plugin1', 'plugin2']);
    });

    it('#connect alternative', function () {
        var plugins = new Plugins();
        var testPlugin1 = function (data) {
            return 'plugin1';
        };
        var testPlugin2 = function (data) {
            return 'plugin2';
        };

        plugins.register('test.extension', 'test1', testPlugin1);
        plugins.register('test.extension', 'test2', testPlugin2);

        assert.equal(plugins.connect({}, 'test.extension', { name: ['nonexist', 'test2'] }), 'plugin2');
        assert.equal(plugins.connect({}, 'test.extension', { name: ['test1', 'test2'] }), 'plugin1');
        assert.deepEqual(plugins.connect({}, 'test.extension', { name: ['test1', 'test2'], multi: true }), ['plugin1', 'plugin2']);
    });

    it('#scanSubdirs', function () {
        var SandboxedPlugins = sandbox.require('../lib/Plugins', {
            requires: {
                'fs': {
                    readdirSync: function () {
                        return ['a', 'b'];
                    }
                }
            }
        });
        var plugins = new SandboxedPlugins();
        var scanned = [];
        plugins.loadPackage = function (dir) { scanned.push(dir); };

        plugins.scanSubdirs('single');
        plugins.scanSubdirs(['d1', 'd2']);

        assert.deepEqual(scanned, ['single/a', 'single/b', 'd1/a', 'd1/b', 'd2/a', 'd2/b']);
    });

    it('#scan');

    function stubMetadata(metadata) {
        var SandboxedPlugins = sandbox.require('../lib/Plugins', {
            requires: {
                'fs': {
                    readFileSync: function () { return metadata; }
                }
            }
        });
        return new SandboxedPlugins();
    }

    it('#loadPackage', function () {
        var plugins = stubMetadata(JSON.stringify({ extensions: { 'test.a': { 'a': './a', 'b': './b' } } }));
        var regs = [];
        plugins.register = function (extensionPoint, name, factory) {
            regs.push(extensionPoint + '#' + name);
            assert.equal(typeof(factory), 'function');
        };
        plugins.loadPackage('dir');
        assert.deepEqual(regs, ['test.a#a', 'test.a#b']);
    });

    it('#loadPackage no extensions', function () {
        var plugins = stubMetadata(JSON.stringify({ }));
        var regs = [];
        plugins.register = function (extensionPoint, name, factory) {
            regs.push(extensionPoint + '#' + name);
            assert.equal(typeof(factory), 'function');
        };
        plugins.loadPackage('dir');
        assert.deepEqual(regs, []);
    });

    it('#loadPackage invalid extension point', function () {
        var plugins = stubMetadata(JSON.stringify({ extensions: { 'test.a': 'a' } }));
        var regs = [];
        plugins.register = function (extensionPoint, name, factory) {
            regs.push(extensionPoint + '#' + name);
            assert.equal(typeof(factory), 'function');
        };
        plugins.loadPackage('dir');
        assert.deepEqual(regs, []);
    });

    it('#loadPackage invalid metadata', function () {
        var plugins = stubMetadata('invalid');
        var regs = [];
        plugins.register = function (extensionPoint, name, factory) {
            regs.push(extensionPoint + '#' + name);
            assert.equal(typeof(factory), 'function');
        };
        plugins.loadPackage('dir');
        assert.deepEqual(regs, []);
    });
});
