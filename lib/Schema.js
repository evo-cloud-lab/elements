/** @fileoverview
 * This module provides a simple schema definition language and
 * the schema can be used to validate and import data from a source
 * object.
 */

var Class  = require('js-class'),
    check  = require('validator').check,
    Errors = require('./Errors');

// Validators

function typeAny(type, opts, value, attrName) {
    return value;
}

function typeArray(type, opts, value, attrName) {
    if (Array.isArray(value)) {
        return value;
    } else if (!opts.strict) {
        return value != null && value != undefined ? [value] : [];
    }
    return Errors.badAttr(attrName, value);
}

function typeString(type, opts, value, attrName) {
    if (typeof(value) == 'string') {
        return value;
    } else if (typeof(value) == 'number' || typeof(value) == 'boolean') {
        return value.toString();
    }
    return Errors.badAttr(attrName, value);
}

function typeNumber(type, opts, value, attrName) {
    if (typeof(value) == 'number') {
        return value;
    } else if (typeof(value) == 'string') {
        var num = new Number(value).valueOf();
        if (!isNaN(num)) {
            return num;
        }
    }
    return Errors.badAttr(attrName, value);
}

function typeInteger(type, opts, value, attrName) {
    var val = parseInt(value);
    if (!isNaN(val)) {
        return val;
    }
    return Errors.badAttr(attrName, value);
}

function typeFloat(type, opts, value, attrName) {
    var val = parseFloat(value);
    if (!isNaN(val)) {
        return val;
    }
    return Errors.badAttr(attrName, value);
}

function typeBoolean(type, opts, value, attrName) {
    if (!opts.strict || typeof(value) == 'boolean') {
        return !!value;
    }
    return Errors.badAttr(attrName, value);
}

function typeDate(type, opts, value, attrName) {
    var val = Date.parse(value);
    if (!isNaN(val)) {
        return new Date(val);
    }
    return Errors.badAttr(attrName, value);
}

function typeObject(type, opts, value, attrName) {
    if (typeof(value) == 'object') {
        return value;
    }
    return Errors.badAttr(attrName, value);
}

function typeCheck(typeName) {
    return function (type, opts, value, attrName) {
        try {
            var c = check(value);
            c['is' + typeName].call(c);
            return value;
        } catch (e) {
            return Errors.badAttr(attrName, value);
        }
    };
}

var types = {
    any:        typeAny,
    array:      typeArray,
    string:     typeString,
    number:     typeNumber,
    integer:    typeInteger,
    'int':      typeInteger,
    'float':    typeFloat,
    'boolean':  typeBoolean,
    bool:       typeBoolean,
    date:       typeDate,
    object:     typeObject,
    email:      typeCheck('Email'),
    url:        typeCheck('Url'),
    ip:         typeCheck('IP'),
    ip4:        typeCheck('IPv4'),
    ip6:        typeCheck('IPv6'),
    alpha:      typeCheck('Alpha'),
    alnum:      typeCheck('Alphanumeric'),
    hex:        typeCheck('Hexadecimal'),
    hexColor:   typeCheck('HexColor'),
    uuid:       typeCheck('UUID'),
    uuid3:      typeCheck('UUIDv3'),
    uuid4:      typeCheck('UUIDv4')
};

function validatorType(type, opts, value, attrName) {
    if (typeof(type) == 'function') {
        if (value instanceof type) {
            return value;
        }
    } else {
        var validator = types[type];
        if (validator) {
            return validator(type, opts, value, attrName);
        }
    }
    return Errors.badAttr(attrName, value);
}

function validatorArray(type, opts, value, attrName) {
    if (Array.isArray(value)) {
        var newVal = [];
        for (var i in value) {
            var val = validate(type, value[i], attrName + '.' + i);
            if (val instanceof Error) {
                return val;
            }
            newVal[i] = val;
        }
        return newVal;
    }
    return Errors.badAttr(attrName, value);
}

function validatorLength(type, opts, value, attrName) {
    if (value != null && value.length == type) {
        return value;
    }
    return Errors.badAttr(attrName, value);
}

function validatorOf(values, opts, value, attrName) {
    var index = values.indexOf(value);
    if (index >= 0) {
        return values[index];
    }
    return Errors.badAttr(attrName, value);
}

function validatorNotOf(values, opts, value, attrName) {
    var index = values.indexOf(value);
    if (index < 0) {
        return value;
    }
    return Errors.badAttr(attrName, value);
}

function validatorFunction(fn, opts, value, attrName) {
    return fn(opts, value, attrName);
}

function validatorRange(range, opts, value, attrName) {
    if ((Array.isArray(range[0]) ? range : [range]).some(function (r) {
        return value >= r[0] && value <= r[1];
    })) {
        return value;
    }
    return Errors.badAttr(attrName, value);
}

function validatorPresence(presence, opts, value, attrName) {
    if ((presence && value != null) ||
        (!presence && value == null)) {
        return value;
    }
    return Errors.badAttr(attrName, value);
}

function validatorRequired(required, opts, value, attrName) {
    if (!required || (required && value !== undefined)) {
        return value;
    }
    return Errors.badAttr(attrName, value);
}

function validatorNullable(nullable, opts, value, attrName) {
    if (nullable && value == null) {
        return value;
    }
    if (typeof(nullable) == 'string') {
        return validatorType(nullable, opts, value, attrName);
    }
    if (nullable || (!nullable && value != null)) {
        return value;
    }
    return Errors.badAttr(attrName, value);
}

function validatorEmpty(empty, opts, value, attrName) {
    if (empty || (!empty && value != null && value !== '')) {
        return value;
    }
    return Errors.badAttr(attrName, value);
}

var validators = {
    type:       validatorType,
    array:      validatorArray,
    len:        validatorLength,
    of:         validatorOf,
    notOf:      validatorNotOf,
    fn:         validatorFunction,
    range:      validatorRange,
    presence:   validatorPresence,
    required:   validatorRequired,
    nullable:   validatorNullable,
    empty:      validatorEmpty
};

/** @class
 * @description Stub class for nested schema
 */
var NestedSchema = Class({
    constructor: function (schema) {
        this.schema = schema;
    }
});

/** @function
 * @description Validates a single value
 *
 * @param validator   Validator used for validation. It can be one of
 *                       - a function: it must be of "function (value, attrName)" which
 *                                     validates the value and returns normalized value
 *                       - an object: it contains all validation keys registered in "validators"
 *                       - true: the value should equal to (==) true
 *                       - false: the value should equal to (==) false
 *                       - other values: the value is not validated and returned immediately
 * @param value   The value to be validated
 * @param opts    Optional options, if it is string, it represents "attr":
 *                    - attr: the prefix of attribute name used in validation error;
 *                    - throws: throw error instead of returning error.
 *
 * @returns The normalized value.
 */
function validate(validator, value, opts) {
    typeof(opts) == 'string' && (opts = { attr: opts }) || opts || (opts = {});

    if (validator instanceof NestedSchema) {
        value = accept(validator.schema, value, { attr: opts.attr, all: opts.all });
    } else if (Array.isArray(validator)) {
        value = validatorOf(validator, {}, value, opts.attr);
    } else if (validator === String) {
        value = validatorType('string', {}, value, opts.attr);
    } else if (validator === Number) {
        value = validatorType('number', {}, value, opts.attr);
    } else if (validator === Boolean) {
        value = validatorType('boolean', {}, value, opts.attr);
    } else if (validator === Array) {
        value = validatorType('array', {}, value, opts.attr);
    } else if (validator === false) {
        validator && (value = Errors.badAttr(attrName, value));
    } else if (validator === true) {
        validator || (value = Errors.badAttr(attrName, value));
    } else if (typeof(validator) == 'string') {
        value = validatorType(validator, {}, value, opts.attr);
    } else if (typeof(validator) == 'function') {
        value = validatorType(validator, {}, value, opts.attr);
    } else if (typeof(validator) == 'object') {
        for (var key in validator) {
            if (validators[key]) {
                value = validators[key](validator[key], validator, value, opts.attr);
                if (value instanceof Error) {
                    break;
                }
            }
        }
    }

    if (opts.throws && (value instanceof Error)) {
        throw value;
    }

    return value;
}

/** @function
 * @description Validate and extract properties from an object
 *
 * @param output   The output object to store the extracted properties
 * @param schema   The schema
 * @param data     The source data object
 * @param opts     Optional options, if it is string, it represents "attr":
 *                      - attr: the prefix of attribute name used in validation error;
 *                      - all: including attributes undefined in schema;
 *                      - throws: throw error instead of return error.
 *
 * @returns  The same instance of "output"
 */
function merge(output, schema, data, opts) {
    typeof(opts) == 'string' && (opts = { attr: opts }) || opts || (opts = {});
    var attrName = opts.attr ? opts.attr + '.' : '';

    for (var attr in schema) {
        var val = validate(schema[attr], data[attr], { attr: attrName + attr, all: opts.all, throws: opts.throws });
        if (val instanceof Error) {
            return val;
        }
        output[attr] = val;
    }

    if (opts.all) {
        for (var key in data) {
            schema[key] === undefined && (output[key] = data[key]);
        }
    }

    return output;
}

/** @function
 * @description A simplified version of merge
 */
function accept(schema, data, opts) {
    return merge({}, schema, data, opts);
}

/** @function
 * @description The helper function to create nested schema
 */
function nest(schema) {
    return new NestedSchema(schema);
}

module.exports = {
    types:      types,
    validators: validators,
    validate:   validate,
    merge:      merge,
    accept:     accept,
    nest:       nest
};