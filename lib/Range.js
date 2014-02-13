var Class = require('js-class');

function ensureNum(value) {
    value = parseFloat(value);
    if (isNaN(value)) {
        throw new Error('Invalid value');
    }
    return value;
}

var Range = Class({
    constructor: function (begin, end) {
        this._begin = begin == null ? 0 : ensureNum(begin);
        this._end = end == null ? this._begin : ensureNum(end);
    },

    get begin () {
        return this._begin;
    },

    get end () {
        return this._end;
    },

    set begin (value) {
        return this._begin = ensureNum(value);
    },

    set end (value) {
        return this._end = ensureNum(value);
    },

    get count () {
        return this._end - this._begin;
    },

    get valid () {
        return this._begin <= this._end;
    },

    clone: function () {
        return new Range(this.begin, this.end);
    },

    toArray: function () {
        return [this._begin, this.count];
    },

    toObject: function () {
        return { begin: this._begin, end: this._end };
    },

    overlap: function (range) {
        return Range.overlap(this, range);
    },

    sibling: function (range) {
        return Range.sibling(this, range);
    },

    cover: function (val) {
        return Range.cover(this, val);
    },

    equal: function (range) {
        return Range.equal(this, range);
    },

    merge: function (range) {
        return Range.merge(this, range);
    },

    sub: function (range) {
        return Range.sub(this, range);
    }
}, {
    statics: {
        parse: function (begin, count) {
            if (Array.isArray(begin)) {
                count = begin[1] == null ? 0 : begin[1];
                begin = begin[0];
            } else if (typeof(begin) == 'object') {
                return new Range(begin.begin, begin.end);
            } else {
                count == null && (count = 0);
            }
            try {
                begin = ensureNum(begin);
                count = ensureNum(count);
                return new Range(begin, begin + count);
            } catch(e) {
                return null;
            }
        },

        overlap: function (r1, r2) {
            var begin = Math.max(r1.begin, r2.begin);
            var end = Math.min(r1.end, r2.end);
            return begin < end ? new Range(begin, end) : null;
        },

        sibling: function (r1, r2) {
            return r1.begin == r2.end ? 'R' : (r2.begin == r1.end ? 'L' : null);
        },

        cover: function (r1, val) {
            return val >= r1.begin && val < r1.end;
        },

        equal: function (r1, r2) {
            return r1.begin == r2.begin && r1.end == r2.end;
        },

        merge: function (r1, r2) {
            var begin = Math.max(r1.begin, r2.begin);
            var end = Math.min(r1.end, r2.end);
            if (begin <= end) {
                return new Range(Math.min(r1.begin, r2.begin), Math.max(r1.end, r2.end));
            }
            return null;
        },

        sub: function (r1, r2) {
            var ovl = Range.overlap(r1, r2);
            if (ovl && ovl.count > 0) {
                var ranges = [];
                if (r1.begin < ovl.begin) {
                    ranges.push(new Range(r1.begin, ovl.begin));
                }
                if (r1.end > ovl.end) {
                    ranges.push(new Range(ovl.end, r1.end));
                }
                return ranges;
            } else {
                return [r1];
            }
        }
    }
});

module.exports = Range;
