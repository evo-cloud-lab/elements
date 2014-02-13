var assert = require('assert'),

    Utils = require('..').Utils;

describe('Utils', function () {
    it('#sort values', function () {
        var origin = ['y', 'w', 'a'];
        var sorted = Utils.sort(origin);
        assert.deepEqual(origin, ['y', 'w', 'a']);
        assert.deepEqual(sorted, ['a', 'w', 'y']);
        assert.deepEqual(Utils.sort([10, 8, 7, 65]), [7, 8, 10, 65]);
    });

    it('#sort hashes', function () {
        var origin = [{ k: 90 }, { k: 10 }, { k: 30 }];
        var sorted = Utils.sort(origin, 'k');
        assert.deepEqual(origin, [{ k: 90 }, { k: 10 }, { k: 30 }]);
        assert.deepEqual(sorted, [{ k: 10 }, { k: 30 }, { k: 90 }]);
    });

    it('#diff unsorted arrays', function () {
        assert.deepEqual(Utils.diff([9, 8, 10, 3], [10, 8, 7, 65]),
                         [[3, 9], [7, 65]]);
    });

    it('#diff sorted arrays', function () {
        assert.deepEqual(Utils.diff([3, 8, 9, 10], [7, 8, 10, 65], { sorted: true }),
                         [[3, 9], [7, 65]]);
    });

    it('#diff unsorted hashes', function () {
        assert.deepEqual(Utils.diff([{k:9}, {k:8}, {k:10}, {k:3}], [{k:10}, {k:8}, {k:7}, {k:65}], { key: 'k' }),
                         [[{k:3}, {k:9}], [{k:7}, {k:65}]]);
    });

    it('#diff sorted hashes', function () {
        assert.deepEqual(Utils.diff([{k:3}, {k:8}, {k:9}, {k:10}], [{k:7}, {k:8}, {k:10}, {k:65}], { sorted: true, key: 'k' }),
                         [[{k:3}, {k:9}], [{k:7}, {k:65}]]);
    });

    it('#diff with common items', function () {
        assert.deepEqual(Utils.diff([3, 8, 9, 10], [7, 8, 10, 65], { sorted: true, common: true }),
                         [[3, 9], [7, 65], [8, 10]]);
    });
});
