var assert = require('assert'),
    
    Try = require('../lib/Try'),
    DelayedJob = require('../lib/DelayedJob');

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
    
    it('#cancel', function (done) {
        var job = new DelayedJob(function () {
            done(new Error('should not be called'));
        }).schedule(50);
        setTimeout(function () {
            job.cancel();
        }, 10);
        setTimeout(done, 60);
    });
});