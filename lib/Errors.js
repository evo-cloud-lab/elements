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

function aggregate(errors, properties) {
    return make('ERRORS', _merge({
        message: 'Multiple errors',
        errors: errors
    }, properties, true));
}

// here are commonly used errors
function conflict(id, properties) {
    return make('CONFLICT', _merge({
        message: 'Object conflict: ' + id,
        id: id,
        'http-status': 409
    }, properties, true));
}

function nonexist(id, properties) {
    return make('NONEXIST', _merge({
        message: 'Object not found: ' + id,
        id: id,
        'http-status': 404
    }, properties, true));
}

function unavail(resource, properties) {
    return make('UNAVAIL', _merge({
        message: 'Resource unavailable: ' + resource,
        resource: resource,
        'http-status': 412
    }, properties, true));
}

function noSupport(action, properties) {
    return make('NOTSUPP', _merge({
        message: 'Not supported: ' + action,
        'http-status': 400
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
        attr: attrName,
        'http-status': 400
    }, properties, true));
}

function badAttr(attrName, value, properties) {
    return make('BADATTR', _merge({
        message: 'Invalid attribute value: ' + attrName + '=' + value,
        attr: attrName,
        value: value,
        'http-status': 400
    }, properties, true));
}

function badParam(paramName, properties) {
    return make('BADPARAM', _merge({
        message: 'Invalid parameter: ' + paramName,
        param: paramName,
        'http-status': 400
    }, properties, true));
}

function badState(state, expected, properties) {
    return make('BADSTATE', _merge({
        message: 'Bad state: ' + state,
        state: state,
        expected: expected,
        'http-status': 400
    }, properties, true));
}

module.exports = {
    make:       make,
    wrap:       wrap,
    aggregate:  aggregate,
    conflict:   conflict,
    nonexist:   nonexist,
    unavail:    unavail,
    noSupport:  noSupport,
    exited:     exited,
    killed:     killed,
    procExit:   procExit,
    aborted:    aborted,
    noAttr:     noAttr,
    badAttr:    badAttr,
    badParam:   badParam,
    badState:   badState
};