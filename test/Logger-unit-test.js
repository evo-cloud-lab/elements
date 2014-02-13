var assert  = require('assert'),
    sandbox = require('sandboxed-module'),

    Logger = require('..').Logger,
    Config = require('../lib/Config');

describe('Logger', function () {
    function createLogger(cfg, name, prefix) {
        var SandboxedLogger = sandbox.require('../lib/Logger', {
            requires: {
                './Config': {
                    conf: function () {
                        return cfg;
                    }
                }
            }
        });
        return new SandboxedLogger(name, prefix);
    }

    var Levels = ['emerg', 'alert', 'crit', 'error', 'warning', 'notice', 'info', 'debug'];

    function verifyLogLevel(logger, level) {
        var index = Levels.indexOf(level);
        for (var i = 0; i <= index; i ++) {
            assert.equal(typeof(logger[Levels[i]]), 'function');
            assert.ok(logger[Levels[i]].enabled);
        }
        for (var i = index + 1; i < Levels.length; i ++) {
            assert.equal(typeof(logger[Levels[i]]), 'function');
            assert.equal(logger[Levels[i]].enabled, false);
        }
    }

    it('default level', function () {
        var cfg = new Config().parse([]);
        verifyLogLevel(createLogger(cfg, 'name'), Logger.DEFAULT_LEVEL);
    });

    it('default level from config', function () {
        var cfg = new Config().parse(['-D', 'logger.level=error']);
        verifyLogLevel(createLogger(cfg, 'name'), 'error');
    });

    it('level from named config', function () {
        var cfg = new Config().parse(['-D', 'logger.level=error', '-D', 'logger.components.name.level=debug']);
        verifyLogLevel(createLogger(cfg, 'name'), 'debug');
    });

    it('fallback to default level with invalid level name', function () {
        var cfg = new Config().parse(['-D', 'logger.level=invalid']);
        verifyLogLevel(createLogger(cfg, 'name'), Logger.DEFAULT_LEVEL);
    });
});