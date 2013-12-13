var Class = require('js-class');

var Catalog = Class({
    constructor: function (container) {
        this._catalogs = container || {};
    },

    add: function (name, key, value) {
        var catalog = this._catalogs[name];
        catalog || (catalog = this._catalogs[name] = {});
        catalog[key] = value;
        return this;
    },

    remove: function (name, key) {
        var catalog = this._catalogs[name];
        if (catalog) {
            delete catalog[key];
            if (Object.keys(catalog).length == 0) {
                delete this._catalogs[name];
            }
        }
        return this;
    },

    removeAll: function (name) {
        delete this._catalogs[name];
        return this;
    },

    find: function (name, key) {
        var catalog = this._catalogs[name];
        return catalog && catalog[key];
    },

    all: function (name, notNull) {
        var catalog = this._catalogs[name];
        notNull && !catalog && (catalog = this._catalogs[name] = {});
        return catalog;
    },

    clear: function (container) {
        this._catalogs = container || {};
    },

    get catalogs () {
        return this._catalogs;
    },

    get names () {
        return Object.keys(this._catalogs);
    }
});

module.exports = Catalog;

