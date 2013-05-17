var debug = require('debug');

module.exports = function (name) {
    var trace = {
        error:   debug(name + '[E]'),
        warn:    debug(name + '[W]'),
        info:    debug(name + '[I]'),
        verbose: debug(name + '[V]'),
        debug:   debug(name + '[D]'),
    };
    trace.err = trace.error;
    trace.log = trace.info;
    trace.verb = trace.verbose;
    trace.dbg = trace.debug;
    return trace;
};