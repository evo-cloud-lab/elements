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
    Errors  = require('./Errors'),
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
     *    - reload      [not supported] the method for reloading an object from JSON
     *    - exports     any substring of "CRUD" to indicate which APIs should be exposed
     *    - consistent  true if it must be updated consistently
     *
     * @param container         The objects container
     *
     * And for each of the object instances, the following properties/methods are required:
     *    - dump        method, for generate the JSON from the object
     *
     * And some optional methods:
     *    - destruct    it is invoked when object is being deleted.
     *    - dispose     [not supported] it gets invoked when the object is dumped and should be cleaned
     *                  from memory, which means the object is still there, persisted
     *                  but not in memory.
     *
     * The following properties/methods will be added to created object instance, so the
     * object instance must not define them:
     *    - id          property, unique id of the object
     *    - toObject:   method, wrap over "dump"
     *    - updated:    method, notify the object is updated
     *    - destroy:    method, handles object deletion, it will invoke "destruct"
     *    - .meta:      property, for metadata, defined as
     *       - ctime:      creation time
     *       - mtime:      modification time
     *       - rev:        version tag
     *       - model:      property, get the model instance
     *       - refs:       two level hash containing all referenced objects,
     *                     first level is model name, and second level is object id
     *       - rels:       relations being referenced from other objects.
     */
    constructor: function (name, def, container) {
        this._name = name;
        this._refs = Array.isArray(def.refs) ? def.refs : [];
        this._exports = {}
        this._consistent = def.consistent;
        this._create = def.create;
        this._reload = def.reload;
        var exports = typeof(def.exports) == 'string' ? def.exports.toUpperCase() : '';
        this._exports.access = exports.indexOf('R') >= 0;
        this._exports.create = exports.indexOf('C') >= 0;
        this._exports.update = exports.indexOf('U') >= 0;
        this._exports.delete = exports.indexOf('D') >= 0;

        if (typeof(this._create) != 'function') {
            throw new Error('Function create is required for object model');
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

        if (this._exports.access || this._exports.update || this._exports.delete) {
            express.param(this.name, function (req, res, next, id) {
                var object = self._container.find(self.name, id);
                if (object) {
                    req[self.name] = object;
                    next();
                } else {
                    res.send(404, id);
                }
            });
        }

        if (this._exports.access) {
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

            this._refs.forEach(function (ref) {
                express.get(prefix + '/' + ref + '/:' + ref + '/' + self.name, function (req, res) {
                    var meta = req[ref] && req[ref]['.meta'];
                    if (meta) {
                        var rels = meta.rels.all(self.name) || {};
                        var dumped = [];
                        for (var id in rels) {
                            dumped.push(rels[id].source.toObject());
                        }
                        res.send(200, dumped);
                    } else {
                        res.send(404, ref + ' not found');
                    }
                });
            });
        }

        if (this._exports.create) {
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
                            res.send(err['http-status'] || 500, err.message);
                        } else {
                            res.send(201, object.toObject());
                        }
                    });
                }
            });
        }

        if (this._exports.update) {
            express.put(prefix + '/' + this.name + '/:' + this.name, function (req, res) {
                var object = req[self.name];
                var meta = object['.meta'];
                var revRequired = meta.hasOwnProperty('rev');
                if (typeof(object.update) != 'function') {
                    res.send(400, 'Update not supported');
                } else if (revRequired && req.params.r == null) {
                    res.send(400, 'Version tag is required');
                } else if (revRequired && req.params.r != meta.rev) {
                    res.send(409, 'Out-of-date');
                } else {
                    object.update(req.body.properties, function (err) {
                        err ? res.send(err['http-status'] || 500, err.message) : res.send(200, object.toObject());
                    });
                }
            });
        }

        if (this._exports.delete) {
            express.delete(prefix + '/' + this.name + '/:' + this.name, function (req, res) {
                req[self.name].destroy({ recursive: true }, function (err) {
                    err ? res.send(err['http-status'] || 500, err.message) : res.send(204);
                });
            });
        }
    },

    _initializeObject: function (id, object, refs) {
        var meta = Object.create({}), now = Date.now();
        Object.defineProperties(meta, {
            model: { value: this },
            refs:  { value: refs },
            rels:  { value: new Catalog() },
            ctime: { value: now },
            mtime: { value: now, writable: true }
        });
        if (this._consistent) {
            Object.defineProperty(meta, 'rev', { value: 0, writable: true });
        }

        Object.defineProperties(object, {
            id: { value: id, enumerable: true },
            '.meta': { value: meta }
        });

        object.toObject = function (opts) {
            typeof(opts) == 'object' || (opts = {});
            var meta = this['.meta'], m = {};
            var obj = this.dump();
            obj.id = this.id;
            obj['.meta'] = m;
            m.model = meta.model.name;
            m.ctime = meta.ctime;
            m.mtime = meta.mtime;
            m.rev = meta.rev;
            opts.refs === false || (m.refs = (function (refs) {
                var result = {};
                for (var name in refs) {
                    result[name] = refs[name].map(function (obj) { return obj.id; });
                }
                return result;
            })(meta.refs));
            opts.rels === false || (m.rels = (function (rels) {
                var result = {};
                rels.names.forEach(function (name) {
                    result[name] = Object.keys(rels.all(name));
                });
                return result;
            })(meta.rels));
            return obj;
        };

        object.destroy = function (opts, callback) {
            if (typeof(opts) == 'function') {
                callback = opts;
                opts = {};
            }
            opts || (opts = {});
            var meta = this['.meta'];
            flow.steps()
                .next(function (next) {
                    if (opts.recursive) {
                        var relObjects = [];
                        meta.rels.names.forEach(function (name) {
                            var relations = meta.rels.all(name);
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
                    if (meta.rels.names.length != 0) {
                        next(new Error('Object is in use'));
                    } else {
                        for (var name in refs) {
                            refs[name].forEach(function (obj) {
                                meta.model._container._removeRelation(this, obj);
                            }, this);
                        }
                        meta.model._container._removeObject(this);
                        this.destruct ? this.destruct(next) : next();
                    }
                })
                .with(this)
                .run(function (err) {
                    !err && meta.model._container.emit('destroyed', this, meta.model._container);
                    callback(err);
                });
        };

        object.updated = function () {
            var meta = this['.meta'];
            if (meta.hasOwnProperty('rev')) {
                meta.rev ++;
            }
            meta.mtime = Date.now();
            meta.model._container.emit('updated', this, meta.model._container);
        };

        for (var name in refs) {
            refs[name].forEach(function (obj) {
                this._container._addRelation(object, obj);
            }, this);
        }
    }
});

var Objects = Class(process.EventEmitter, {
    constructor: function (storage) {
        // objects referenced by modelName + id
        this._objects = new Catalog();
        // all relations by source.id + target.id
        this._relations = new Catalog();
        // references to objects without no 'refs'
        this._roots = new Catalog();
        // all models
        this._models = {};
    },

    get rootObjects () {
        return this._roots;
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
                    !err && object ? this._addObject(object) : this._objects.remove(modelName, id);
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
        var meta = object['.meta'];
        this._objects.add(meta.model.name, object.id, object);
        Object.keys(meta.refs).length == 0 && this._roots.add(meta.model.name, object.id, object);
        this.emit('inserted', object, this);
    },

    _removeObject: function (object) {
        var modelName = object['.meta'].model.name;
        var exists = this._objects.find(modelName, object.id);
        this._objects.remove(modelName, object.id);
        this._roots.remove(modelName, object.id);
        exists && this.emit('removed', object, this);
    },

    _addRelation: function (src, dst) {
        var relation = new Relationship(src, dst);
        this._relations.add(src.id, dst.id, relation);
        dst['.meta'].rels.add(src['.meta'].model.name, src.id, relation);
    },

    _removeRelation: function (src, dst) {
        dst['.meta'].rels.remove(src['.meta'].model.name, src.id);
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
