var Class = require('js-class');

module.exports = Class({
    constructor: function (jobFn, defaultDelay) {
        this.jobFn = jobFn;
        defaultDelay = parseInt(defaultDelay);
        this.defaultDelay = isNaN(defaultDelay) ? 0 : defaultDelay;
    },
    
    schedule: function (delay) {
        if (!this.timer) {
            delay = parseInt(delay);
            if (isNaN(delay)) {
                delay = this.defaultDelay;
            }
            this.timer = setTimeout(function () {
                delete this.timer;
                this.jobFn();
            }.bind(this), delay);
        }
        return this;
    },
    
    cancel: function () {
        if (this.timer) {
            clearTimeout(this.timer);
            delete this.timer;
        }
        return this;
    }
});