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

function noSupport(action, properties) {
    return make('NOTSUPP', _merge({
        message: 'Operation not supported: ' + action,
    }, properties, true));
}

function killed(signal, properties) {
    return make('KILLED', _merge({
        message: 'Killed: ' + signal,
        signal: signal
    }, properties, true));
}

function exited(code, properties) {
    return make('EXITED', _merge({
        message: 'Exited: ' + code,
        code: code
    }, properties, true));
}

function procExit(code, signal, properties) {
    return code == null ? killed(signal, properties) : exited(code, properties);
}

function aborted(properties) {
    return make('ABORTED', _merge({
        message: 'Aborted'
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

function badParam(paramName, properties) {
    return make('BADPARAM', _merge({
        message: 'Invalid parameter: ' + paramName,
        param: paramName
    }, properties, true));
}

module.exports = {
    make:       make,
    wrap:       wrap,
    conflict:   conflict,
    nonexist:   nonexist,
    noSupport:  noSupport,
    exited:     exited,
    killed:     killed,
    procExit:   procExit,
    aborted:    aborted,
    noAttr:     noAttr,
    badAttr:    badAttr,
    badParam:   badParam
};