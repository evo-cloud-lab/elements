var Class = require('js-class'),
    Try   = require('js-flow').Try,

    Catalog = require('./Catalog');

var Model = Class({
    constructor: function (name, def) {
        this._name = name;
        this._owner = def.owner;
        this._properties = Array.isArray(def.properties) ? def.properties : Object.keys(def.properties || {});
        var factory = def.factory
        this._factory = factory.length > 1 ? factory : function (options, callback) {
            Try.tries(function () {
                var object = factory(options);
                callback(null, object);
            }, callback);
        };
    },

    create: function (container, ownerObject, props, callback) {
        this._factory({ container: container, owner: ownerObject, params: props }, function (err, object) {
            if (!err && object) {
                var props = {
                    model: { value: this },
                    owner: { value: ownerObject },
                    owns: { value: [] }
                };
                for (var prop in props) {
                    object.hasOwnProperty(prop) || Object.defineProperty(object, prop, props[prop]);
                }

                var model = this;
                object.toObject || (object.toObject = function () {
                    var obj = {};
                    model._properties.forEach(function (name) { obj[name] = this[name]; }, this);
                    obj.id = this.id;
                    this.owner && (obj.ownerId = this.owner.id);
                    obj.owns = this.owns.map(function (own) { return own.id; });
                    return obj;
                });

                object.destroy = function (callback) {
                    var destroyFn = this._destroy || function (callback) { callback(); };
                    destroyFn(function (err) {
                        if (this.owner) {
                            var at;
                            if (this.owns.some(function (object, index) { at = index; return object.id == this.id }, this)) {
                                this.owns.splice(at, 1);
                            }
                        }
                        container._remove(model._name, this.id);
                        callback(err);
                    }.bind(this));
                };

                ownerObject && ownerObject.owns.push(object);
                container._add(this._name, object);
            }
            callback(err, object);
        }.bind(this));
    },

    restful: function (container, express, prefix) {
        var self = this;
        express.param(this._name, function (req, res, next, id) {
            var object = container.find(self._name, id);
            if (object) {
                req[self._name] = object;
                next();
            } else {
                res.send(404, id);
            }
        });

        express.get(prefix + '/' + this._name, function (req, res) {
            res.send(200, Object.keys(container.dict(self._name)));
        });

        express.get(prefix + '/' + this._name + '/:' + this._name, function (req, res) {
            res.send(200, req[self._name].toObject());
        });

        var owners = [], ownerName = this._owner;
        while (ownerName) {
            var owner = container._findModel(ownerName);
            if (!owner) {
                throw new Error('Invalid owner model: ' + ownerName);
            }
            owners.unshift(owner);
            ownerName = owner._owner;
        }
        express.post(prefix + owners.map(function (model) { return '/' + model._name + '/:' + model._name; }) + '/' + this._name, function (req, res) {
            var ownerObject = owners.length > 0 ? req[owners[owners.length - 1]._name] : undefined;
            self.create(container, ownerObject, req.body, function (err, object) {
                err ? res.send(err.status || 500, err.message) : res.send(201, object.toObject());
            });
        });

        express.put(prefix + '/' + this._name + '/:' + this._name, function (req, res) {
            var object = req[self._name];
            if (typeof(object.update) == 'function') {
                object.update(req.body, function (err) {
                    err ? res.send(err.status || 500, err.message) : res.send(200, object.toObject());
                });
            } else {
                res.send(400, 'Update not supported');
            }
        });

        express.delete(prefix + '/' + this._name + '/:' + this._name, function (req, res) {
            req[self._name].destroy(function (err) {
                err ? res.send(err.status || 500, err.message) : res.send(204);
            });
        });
    }
});

var Objects = Class({
    constructor: function (storage) {
        this._objects = new Catalog();
        this._models = {};
    },

    define: function (modelName, definition) {
        if (typeof(modelName) == 'object') {
            var models = modelName;
            for (var name in models) {
                this._defineModel(name, models[name]);
            }
        } else {
            this._defineModel(modelName, definition);
        }
        return this;
    },

    restful: function (express, prefix) {
        prefix || (prefix = '');
        for (var name in this._models) {
            this._models[name].restful(this, express, prefix);
        }
        return this;
    },

    create: function (ownerObject, modelName, props, callback) {
        var model = this._models[modelName];
        if (!model) {
            throw new Error('Invalid model ' + modelName);
        }
        model.create(this, ownerObject, props, callback);
        return this;
    },

    find: function (modelName, id) {
        return this._objects.find(modelName, id);
    },

    dict: function (modelName) {
        return this._objects.all(modelName) || {};
    },

    list: function (modelName) {
        var objs = this.dict(modelName);
        return Object.keys(objs).map(function (id) { return objs[id]; });
    },

    _add: function (modelName, object) {
        this._objects.add(modelName, object.id, object);
    },

    _remove: function (modelName, id) {
        this._objects.remove(modelName, id);
    },

    _defineModel: function (name, def) {
        var model = new Model(name, def);
        this._models[name] = model;
    },

    _findModel: function (name) {
        return this._models[name];
    }
});

module.exports = Objects;
