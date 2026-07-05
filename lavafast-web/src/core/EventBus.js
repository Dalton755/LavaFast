class EventBus {

    constructor() {

        this.events = {};

    }

    on(event, callback) {

        if (!this.events[event]) {

            this.events[event] = [];

        }

        this.events[event].push(callback);

    }

    off(event, callback) {

        if (!this.events[event]) {

            return;

        }

        this.events[event] = this.events[event].filter(

            item => item !== callback

        );

    }

    emit(event, payload) {

        if (!this.events[event]) {

            return;

        }

        this.events[event].forEach(callback => {

            callback(payload);

        });

    }

}

export default new EventBus();