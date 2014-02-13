var assert  = require('assert'),
    Class   = require('js-class'),
    Try     = require('../lib/Try'),

    StateMachine = require('..').StateMachine;

describe('StateMachine', function () {
    var LogState = Class({
        constructor: function (seqs, name) {
            this.seqs = seqs;
            this.name = name;
        },

        enter: function () {
            this._log('enter', [].slice.call(arguments, 1));
        },

        leave: function () {
            this._log('leave', arguments);
        },

        process: function () {
            this._log('process', [].slice.call(arguments, 1));
        },

        _log: function (method, args) {
            this.seqs.push(this.name + '.' + method + '(' + [].join.call(args, ',') + ')');
        }
    });

    it('synchronous transition', function () {
        var seqs = [];
        var State1 = Class(LogState, {
            constructor: function () {
                LogState.prototype.constructor.call(this, seqs, 'S1');
            },

            enter: function (transit, count) {
                LogState.prototype.enter.apply(this, arguments);
                this.count = count;
            },

            process: function (transit, ratio) {
                LogState.prototype.process.apply(this, arguments);
                var args = ['start'];
                for (var i = 0; i < this.count; i ++) {
                    args.push((i + 1) * ratio);
                }
                transit.apply(null, args);
            }
        });

        var State2 = Class(LogState, {
            constructor: function () {
                LogState.prototype.constructor.call(this, seqs, 'S2');
            },

            enter: function (transit) {
                LogState.prototype.enter.apply(this, arguments);
                this.items = [].slice.call(arguments, 1);
                this.index = 0;
                this.sum = 0;
            },

            process: function (transit, value) {
                LogState.prototype.process.apply(this, arguments);
                this.sum += this.items[this.index] * value;
                this.index ++;
                if (this.index >= this.items.length) {
                    transit('done-' + this.sum, this.sum);
                }
            }
        });

        var State3 = Class(LogState, {
            constructor: function () {
                LogState.prototype.constructor.call(this, seqs, 'S3');
            },

            enter: function (transit, sum) {
                LogState.prototype.enter.apply(this, arguments);
                transit('complete', sum * 2);
            }
        });

        var State4 = Class(LogState, {
            constructor: function () {
                LogState.prototype.constructor.call(this, seqs, 'S4');
            },

            enter: function (transit, sum, final) {
                LogState.prototype.enter.apply(this, arguments);
                if (!final) {
                    transit('final', sum * 2, true);
                }
            }
        });

        var sm = new StateMachine()
                .state('s1', new State1())
                    .when('start').to('s2')
                .state('s2', new State2())
                    .when(/done/).to('s3')
                .state('s3', new State3())
                    .when(function (transition) { return transition == 'complete'; }).to('s4')
                .state('s4', new State4())
                    .when(['f', 'final']).to('s4')
            .start(5);
        sm.process(2);
        assert.deepEqual(seqs, [
            'S1.enter(5)',
            'S1.process(2)',
            'S1.leave(s2)',
            'S2.enter(2,4,6,8,10)'
        ]);
        assert.equal(sm.currentName, 's2');
        assert.equal(sm.current.name, 'S2');
        seqs.splice(0, 4);
        for (var i = 0; i < 5; i ++) {
            sm.process(10 + i);
        }
        assert.deepEqual(seqs, [
            'S2.process(10)',
            'S2.process(11)',
            'S2.process(12)',
            'S2.process(13)',
            'S2.process(14)',
            'S2.leave(s3)',
            'S3.enter(' + (20 + 44 + 12 * 6 + 13 * 8 + 140) + ')',
            'S3.leave(s4)',
            'S4.enter(' + ((20 + 44 + 12 * 6 + 13 * 8 + 140) * 2) + ')',
            //'S4.leave(s4)',
            //'S4.enter(' + ((20 + 44 + 12 * 6 + 13 * 8 + 140) * 4) + ',true)'
        ]);
        assert.equal(sm.currentName, 's4');
        assert.equal(sm.current.name, 'S4');
    });

    it('loop transition', function () {
        this.timeout(60000);
        var state = {
            enter: function (transit, count) {
                if (!count) {
                    count = 1;
                } else {
                    count ++;
                }
                if (count < 100000) {
                    transit('any', count);
                } else {
                    transit('done', count);
                }
            }
        };
        var sm = new StateMachine()
                .state('s0', Object.create(state))
                    .when('done').to('final')
                    .fallback('s1')
                .state('s1', Object.create(state))
                    .when('done').to('final')
                    .fallback('s0')
                .state('final', {
                    enter: function (transit, count) {
                        this.count = count;
                    }
                })
            .start();
        assert.equal(sm.currentName, 'final');
        assert.equal(sm.getState('final').count, 100000);
    });

    it('asynchronous transition', function (done) {
        var s1 = {
            enter: function (transit, initialVal) {
                setTimeout(function () {
                    transit('loaded', initialVal * 10);
                }, 10);
            }
        };

        var s2 = {
            enter: function (transit, value) {
                this.value = value;
            },

            process: function (transit, value) {
                setTimeout(function () {
                    transit('done', this.value + value);
                }.bind(this), 10);
            }
        };

        var s3 = {
            enter: function (transit, result) {
                this.result = result;
            }
        };

        new StateMachine()
            .state('s1', s1)
                .when('loaded').to('s2')
            .state('s2', s2)
                .when('done').to('s3')
            .state('s3', s3)
        .on('transit', function (from, to, sm) {
            if (to == 's2') {
                sm.process(700);
            } else if (to == 's3') {
                Try.final(function () {
                    assert.equal(s3.result, 1700);
                }, done);
            }
        })
        .start(100);
    });

    it('transit to the same state', function () {
        var enters = 0;
        var sm = new StateMachine()
            .state('s', {
                enter: function (transit) {
                    enters ++;
                }
            })
                .when('key').to('s');
        sm.start();
        sm.transit('key');
        assert.equal(enters, 1);
    });

    it('invalid transition rules', function () {
        assert.throws(function () {
            new StateMachine()
                .state('s1', {})
                    .when('abc')
                    .when('def');
        }, /last rule incomplete/i);
        assert.throws(function () {
            new StateMachine()
                .state('s1', {}).to('something');
        }, /not defining a rule/i);

    });
});