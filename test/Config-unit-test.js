var assert  = require('assert'),
    sandbox = require('sandboxed-module'),
    
    Config = require('../lib/Config');

describe('Config', function () {
    var cfg;
    
    beforeEach(function () {
        cfg = new Config();
    });
    
    it('#parse int', function () {
        cfg.parse(['--value=7']);
        assert.strictEqual(cfg.opts.value, 7);
    });
    
    it('#parse float', function () {
        cfg.parse(['--value=1.6']);
        assert.strictEqual(cfg.opts.value, 1.6);
    });
    
    it('#parse json', function () {
        cfg.parse(['--strVal=hello', '--quotedVal="string"', '--objVal={ "key": 1 }', '--arrVal=[9, "a", 10]']);
        assert.strictEqual(cfg.opts.strVal, 'hello');
        assert.strictEqual(cfg.opts.quotedVal, 'string');
        assert.deepEqual(cfg.opts.objVal, { key: 1 });
        assert.deepEqual(cfg.opts.arrVal, [9, 'a', 10]);
    });
    
    it('#parse boolean', function () {
        cfg.parse(['--confirmed', '--boolTrue=true', '--boolFalse=false']);
        assert.strictEqual(cfg.opts.confirmed, true);
        assert.strictEqual(cfg.opts.boolTrue, true);
        assert.strictEqual(cfg.opts.boolFalse, false);
        cfg.parse(['--no-confirmed']);
        assert.strictEqual(cfg.opts.confirmed, false);
    });
    
    it('#parse merge', function () {
        cfg.parse(['--objVal={ "key": 1 }']);
        assert.deepEqual(cfg.opts.objVal, { key: 1 });
        cfg.parse(['--objVal+={ "key1": 2 }']);
        assert.deepEqual(cfg.opts.objVal, { key: 1, key1: 2 });
    });
    
    it('#parse definitions', function () {
        cfg.parse(['-D', 'a.b.c=ok']);
        assert.deepEqual(cfg.opts, { a: { b: { c: 'ok' } } });
        cfg.parse(['--a-b-c=good']);
        assert.deepEqual(cfg.opts, { a: { b: { c: 'good' } } });        
        cfg.parse(['-D', 'a.b.c=']);
        assert.deepEqual(cfg.opts, { a: { b: { } } });
    });
    
    it('#parse definitions merge', function () {
        cfg.parse(['-D', 'a.b.c=ok']);
        assert.deepEqual(cfg.opts, { a: { b: { c: 'ok' } } });
        cfg.parse(['-D', 'a.b+={ "d": 1 }']);
        assert.deepEqual(cfg.opts, { a: { b: { c: 'ok', d: 1 } } });
        cfg.parse(['-D', 'a.b={ "d": 1 }']);
        assert.deepEqual(cfg.opts, { a: { b: { d: 1 } } });        
    });
    
    it('#parse args', function () {
        cfg.parse(['--value=1', 'abc', 'def', '--', '--value=2', 'ok']);
        assert.strictEqual(cfg.opts.value, 1);
        assert.deepEqual(cfg.args, ['abc', 'def', '--value=2', 'ok']);
    });
    
    describe('Config File', function () {
        var files = {
            'conf.json': '{ "ns": { "key": 1 } }',
            'conf.yml': "---\nns:\n  key1: 2",
            'conf.yaml': "---\nns:\n  key2: 3"
        };
        var SandboxedConfig = sandbox.require("../lib/Config", {
            requires: {
                "fs": {
                    readFileSync: function (fn) {
                        return files[fn];
                    }
                }
            }
        });

        beforeEach(function () {
            cfg = new SandboxedConfig();
        });
        
        it('#parse config file', function () {
            cfg.parse(['-c', 'conf.json']);
            assert.deepEqual(cfg.opts.ns, { key: 1 });
            cfg.parse(['-c', 'conf.yml']);
            assert.deepEqual(cfg.opts.ns, { key: 1, key1: 2 });
            cfg.parse(['-c', 'conf.yaml']);
            assert.deepEqual(cfg.opts.ns, { key: 1, key1: 2, key2: 3 });
        });
        
        it('#parse config files no merge', function () {
            cfg.parse(['-c', 'conf.json', '-C', 'conf.yml']);
            assert.deepEqual(cfg.opts.ns, { key1: 2 });
        });
        
        it('#parse value from config file', function () {
            cfg.parse(['--data=@conf.json']);
            assert.deepEqual(cfg.opts, { data: { ns: { key: 1 } } });
        });
        
        it('#reload', function () {
            var triggers = 0;
            cfg.on('reload', function () { triggers ++; });
            cfg.parse(['-c', 'conf.json', '--key=val']);
            assert.deepEqual(cfg.opts, { key: 'val', ns: { key: 1 } });
            cfg.opts = { dummy: 1 };
            cfg.reload(true);
            assert.deepEqual(cfg.opts, { key: 'val', ns: { key: 1 } });
            cfg.opts = { dummy: 1 };
            cfg.reload();
            assert.deepEqual(cfg.opts, { key: 'val', ns: { key: 1 }, dummy: 1 });
            assert.equal(triggers, 3);  // 1 from #parse, 2 from #reload
        });
    });
    
    it('#query', function () {
        cfg.parse(['-D', 'a.b.c=1', '-D', 'd.e=false', '-D', 'e.f=0']);
        assert.deepEqual(cfg.query('a'), { b: { c: 1 } });
        assert.deepEqual(cfg.query('a.b'), { c: 1 });
        assert.deepEqual(cfg.query('a.b', true), { c: 1 });        
        assert.strictEqual(cfg.query('a.b.c'), 1);
        assert.strictEqual(cfg.query(['a', 'b', 'c']), 1);
        assert.strictEqual(cfg.query('a.b.c.d'), undefined);
        assert.strictEqual(cfg.query('a.b.c.d', 'hello'), 'hello');
        assert.strictEqual(cfg.query('d.e'), false);
        assert.strictEqual(cfg.query('d.e', true), false);
        assert.strictEqual(cfg.query('e.f'), 0);
        assert.strictEqual(cfg.query('e.f', 123), 0);
        assert.strictEqual(cfg.query('x.y.z', 'hello'), 'hello');
    });
});