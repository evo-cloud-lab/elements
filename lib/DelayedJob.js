var Class = require('js-class');

module.exports = Class({
    constructor: function (jobFn, defaultDelay) {
        this._jobFn = jobFn;
        this._async = jobFn.length > 0;
        defaultDelay = parseInt(defaultDelay);
        this._delay = isNaN(defaultDelay) ? 0 : defaultDelay;
    },

    get async () {
        return this._async;
    },

    get defaultDelay () {
        return this._delay;
    },

    get scheduled () {
        return this._pendingSchedule != null || this._timer != null;
    },

    get running () {
        return this._busy;
    },

    schedule: function (delay) {
        if (!this.scheduled) {
            delay = parseInt(delay);
            if (isNaN(delay)) {
                delay = this._delay;
            }
            if (this._busy) {
                this._pendingSchedule = delay;
            } else {
                this._timer = setTimeout(this._runner.bind(this), delay);
            }
        }
        return this;
    },

    reschedule: function (delay) {
        this.cancel();
        return this.schedule(delay);
    },

    cancel: function () {
        if (this._pendingSchedule) {
            delete this._pendingSchedule;
        }
        if (this._timer) {
            clearTimeout(this._timer);
            delete this._timer;
        }
        return this;
    },

    _runner: function () {
        this._busy = true;
        delete this._timer;
        if (this._async) {
            this._jobFn.call(this, this._jobComplete.bind(this));
        } else {
            this._jobFn.call(this);
            this._jobComplete();
        }
    },

    _jobComplete: function () {
        if (this._pendingSchedule != null) {
            this._timer = setTimeout(this._runner.bind(this), this._pendingSchedule);
            delete this._pendingSchedule;
        }
        delete this._busy;
    }
});