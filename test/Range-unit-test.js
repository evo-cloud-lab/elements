var assert = require('assert'),

    Range = require('../index').Range;

describe('Range', function () {
    it('#constructor validates parameters', function () {
        assert.throws(function () {
            new Range('a');
        }, /invalid value/i);
        assert.throws(function () {
            new Range('a', 'b');
        }, /invalid value/i);

        var range = new Range(1, 3);
        assert.strictEqual(range.begin, 1);
        assert.strictEqual(range.end, 3);
    });

    it('#begin validates value', function () {
        var range = new Range();
        assert.throws(function () { range.begin = 'a'; }, /invalid value/i);
        range.begin = 1;
        assert.strictEqual(range.begin, 1);
    });

    it('#end validates value', function () {
        var range = new Range();
        assert.throws(function () { range.end = 'a'; }, /invalid value/i);
        range.end = 1;
        assert.strictEqual(range.end, 1);
    });

    it('#count', function () {
        assert.strictEqual(new Range(1, 3).count, 2);
        assert.strictEqual(new Range(1, 1).count, 0);
    });

    it('#valid', function () {
        assert.strictEqual(new Range(1, 3).valid, true);
        assert.strictEqual(new Range(1, 1).valid, true);
        assert.strictEqual(new Range(1, -3).valid, false);
    });

    it('#clone', function () {
        var range = new Range(1, 3);
        var cloned = range.clone();
        cloned.begin = 2;
        cloned.end = 4;
        assert.strictEqual(range.begin, 1);
        assert.strictEqual(range.end, 3);
        assert.strictEqual(cloned.begin, 2);
        assert.strictEqual(cloned.end, 4);
    });

    it('#toArray', function () {
        assert.deepEqual(new Range(3, 4).toArray(), [3, 1]);
    });

    it('#toObject', function () {
        assert.deepEqual(new Range(3, 4).toObject(), { begin: 3, end: 4 });
    });

    it('#overlap', function () {
        assert.strictEqual(new Range(1, 3).overlap(new Range(4, 5)), null);
        assert.strictEqual(new Range(1, 3).overlap(new Range(3, 5)), null);
        assert.deepEqual(new Range(1, 3).overlap(new Range(2, 5)).toObject(), { begin: 2, end: 3 });
        assert.deepEqual(new Range(1, 5).overlap(new Range(2, 5)).toObject(), { begin: 2, end: 5 });
        assert.deepEqual(new Range(1, 7).overlap(new Range(2, 5)).toObject(), { begin: 2, end: 5 });
        assert.deepEqual(new Range(2, 3).overlap(new Range(2, 5)).toObject(), { begin: 2, end: 3 });
        assert.deepEqual(new Range(3, 4).overlap(new Range(2, 5)).toObject(), { begin: 3, end: 4 });
        assert.deepEqual(new Range(2, 5).overlap(new Range(2, 5)).toObject(), { begin: 2, end: 5 });
        assert.deepEqual(new Range(2, 7).overlap(new Range(2, 5)).toObject(), { begin: 2, end: 5 });
        assert.deepEqual(new Range(3, 7).overlap(new Range(2, 5)).toObject(), { begin: 3, end: 5 });
        assert.strictEqual(new Range(5, 7).overlap(new Range(2, 5)), null);
        assert.strictEqual(new Range(6, 7).overlap(new Range(2, 5)), null);
    });

    it('#sibling', function () {
        assert.strictEqual(new Range(1, 3).sibling(new Range(-1, 0)), null);
        assert.strictEqual(new Range(1, 3).sibling(new Range(2, 4)), null);
        assert.strictEqual(new Range(1, 3).sibling(new Range(-1, 1)), 'R');
        assert.strictEqual(new Range(1, 3).sibling(new Range(3, 4)), 'L');
        assert.strictEqual(new Range(1, 3).sibling(new Range(-1, 3)), null);
        assert.strictEqual(new Range(1, 3).sibling(new Range(2, 4)), null);
    });

    it('#cover', function () {
        assert.equal(new Range(1, 3).cover(0), false);
        assert.equal(new Range(1, 3).cover(1), true);
        assert.equal(new Range(1, 3).cover(2), true);
        assert.equal(new Range(1, 3).cover(3), false);
        assert.equal(new Range(1, 3).cover(4), false);
    });

    it('#merge', function () {
        assert.equal(new Range(1, 3).merge(new Range(-1, 0)), null);
        assert.equal(new Range(1, 3).merge(new Range(4, 7)), null);
        assert.deepEqual(new Range(1, 3).merge(new Range(-1, 1)).toObject(), { begin: -1, end: 3 });
        assert.deepEqual(new Range(1, 3).merge(new Range(3, 7)).toObject(), { begin: 1, end: 7 });
        assert.deepEqual(new Range(1, 3).merge(new Range(-1, 2)).toObject(), { begin: -1, end: 3 });
        assert.deepEqual(new Range(1, 3).merge(new Range(-1, 3)).toObject(), { begin: -1, end: 3 });
        assert.deepEqual(new Range(1, 3).merge(new Range(-1, 4)).toObject(), { begin: -1, end: 4 });
        assert.deepEqual(new Range(1, 3).merge(new Range(1, 2)).toObject(), { begin: 1, end: 3 });
        assert.deepEqual(new Range(1, 3).merge(new Range(1, 4)).toObject(), { begin: 1, end: 4 });
        assert.deepEqual(new Range(1, 3).merge(new Range(2, 3)).toObject(), { begin: 1, end: 3 });
        assert.deepEqual(new Range(1, 3).merge(new Range(2, 4)).toObject(), { begin: 1, end: 4 });
        assert.deepEqual(new Range(1, 7).merge(new Range(2, 5)).toObject(), { begin: 1, end: 7 });
    });

    it('#sub', function () {
        [
            [[1, 3], [4, 5], [[1, 3]]],
            [[1, 3], [3, 5], [[1, 3]]],
            [[1, 3], [2, 5], [[1, 2]]],
            [[1, 5], [2, 5], [[1, 2]]],
            [[1, 7], [2, 5], [[1, 2], [5, 7]]],
            [[2, 3], [2, 5], []],
            [[3, 4], [2, 5], []],
            [[2, 5], [2, 5], []],
            [[2, 7], [2, 5], [[5, 7]]],
            [[3, 7], [2, 5], [[5, 7]]],
            [[5, 7], [2, 5], [[5, 7]]],
            [[6, 7], [2, 5], [[6, 7]]]
        ].forEach(function (test) {
            var result = new Range(test[0][0], test[0][1])
                            .sub(new Range(test[1][0], test[1][1]))
                            .map(function (range) { return [range.begin, range.end]; });
            assert.deepEqual(result, test[2]);
        });
    });

    it('#parse', function () {
        assert.deepEqual(Range.parse([1, 3]).toObject(), { begin: 1, end: 4 });
        assert.deepEqual(Range.parse([1]).toObject(), { begin: 1, end: 1 });
        assert.deepEqual(Range.parse(1).toObject(), { begin: 1, end: 1 });
        assert.deepEqual(Range.parse(1, 1).toObject(), { begin: 1, end: 2 });
        assert.deepEqual(Range.parse({ begin: 1, end: 2}).toObject(), { begin: 1, end: 2 });
        assert.equal(Range.parse(), null);
        assert.equal(Range.parse('a'), null);
        assert.equal(Range.parse('a', 'b'), null);
        assert.equal(Range.parse(1, 'b'), null);
        assert.equal(Range.parse([]), null);
        assert.equal(Range.parse(['a']), null);
        assert.equal(Range.parse(['a', 'b']), null);
        assert.equal(Range.parse([1, 'b']), null);
    });
});
