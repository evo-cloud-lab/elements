/** @fileoverview
 * Relational Objects Management
 *
 * It is quite similar to relational database, objects are created
 * from predefined model. The relationships between different models
 * are defined by the models. For creating an object, all the
 * relationships must be established.
 *
 * For each of the object, it must be able to dump into plain JSON
 * object and also reload from it. Object management will help to
 * manage relationships.
 */

var Class = require('js-class'),
    flow  = require('js-flow'),
    Errors = require('./Errors'),

    Catalog = require('./Catalog');

var Relationship = Class({
    constructor: function (src, dst) {
        this.source = src;
        this.target = dst;
    }
});

/** @class Model
 *
 * A model is the type of objects. It defines the how objects
 * get created and what the relationships are between different types
 * of objects.
 */
var Model = Class({
    /** @constructor
     *
     * @param {String} name     The name of the model, must be unique
     * @param {Object} def      The definition of the model, defined as
     *    - refs        an Array of model names this type of object will reference
     *    - create      the method for creating a new object
     *    - reload      the method for reloading an object from JSON
     * @param container         The objects container
     *
     * And for each of the object instances, the following properties/methods are required:
     *    - dump        method, for generate the JSON from the object
     *
     * And some optional methods:
     *    - destruct    it is invoked when object is being deleted.
     *    - dispose     it gets invoked when the object is dumped and should be cleaned
     *                  from memory, which means the object is still there, persisted
     *                  but not in memory.
     *
     * The following properties/methods will be added to created object instance, so the
     * object instance must not define them:
     *    - id          property, unique id of the object
     *    - model:      property, get the model instance
     *    - toObject:   method, wrap over "dump"
     *    - destroy:    method, handles object deletion, it will invoke "destruct"
     *    - refs:       two level hash containing all referenced objects,
     *                  first level is model name, and second level is object id
     *    - rels:       relations being referenced from other objects.
     */
    constructor: function (name, def, container) {
        this._name = name;
        this._refs = Array.isArray(def.refs) ? def.refs : [];
        this._create = def.create;
        this._reload = def.reload;
        if (typeof(this._create) != 'function') {
            throw new Error('Function create is required for object model');
        }
        if (typeof(this._reload) != 'function') {
            throw new Error('Function reload is required for object model');
        }
        this._container = container;
    },

    get name () {
        return this._name;
    },

    create: function (id, props, refs, callback) {
        typeof(props) == 'object' || (props = {});
        this._create(id, props, refs, { container: this._container }, function (err, object) {
            if (!err && object) {
                this._initializeObject(id, object, refs);
            }
            callback(err, object);
        }.bind(this));
    },

    toObject: function () {
        return {
            name: this.name,
            refs: this._refs
        };
    },

    restful: function (express, prefix) {
        var self = this;
        express.param(this.name, function (req, res, next, id) {
            var object = self._container.find(self.name, id);
            if (object) {
                req[self.name] = object;
                next();
            } else {
                res.send(404, id);
            }
        });

        express.get(prefix + '/' + this.name, function (req, res) {
            var objs = self._container.dict(self.name);
            var dumped = [];
            for (var id in objs) {
                dumped.push(objs[id].toObject());
            }
            res.send(200, dumped);
        });

        express.get(prefix + '/' + this.name + '/:' + this.name, function (req, res) {
            res.send(200, req[self.name].toObject());
        });

        express.post(prefix + '/' + this.name, function (req, res) {
            var model = self._container._findModel(self.name);
            var id    = req.body.id;
            var refs  = req.body.refs || {};
            var props = req.body.properties;

            var missingRefs = model._refs.filter(function (name) { return !refs[name]; });
            if (typeof(id) != 'string' || !id) {
                res.send(400, 'Id is required');
            } else if (missingRefs.length > 0) {
                res.send(400, 'Reference not satisfied: ' + missingRefs.join(','));
            } else {
                self._container.create(id, self.name, refs, props, function (err, object) {
                    if (err) {
                        if (err.code == 'NONEXIST') {
                            res.send(404, err.message);
                        } else if (err.code == 'CONFLICT') {
                            res.send(409, err.message);
                        } else {
                            res.send(err.status || 500, err.message);
                        }
                    } else {
                        res.send(201, object.toObject());
                    }
                });
            }
        });

        express.put(prefix + '/' + this.name + '/:' + this.name, function (req, res) {
            var object = req[self.name];
            if (typeof(object.update) == 'function') {
                object.update(req.body, function (err) {
                    err ? res.send(err.status || 500, err.message) : res.send(200, object.toObject());
                });
            } else {
                res.send(400, 'Update not supported');
            }
        });

        express.delete(prefix + '/' + this.name + '/:' + this.name, function (req, res) {
            req[self.name].destroy({ recursive: true }, function (err) {
                err ? res.send(err.status || 500, err.message) : res.send(204);
            });
        });
    },

    _initializeObject: function (id, object, refs) {
        var props = {
            id:    id,
            model: this,
            refs:  refs,
            rels:  new Catalog()
        };
        for (var key in props) {
            Object.defineProperty(object, key, { value: props[key], enumerable: true });
        }

        object.toObject = function (opts) {
            typeof(opts) == 'object' || (opts = {});
            var obj = this.dump();
            obj.id = this.id;
            opts.refs === false || (obj.refs = (function (refs) {
                var result = {};
                for (var name in refs) {
                    result[name] = refs[name].map(function (obj) { return obj.id; });
                }
                return result;
            })(this.refs));
            opts.rels === false || (obj.rels = (function (rels) {
                var result = {};
                rels.names.forEach(function (name) {
                    result[name] = Object.keys(rels.all(name));
                });
                return result;
            })(this.rels));
            return obj;
        };

        object.destroy = function (opts, callback) {
            if (typeof(opts) == 'function') {
                callback = opts;
                opts = {};
            }
            opts || (opts = {});
            flow.steps()
                .next(function (next) {
                    if (opts.recursive) {
                        var relObjects = [];
                        this.rels.names.forEach(function (name) {
                            var relations = this.rels.all(name);
                            for (var id in relations) {
                                relObjects.push(relations[id].source);
                            }
                        }, this);
                        flow.each(relObjects)
                            .do('&destroy')
                            .run(opts, next);
                    } else {
                        next();
                    }
                })
                .next(function (next) {
                    if (this.rels.names.length != 0) {
                        next(new Error('Object is in use'));
                    } else {
                        for (var name in refs) {
                            refs[name].forEach(function (obj) {
                                this.model._container._removeRelation(this, obj);
                            }, this);
                        }
                        this.model._container._removeObject(this);
                        this.destruct ? this.destruct(next) : next();
                    }
                })
                .with(this)
                .run(callback);
        };

        this._container._addObject(object);
        for (var name in refs) {
            refs[name].forEach(function (obj) {
                this._container._addRelation(object, obj);
            }, this);
        }
    }
});

var Objects = Class({
    constructor: function (storage) {
        this._objects = new Catalog();
        this._relations = new Catalog();
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

        express.get(prefix + '/', function (req, res) {
            var models = [];
            for (var name in this._models) {
                models.push(this._models[name].toObject());
            }
            res.send(200, models);
        }.bind(this));

        for (var name in this._models) {
            this._models[name].restful(express, prefix);
        }
        return this;
    },

    create: function (id, modelName, refIds, props, callback) {
        var model = this._models[modelName];
        if (model && this._objects.find(modelName, id) == null) {
            var refs = {}, err;
            for (var name in refIds) {
                var ids = refIds[name], errs = [];
                Array.isArray(ids) || (ids = [ids]);
                var objects = ids.map(function (id) {
                    var object = this.find(name, id);
                    object || errs.push(Errors.nonexist(id, { type: 'object' }));
                    return object;
                }, this);
                if (errs.length > 0) {
                    err = Errors.nonexist(
                        errs.length == 1 ? errs[0].id
                                         : errs.map(function (err) { return err.id; }),
                        { type: 'object' }
                    );
                    break;
                }
                refs[name] = objects;
            }
            if (err) {
                callback(err);
            } else {
                // put a placeholder first for reserving the id
                this._objects.add(modelName, id, false);
                model.create(id, props, refs, function (err, object) {
                    !err && object ? this._objects.add(modelName, id, object) : this._objects.remove(modelName, id);
                    callback(err, object);
                }.bind(this));
            }
        } else if (model) {
            callback(Errors.conflict(id, { type: 'object', model: modelName }));
        } else {
            callback(Errors.nonexist(modelName, { type: 'model' }));
        }
        return this;
    },

    find: function (modelName, id) {
        var object = this._objects.find(modelName, id);
        return object === false ? undefined : object;   // false is a placeholder
    },

    dict: function (modelName) {
        return this._objects.all(modelName) || {};
    },

    list: function (modelName) {
        var objs = this.dict(modelName);
        return Object.keys(objs).map(function (id) { return objs[id]; });
    },

    _addObject: function (object) {
        this._objects.add(object.model.name, object.id, object);
    },

    _removeObject: function (object) {
        this._objects.remove(object.model.name, object.id);
    },

    _addRelation: function (src, dst) {
        var relation = new Relationship(src, dst);
        this._relations.add(src.id, dst.id);
        dst.rels.add(src.model.name, src.id, relation);
    },

    _removeRelation: function (src, dst) {
        dst.rels.remove(src.model.name, src.id);
        this._relations.remove(src.id, dst.id);
    },

    _defineModel: function (name, def) {
        var model = new Model(name, def, this);
        this._models[name] = model;
    },

    _findModel: function (name) {
        return this._models[name];
    }
});

module.exports = Objects;
