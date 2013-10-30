/** @fileoverview
 * Unified error generator
 */

function _merge(dest, source, withMessage) {
    typeof(source) == 'object' && Object.keys(source).forEach(function (key) {
        (withMessage || key != 'message') && (dest[key] = source[key]);
    });
    return dest;
}

function make(code, properties) {
    var message = properties && properties.message || '';
    var err = new Error(message);
    err.code = code;
    return _merge(err, properties);
}

function wrap(err, code, properties) {
    err.code = code;
    return _merge(err, properties, true);
}

// here are commonly used errors
function conflict(id, properties) {
    return make('CONFLICT', _merge({
        message: 'Object conflict: ' + id,
        id: id
    }, properties, true));
}

function nonexist(id, properties) {
    return make('NONEXIST', _merge({
        message: 'Object not found: ' + id,
        id: id
    }, properties, true));
}

function noAttr(attrName, properties) {
    return make('NOATTR', _merge({
        message: 'Missing attribute: ' + attrName,
        attr: attrName
    }, properties, true));
}

function badAttr(attrName, value, properties) {
    return make('BADATTR', _merge({
        message: 'Invalid attribute value: ' + attrName + '=' + value,
        attr: attrName,
        value: value
    }, properties, true));
}

module.exports = {
    make:       make,
    wrap:       wrap,
    conflict:   conflict,
    nonexist:   nonexist,
    noAttr:     noAttr,
    badAttr:    badAttr
};