var assert = require('assert'),

    Try = require('js-flow').Try,
    DelayedJob = require('..').DelayedJob;

describe('DelayedJob', function () {
    it('collects all changes', function (done) {
        var changes = [];
        var job = new DelayedJob(function () {
            Try.final(function () {
                assert.deepEqual(changes, ['a', 'b']);
            }, done);
        }, 50);
        changes.push('a');
        job.schedule();
        setTimeout(function () {
            changes.push('b');
        }, 10);
    });

    it('only scheduled once', function (done) {
        var count = 0;
        var job = new DelayedJob(function () {
            count ++;
        }, 10);
        for (var i = 0; i < 5; i ++) {
            setTimeout(function () {
                job.schedule();
            }, 1);
        }
        setTimeout(function () {
            Try.final(function () {
                assert.equal(count, 1);
            }, done);
        }, 15);
    });

    it('default delay time', function () {
        assert.equal(new DelayedJob(function () { }).defaultDelay, 0);
    });

    it('#reschedule', function (done) {
        this.timeout(200);
        var job = new DelayedJob(function () {
            done();
        });
        job.schedule(1000);
        job.reschedule(1);
    });

    it('#cancel', function (done) {
        var job = new DelayedJob(function () {
            done(new Error('should not be called'));
        }).schedule(50);
        setTimeout(function () {
            job.cancel();
        }, 10);
        setTimeout(done, 60);
    });

    describe('async job', function () {
        it('pending schedule and not overrun', function (done) {
            var refs = 0, count = 0;
            var job = new DelayedJob(function (next) {
                if (count >= 5) {
                    done();
                } else {
                    Try.tries(function () {
                        assert.equal(refs, 0);
                    }, done);
                    refs ++;
                    setTimeout(function () {
                        refs --;
                        Try.tries(function () {
                            assert.equal(refs, 0);
                        }, done);
                        count ++;
                        next();
                    }, 10);
                    Try.tries(function () {
                        assert.strictEqual(this.running, true);
                    }.bind(this), done);
                    setTimeout(function () {
                        this.reschedule(0);
                    }.bind(this), 0);
                }
            });
            Try.tries(function () {
                assert.strictEqual(job.async, true);
                assert.strictEqual(job.scheduled, false);
            }, done);
            job.schedule(0);
            Try.tries(function () {
                assert.strictEqual(job.scheduled, true);
            }, done);
        });
    });
});