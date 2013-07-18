var assert = require('assert'),
    Class  = require('js-class'),

    Schema = require('../lib/Schema');

describe('Schema', function () {
    it('#validate with objects', function () {
        assert.strictEqual(Schema.validate(String, 'abc'), 'abc');
        assert.strictEqual(Schema.validate(Number, 1), 1);
        assert.strictEqual(Schema.validate(Boolean, true), true);
        assert.deepEqual(Schema.validate(Array, ['abc']), ['abc']);
        assert.throws(function () { Schema.validate(String, null); });
        assert.throws(function () { Schema.validate(Number, 'abc'); });
    });
    
    it('#validate with strings', function () {
        assert.strictEqual(Schema.validate('string', 'abc'), 'abc');
        assert.strictEqual(Schema.validate('number', 1), 1);
        assert.strictEqual(Schema.validate('int', 10), 10);
        assert.strictEqual(Schema.validate('integer', 100), 100);
        assert.strictEqual(Schema.validate('float', 1.1), 1.1);
        assert.strictEqual(Schema.validate('boolean', true), true);
        assert.deepEqual(Schema.validate('array', ['abc']), ['abc']);
        assert.throws(function () { Schema.validate('string', null); });
        assert.throws(function () { Schema.validate('number', 'abc'); });
        assert.throws(function () { Schema.validate('int', 'abc'); });
        assert.throws(function () { Schema.validate('integer', 'abc'); });
        assert.throws(function () { Schema.validate('float', 'abc'); });
    });

    it('#validate with array', function () {
        assert.strictEqual(Schema.validate([3, 6, 9], 6), 6);
        assert.throws(function () { Schema.validate([3, 6, 9], 0); });
    });
    
    it('#validate nested schema', function () {
        var schema = {
            info: Schema.nest({
                name: String,
                value: Number
            })
        };
        assert.deepEqual(Schema.merge({ key: 'abc' }, schema,
            {
                info: {
                    name: 'Name',
                    value: 123
                }
            }), {
                key: 'abc',
                info: {
                    name: 'Name',
                    value: 123
                }
            }
        );
        assert.throws(function () {
            Schema.accept(schema, {
                info: { }
            });
        });
    });
    
    describe('#validators type', function () {
        it('instanceof', function () {
            var MyClass = Class({});
            var object = new MyClass();
            var result = Schema.accept({ key: MyClass }, { key: object });
            assert.ok(result.key instanceof MyClass);
            assert.throws(function () {
                Schema.accept({ key: MyClass }, { key: {} });
            });
        });
        
        it('array auto convertion', function () {
            assert.deepEqual(Schema.accept({ key: Array }, { key: 123 }), { key: [123] });
            assert.throws(function () {
                Schema.accept({ key: { type: 'array', strict: true } }, { key: 123 });
            });
        });
    });
    
    describe('#validators fn', function () {
        it('#validate', function () {
            assert.deepEqual(Schema.accept({ key: { fn: function (opts, value) { return value + 100; } } }, { key: 10 }), { key: 110 });
            assert.throws(function () {
                Schema.accept({ key: { fn: function () { throw new Error('error'); } } }, { key: 100 });
            });
        });
    });
    
    describe('#validators range', function () {
        it('single range', function () {
            assert.deepEqual(Schema.accept({ key: { range: [13, 26] } }, { key: 18 }), { key: 18 });
            assert.deepEqual(Schema.accept({ key: { range: [13, 26] } }, { key: 13 }), { key: 13 });
            assert.deepEqual(Schema.accept({ key: { range: [13, 26] } }, { key: 26 }), { key: 26 });            
            assert.throws(function () {
                Schema.accept({ key: { range: [20, 26] } }, { key: 19 });
            });
        });
        
        it('ranges', function () {
            assert.deepEqual(Schema.accept({ key: { range: [[13, 26], [78, 91]] } }, { key: 80 }), { key: 80 });
            assert.throws(function () {
                Schema.accept({ key: { range: [[20, 26], [91, 99]] } }, { key: 18 });
            });            
        });
    });
    
    describe('#validators presence', function () {
        it('true', function () {
            assert.strictEqual(Schema.validate({ presence: true }, 'abc'), 'abc');
            assert.strictEqual(Schema.validate({ presence: true }, ''), '');            
            assert.strictEqual(Schema.validate({ presence: true }, 0), 0);
            assert.strictEqual(Schema.validate({ presence: true }, false), false);            
            assert.throws(function () { Schema.validate({ presence: true }, undefined); });
            assert.throws(function () { Schema.validate({ presence: true }, null); });
        });

        it('false', function () {
            assert.strictEqual(Schema.validate({ presence: false }, null), null);
            assert.strictEqual(Schema.validate({ presence: false }, undefined), undefined);
            assert.throws(function () { Schema.validate({ presence: false }, 1); });
            assert.throws(function () { Schema.validate({ presence: false }, 0); });            
            assert.throws(function () { Schema.validate({ presence: false }, ''); });            
            assert.throws(function () { Schema.validate({ presence: false }, false); });
        });        
    });
    
    describe('#validators required', function () {
        it('true', function () {
            assert.strictEqual(Schema.validate({ required: true }, 'abc'), 'abc');
            assert.strictEqual(Schema.validate({ required: true }, ''), '');            
            assert.strictEqual(Schema.validate({ required: true }, 0), 0);
            assert.strictEqual(Schema.validate({ required: true }, false), false);
            assert.strictEqual(Schema.validate({ required: true }, null), null);                        
            assert.throws(function () { Schema.validate({ required: true }, undefined); });
        });

        it('false', function () {
            assert.strictEqual(Schema.validate({ required: false }, null), null);
            assert.strictEqual(Schema.validate({ required: false }, undefined), undefined);
            assert.strictEqual(Schema.validate({ required: false }, 0), 0);
            assert.strictEqual(Schema.validate({ required: false }, ''), '');
            assert.strictEqual(Schema.validate({ required: false }, false), false);
        });        
    });
    
    describe('#validators nullable', function () {
        it('true', function () {
            assert.strictEqual(Schema.validate({ nullable: true }, 'abc'), 'abc');
            assert.strictEqual(Schema.validate({ nullable: true }, ''), '');            
            assert.strictEqual(Schema.validate({ nullable: true }, 0), 0);
            assert.strictEqual(Schema.validate({ nullable: true }, false), false);
            assert.strictEqual(Schema.validate({ nullable: true }, null), null);                        
        });

        it('false', function () {
            assert.throws(function () { Schema.validate({ nullable: false }, null); });
            assert.throws(function () { Schema.validate({ nullable: false }, undefined); });            
            assert.strictEqual(Schema.validate({ nullable: false }, 1), 1);
            assert.strictEqual(Schema.validate({ nullable: false }, 0), 0);
            assert.strictEqual(Schema.validate({ nullable: false }, ''), '');
            assert.strictEqual(Schema.validate({ nullable: false }, false), false);
        });        
    });
    
    describe('#validators empty', function () {
        it('true', function () {
            assert.strictEqual(Schema.validate({ empty: true }, 'abc'), 'abc');
            assert.strictEqual(Schema.validate({ empty: true }, ''), '');            
            assert.strictEqual(Schema.validate({ empty: true }, 0), 0);
            assert.strictEqual(Schema.validate({ empty: true }, false), false);
            assert.strictEqual(Schema.validate({ empty: true }, null), null);                        
        });

        it('false', function () {
            assert.throws(function () { Schema.validate({ empty: false }, ''); });
            assert.throws(function () { Schema.validate({ empty: false }, null); });            
            assert.throws(function () { Schema.validate({ empty: false }, undefined); });            
            assert.strictEqual(Schema.validate({ empty: false }, 1), 1);
            assert.strictEqual(Schema.validate({ empty: false }, 0), 0);
            assert.strictEqual(Schema.validate({ empty: false }, false), false);
        });        
    });         
});