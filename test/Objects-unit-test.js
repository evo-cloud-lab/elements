var assert = require('assert'),
    Try    = require('js-flow').Try,

    Objects = require('..').Objects;

describe('Objects', function () {
    function simpleFactory(options) {
        return options.params;
    }

    it('#define', function () {
        var objects = new Objects();
        objects.define('m1', {
            create: function () { },
            reload: function () { },
        });
        objects.define({
            m2: {
                refs: ['m1'],
                create: function () { },
                reload: function () { }
            },
            m3: {
                refs: ['m1'],
                create: function () { },
                reload: function () { }
            }
        });
        assert.ok(objects._findModel('m1'));
        assert.ok(objects._findModel('m2'));
        assert.ok(objects._findModel('m3'));
    });

    it.skip('#create', function (done) {
        var objects = new Objects();
        objects.define({
            root: {
                properties: ['name'],
                factory: simpleFactory
            }
        });

        objects.create(null, 'root', { id: 'id', name: 'name', other: 'other' }, function (err, object) {
            Try.final(function () {
                assert.equal(err, null);
                assert.ok(object);
                assert.deepEqual(object.toObject(), { id: 'id', name: 'name', owns: [] });
            }, done);
        });
    });

    it.skip('#create with ownership', function (done) {
        var objects = new Objects();
        objects.define({
            root: {
                properties: ['name'],
                factory: simpleFactory
            },

            sub1: {
                owner: 'root',
                properties: ['sub1prop'],
                factory: simpleFactory
            }
        });

        objects.create(null, 'root', { id: 'root', name: 'name' }, function (err, object) {
            objects.create(object, 'sub1', { id: 'id', sub1prop: 'prop' }, function (err, object) {
                Try.final(function () {
                    assert.equal(err, null);
                    assert.ok(object);
                    assert.ok(object.owner);
                    assert.equal(object.owner.id, 'root');
                    assert.equal(object.owner.name, 'name');
                    assert.equal(object.id, 'id');
                    assert.equal(object.sub1prop, 'prop');
                    assert.deepEqual(object.toObject(), { id: 'id', ownerId: 'root', sub1prop: 'prop', owns: [] });
                    assert.deepEqual(object.owner.toObject(), { id: 'root', name: 'name', owns: ['id'] });
                }, done);
            });
        });
    });

    it.skip('#find', function (done) {
        var objects = new Objects();
        objects.define({
            root: {
                properties: ['name'],
                factory: simpleFactory
            }
        });

        objects.create(null, 'root', { id: 'id', name: 'name', other: 'other' }, function (err, object) {
            Try.final(function () {
                assert.equal(err, null);
                assert.ok(objects.find('root', 'id'));
            }, done);
        });
    });

    it.skip('#dict', function (done) {
        var objects = new Objects();
        objects.define({
            root: {
                properties: ['name'],
                factory: simpleFactory
            }
        });

        objects.create(null, 'root', { id: 'id', name: 'name', other: 'other' }, function (err, object) {
            Try.final(function () {
                assert.equal(err, null);
                var dict = objects.dict('root');
                assert.ok(dict);
                assert.ok(dict['id']);
                assert.deepEqual(dict['id'].toObject(), { id: 'id', name: 'name', owns: [] });
            }, done);
        });
    });

    it.skip('#list', function (done) {
        var objects = new Objects();
        objects.define({
            root: {
                properties: ['name'],
                factory: simpleFactory
            }
        });

        objects.create(null, 'root', { id: 'id', name: 'name', other: 'other' }, function (err, object) {
            Try.final(function () {
                assert.equal(err, null);
                var list = objects.list('root');
                assert.equal(list.length, 1);
                assert.equal(list[0].id, 'id');
                assert.deepEqual(list[0].toObject(), { id: 'id', name: 'name', owns: [] });
            }, done);
        });
    });

    it.skip('#restful', function () {
        var objects = new Objects();
        objects.define({
            root: {
                properties: ['name'],
                factory: simpleFactory
            },

            sub1: {
                owner: 'root',
                properties: ['sub1prop'],
                factory: simpleFactory
            }
        });
        var endpoints = [];
        var mockExpress = {
            param: function () {},
            get: function (path) { endpoints.push('get ' + path); },
            post: function (path) { endpoints.push('post ' + path); },
            put: function (path) { endpoints.push('put ' + path); },
            'delete': function (path) { endpoints.push('delete ' + path); }
        };
        objects.restful(mockExpress);
        assert.deepEqual(endpoints.sort(), [
            'delete /root/:root',
            'delete /sub1/:sub1',
            'get /root',
            'get /root/:root',
            'get /sub1',
            'get /sub1/:sub1',
            'post /root',
            'post /root/:root/sub1',
            'put /root/:root',
            'put /sub1/:sub1'
        ]);
    });
});
