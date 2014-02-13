var assert = require('assert'),

    Catalog = require('..').Catalog;

describe('Catalog', function () {
    it('#add', function () {
        var cat = new Catalog();
        cat.add('name', 'key', 'value');
        assert.equal(cat.find('name', 'key'), 'value');
    });

    it('#remove', function () {
        var cat = new Catalog()
            .add('name', 'key1', 'value1')
            .add('name', 'key2', 'value2')
            .remove('name', 'key1');
        assert.equal(cat.find('name', 'key2'), 'value2');
        assert.equal(cat.find('name', 'key1'), null);
        cat.remove('name', 'key2');
        assert.equal(cat.all('name'), null);
    });

    it('#removeAll', function () {
        var cat = new Catalog()
            .add('name', 'key1', 'value1')
            .add('name', 'key2', 'value2')
            .removeAll('name');
        assert.equal(cat.find('name', 'key2'), null);
        assert.equal(cat.find('name', 'key1'), null);
        assert.equal(cat.all('name'), null);
    });

    it('#all notNull', function () {
        var cat = new Catalog();
        var items = cat.all('name', true);
        assert.deepEqual(items, {});
        assert.deepEqual(cat.catalogs, { name: {} });
        assert.deepEqual(cat.names, ['name']);
    });

    it('#clear', function () {
        var cat = new Catalog().add('name', 'key', 'value');
        assert.deepEqual(cat.catalogs, { name: { key: 'value' } });
        cat.clear();
        assert.deepEqual(cat.catalogs, { });
    });
});
