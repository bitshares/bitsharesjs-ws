let WebSocketClient;
if (typeof WebSocket === "undefined" && !process.env.browser) {
    WebSocketClient = require("ws");
} else if (typeof(WebSocket) !== "undefined" && typeof document !== "undefined") {
    WebSocketClient = require("ReconnectingWebSocket")
} else {
    WebSocketClient = WebSocket;
}

var SOCKET_DEBUG = false;

class ChainWebSocket {

    constructor(ws_server, statusCb, connectTimeout = 4000) {
        this.statusCb = statusCb;
        this.connectionTimeout = setTimeout(() => {
            if (this.current_reject) this.current_reject(new Error("Connection attempt timed out: " + ws_server));
        }, connectTimeout);
        try {
            this.ws = new WebSocketClient(ws_server);
        } catch (error) {
            console.error("invalid websocket URL:", error, ws_server);
            this.ws = new WebSocketClient("wss://127.0.0.1:8090");
        }
        this.ws.timeoutInterval = 5000;
        this.current_reject = null;
        this.on_reconnect = null;
        this.connect_promise = new Promise((resolve, reject) => {
            this.current_reject = reject;
            this.ws.onopen = () => {
                clearTimeout(this.connectionTimeout);
                if(this.statusCb) this.statusCb("open");
                if(this.on_reconnect) this.on_reconnect();
                resolve();
            }
            this.ws.onerror = (error) => {
                clearTimeout(this.connectionTimeout);
                if(this.statusCb) this.statusCb("error");

                if (this.current_reject) {
                    this.current_reject(error);
                }
            };
            this.ws.onmessage = (message) => this.listener(JSON.parse(message.data));
            this.ws.onclose = () => {
                if(this.statusCb) this.statusCb("closed");
            };
        });
        this.cbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    call(params) {
        let method = params[1];
        if(SOCKET_DEBUG)
            console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId+1), JSON.stringify(params));

        this.cbId += 1;

        if (method === "set_subscribe_callback" || method === "subscribe_to_market" ||
            method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback"
            )
        {
            // Store callback in subs map
            this.subs[this.cbId] = {
                callback: params[2][0]
            };

            // Replace callback with the callback id
            params[2][0] = this.cbId;
        }

        if( method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
            if (typeof params[2][0] !== "function") {
                throw new Error("First parameter of unsub must be the original callback");
            }

            let unSubCb = params[2].splice(0, 1)[0];

            // Find the corresponding subscription
            for (let id in this.subs) {
                if (this.subs[id].callback === unSubCb) {
                    this.unsub[this.cbId] = id;
                    break;
                }
            }
        }

        var request = {
            method: "call",
            params: params
        };
        request.id = this.cbId;

        return new Promise((resolve, reject) => {
            this.cbs[this.cbId] = {
                time: new Date(),
                resolve: resolve,
                reject: reject
            };
            this.ws.onerror = (error) => {
                console.log("!!! ChainWebSocket Error ", error);
                reject(error);
            };
            this.ws.send(JSON.stringify(request));
        });

    }

    listener(response) {
        if(SOCKET_DEBUG)
            console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

        let sub = false,
            callback = null;

        if (response.method === "notice") {
            sub = true;
            response.id = response.params[0];
        }

        if (!sub) {
            callback = this.cbs[response.id];
        } else {
            callback = this.subs[response.id].callback;
        }

        if (callback && !sub) {
            if (response.error) {
                callback.reject(response.error);
            } else {
                callback.resolve(response.result);
            }
            delete this.cbs[response.id];

            if (this.unsub[response.id]) {
                delete this.subs[this.unsub[response.id]];
                delete this.unsub[response.id];
            }

        } else if (callback && sub) {
            callback(response.params[1]);
        } else {
            console.log("Warning: unknown websocket response: ", response);
        }
    }

    login(user, password) {
        return this.connect_promise.then(() => {
            return this.call([1, "login", [user, password]]);
        });
    }

    close() {
        this.ws.close();
    }
}

export default ChainWebSocket;
