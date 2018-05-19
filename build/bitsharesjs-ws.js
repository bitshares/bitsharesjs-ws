(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.bitshares_ws = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
"use strict";

exports.__esModule = true;

var _ChainWebSocket = require("./ChainWebSocket");

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GrapheneApi = require("./GrapheneApi");

var _GrapheneApi2 = _interopRequireDefault(_GrapheneApi);

var _ChainConfig = require("./ChainConfig");

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // var { List } = require("immutable");


if (global) {
    global.inst = "";
} else {
    var _inst = void 0;
};
var autoReconnect = false; // by default don't use reconnecting-websocket
/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
*/

exports.default = {

    setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
        if (inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
        @arg {boolean} auto means automatic reconnect if possible( browser case), default true
    */
    setAutoReconnect: function setAutoReconnect(auto) {
        autoReconnect = auto;
    },

    /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    reset: function reset() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

        var _this = this;

        var optionalApis = arguments[3];
        var closeCb = arguments[4];

        return this.close().then(function () {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(_this.statusCb);

            if (inst && connect) {
                inst.connect(cs, connectTimeout, optionalApis, closeCb);
            }

            return inst;
        });
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;
        var optionalApis = arguments[3];
        var closeCb = arguments[4];

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs, connectTimeout, optionalApis);
        }
        if (closeCb) inst.closeCb = closeCb;
        return inst;
    },
    chainId: function chainId() {
        return Apis.instance().chain_id;
    },

    close: function close() {
        if (inst) {
            return new Promise(function (res) {
                inst.close().then(function () {
                    inst = null;
                    res();
                });
            });
        }

        return Promise.resolve();
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
    // orders: (method, ...args) => Apis.instance().orders_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);
    }

    /** @arg {string} connection .. */
    ApisInstance.prototype.connect = function connect(cs, connectTimeout) {
        var _this2 = this;

        var optionalApis = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : { enableCrypto: false, enableOrders: false };

        // console.log("INFO\tApiInstances\tconnect\t", cs);
        this.url = cs;
        var rpc_user = "",
            rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        if (this.ws_rpc) {
            this.ws_rpc.statusCb = null;
        }
        this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb, connectTimeout, autoReconnect, function (closed) {
            if (_this2._db && !closed) {
                _this2._db.exec('get_objects', [['2.1.0']]).catch(function (e) {});
            }
        });
        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
            console.log("Connected to API node:", cs);
            _this2._db = new _GrapheneApi2.default(_this2.ws_rpc, "database");
            _this2._net = new _GrapheneApi2.default(_this2.ws_rpc, "network_broadcast");
            _this2._hist = new _GrapheneApi2.default(_this2.ws_rpc, "history");
            if (optionalApis.enableOrders) _this2._orders = new _GrapheneApi2.default(_this2.ws_rpc, "orders");
            if (optionalApis.enableCrypto) _this2._crypt = new _GrapheneApi2.default(_this2.ws_rpc, "crypto");
            var db_promise = _this2._db.init().then(function () {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return _this2._db.exec("get_chain_id", []).then(function (_chain_id) {
                    _this2.chain_id = _chain_id;
                    return _ChainConfig2.default.setChainId(_chain_id);
                    //DEBUG console.log("chain_id1",this.chain_id)
                });
            });
            _this2.ws_rpc.on_reconnect = function () {
                if (!_this2.ws_rpc) return;
                _this2.ws_rpc.login("", "").then(function () {
                    _this2._db.init().then(function () {
                        if (_this2.statusCb) _this2.statusCb("reconnect");
                    });
                    _this2._net.init();
                    _this2._hist.init();
                    if (optionalApis.enableOrders) _this2._orders.init();
                    if (optionalApis.enableCrypto) _this2._crypt.init();
                });
            };
            _this2.ws_rpc.on_close = function () {
                _this2.close().then(function () {
                    if (_this2.closeCb) _this2.closeCb();
                });
            };
            var initPromises = [db_promise, _this2._net.init(), _this2._hist.init()];

            if (optionalApis.enableOrders) initPromises.push(_this2._orders.init());
            if (optionalApis.enableCrypto) initPromises.push(_this2._crypt.init());
            return Promise.all(initPromises);
        }).catch(function (err) {
            console.error(cs, "Failed to initialize with error", err && err.message);
            return _this2.close().then(function () {
                throw err;
            });
        });
    };

    ApisInstance.prototype.close = function close() {
        var _this3 = this;

        if (this.ws_rpc && this.ws_rpc.ws.readyState === 1) {
            return this.ws_rpc.close().then(function () {
                _this3.ws_rpc = null;
            });
        };
        this.ws_rpc = null;
        return Promise.resolve();
    };

    ApisInstance.prototype.db_api = function db_api() {
        return this._db;
    };

    ApisInstance.prototype.network_api = function network_api() {
        return this._net;
    };

    ApisInstance.prototype.history_api = function history_api() {
        return this._hist;
    };

    ApisInstance.prototype.crypto_api = function crypto_api() {
        return this._crypt;
    };

    ApisInstance.prototype.orders_api = function orders_api() {
        return this._orders;
    };

    ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    };

    return ApisInstance;
}();

module.exports = exports["default"];
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./ChainConfig":2,"./ChainWebSocket":3,"./GrapheneApi":4}],2:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;
var _this = void 0;

var ecc_config = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "GPH"
};

_this = {
    core_asset: "CORE",
    address_prefix: "GPH",
    expire_in_secs: 15,
    expire_in_secs_proposal: 24 * 60 * 60,
    review_in_secs_committee: 24 * 60 * 60,
    networks: {
        BitShares: {
            core_asset: "BTS",
            address_prefix: "BTS",
            chain_id: "4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8"
        },
        Muse: {
            core_asset: "MUSE",
            address_prefix: "MUSE",
            chain_id: "45ad2d3f9ef92a49b55c2227eb06123f613bb35dd08bd876f2aea21925a67a67"
        },
        Test: {
            core_asset: "TEST",
            address_prefix: "TEST",
            chain_id: "39f5e2ede1f8bc1a3a54a7914414e3779e33193f1f5693510e73cb7a87617447"
        },
        Obelisk: {
            core_asset: "GOV",
            address_prefix: "FEW",
            chain_id: "1cfde7c388b9e8ac06462d68aadbd966b58f88797637d9af805b4560b0e9661e"
        }
    },

    /** Set a few properties for known chain IDs. */
    setChainId: function setChainId(chain_id) {

        var i = void 0,
            len = void 0,
            network = void 0,
            network_name = void 0,
            ref = void 0;
        ref = Object.keys(_this.networks);

        for (i = 0, len = ref.length; i < len; i++) {

            network_name = ref[i];
            network = _this.networks[network_name];

            if (network.chain_id === chain_id) {

                _this.network_name = network_name;

                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                    ecc_config.address_prefix = network.address_prefix;
                }

                // console.log("INFO    Configured for", network_name, ":", network.core_asset, "\n");

                return {
                    network_name: network_name,
                    network: network
                };
            }
        }

        if (!_this.network_name) {
            console.log("Unknown chain id (this may be a testnet)", chain_id);
        }
    },

    reset: function reset() {
        _this.core_asset = "CORE";
        _this.address_prefix = "GPH";
        ecc_config.address_prefix = "GPH";
        _this.expire_in_secs = 15;
        _this.expire_in_secs_proposal = 24 * 60 * 60;

        console.log("Chain config reset");
    },

    setPrefix: function setPrefix() {
        var prefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "GPH";

        _this.address_prefix = prefix;
        ecc_config.address_prefix = prefix;
    }
};

exports.default = _this;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"_process":6}],3:[function(require,module,exports){
(function (process){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebSocketClient = void 0;
if (typeof WebSocket === "undefined" && !process.env.browser) {
    WebSocketClient = require("ws");
} else {
    WebSocketClient = WebSocket;
}

var SOCKET_DEBUG = false;

function getWebSocketClient(autoReconnect) {
    if (!autoReconnect && typeof WebSocket !== "undefined" && typeof document !== "undefined") {
        return WebSocket;
    }
    return WebSocketClient;
}

var keep_alive_interval = 5000;
var max_send_life = 5;
var max_recv_life = max_send_life * 2;

var ChainWebSocket = function () {
    function ChainWebSocket(ws_server, statusCb) {
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5000;

        var _this = this;

        var autoReconnect = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;
        var keepAliveCb = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;

        _classCallCheck(this, ChainWebSocket);

        this.url = ws_server;
        this.statusCb = statusCb;
        this.connectionTimeout = setTimeout(function () {
            if (_this.current_reject) {
                var reject = _this.current_reject;
                _this.current_reject = null;
                _this.close();
                reject(new Error("Connection attempt timed out after " + connectTimeout / 1000 + "s"));
            }
        }, connectTimeout);

        this.current_reject = null;
        this.on_reconnect = null;
        this.closed = false;
        this.send_life = max_send_life;
        this.recv_life = max_recv_life;
        this.keepAliveCb = keepAliveCb;
        this.connect_promise = new Promise(function (resolve, reject) {
            _this.current_reject = reject;
            var WsClient = getWebSocketClient(autoReconnect);
            try {
                _this.ws = new WsClient(ws_server);
            } catch (error) {
                _this.ws = { readyState: 3, close: function close() {} }; // DISCONNECTED
                reject(new Error("Invalid url", ws_server, " closed"));
                // return this.close().then(() => {
                //     console.log("Invalid url", ws_server, " closed");
                //     // throw new Error("Invalid url", ws_server, " closed")
                //     // return this.current_reject(Error("Invalid websocket url: " + ws_server));
                // })
            }

            _this.ws.onopen = function () {
                clearTimeout(_this.connectionTimeout);
                if (_this.statusCb) _this.statusCb("open");
                if (_this.on_reconnect) _this.on_reconnect();
                _this.keepalive_timer = setInterval(function () {

                    _this.recv_life--;
                    if (_this.recv_life == 0) {
                        console.error(_this.url + ' connection is dead, terminating ws');
                        _this.close();
                        // clearInterval(this.keepalive_timer);
                        // this.keepalive_timer = undefined;
                        return;
                    }
                    _this.send_life--;
                    if (_this.send_life == 0) {
                        // this.ws.ping('', false, true);
                        if (_this.keepAliveCb) {
                            _this.keepAliveCb(_this.closed);
                        }
                        _this.send_life = max_send_life;
                    }
                }, 5000);
                _this.current_reject = null;
                resolve();
            };
            _this.ws.onerror = function (error) {
                if (_this.keepalive_timer) {
                    clearInterval(_this.keepalive_timer);
                    _this.keepalive_timer = undefined;
                }
                clearTimeout(_this.connectionTimeout);
                if (_this.statusCb) _this.statusCb("error");

                if (_this.current_reject) {
                    _this.current_reject(error);
                }
            };
            _this.ws.onmessage = function (message) {
                _this.recv_life = max_recv_life;
                _this.listener(JSON.parse(message.data));
            };
            _this.ws.onclose = function () {
                _this.closed = true;
                if (_this.keepalive_timer) {
                    clearInterval(_this.keepalive_timer);
                    _this.keepalive_timer = undefined;
                }
                var err = new Error('connection closed');
                for (var cbId = _this.responseCbId + 1; cbId <= _this.cbId; cbId += 1) {
                    _this.cbs[cbId].reject(err);
                }
                if (_this.statusCb) _this.statusCb("closed");
                if (_this._closeCb) _this._closeCb();
                if (_this.on_close) _this.on_close();
            };
        });
        this.cbId = 0;
        this.responseCbId = 0;
        this.cbs = {};
        this.subs = {};
        this.unsub = {};
    }

    ChainWebSocket.prototype.call = function call(params) {
        var _this2 = this;

        if (this.ws.readyState !== 1) {
            return Promise.reject(new Error('websocket state error:' + this.ws.readyState));
        }
        var method = params[1];
        if (SOCKET_DEBUG) console.log("[ChainWebSocket] >---- call ----->  \"id\":" + (this.cbId + 1), JSON.stringify(params));

        this.cbId += 1;

        if (method === "set_subscribe_callback" || method === "subscribe_to_market" || method === "broadcast_transaction_with_callback" || method === "set_pending_transaction_callback") {
            // Store callback in subs map
            this.subs[this.cbId] = {
                callback: params[2][0]
            };

            // Replace callback with the callback id
            params[2][0] = this.cbId;
        }

        if (method === "unsubscribe_from_market" || method === "unsubscribe_from_accounts") {
            if (typeof params[2][0] !== "function") {
                throw new Error("First parameter of unsub must be the original callback");
            }

            var unSubCb = params[2].splice(0, 1)[0];

            // Find the corresponding subscription
            for (var id in this.subs) {
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
        this.send_life = max_send_life;

        return new Promise(function (resolve, reject) {
            _this2.cbs[_this2.cbId] = {
                time: new Date(),
                resolve: resolve,
                reject: reject
            };
            _this2.ws.send(JSON.stringify(request));
        });
    };

    ChainWebSocket.prototype.listener = function listener(response) {
        if (SOCKET_DEBUG) console.log("[ChainWebSocket] <---- reply ----<", JSON.stringify(response));

        var sub = false,
            callback = null;

        if (response.method === "notice") {
            sub = true;
            response.id = response.params[0];
        }

        if (!sub) {
            callback = this.cbs[response.id];
            this.responseCbId = response.id;
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
    };

    ChainWebSocket.prototype.login = function login(user, password) {
        var _this3 = this;

        return this.connect_promise.then(function () {
            return _this3.call([1, "login", [user, password]]);
        });
    };

    ChainWebSocket.prototype.close = function close() {
        var _this4 = this;

        return new Promise(function (res) {
            clearInterval(_this4.keepalive_timer);
            _this4.keepalive_timer = undefined;
            _this4._closeCb = function () {
                res();
                _this4._closeCb = null;
            };
            if (!_this4.ws) {
                console.log("Websocket already cleared", _this4);
                return res();
            }
            if (_this4.ws.terminate) {
                _this4.ws.terminate();
            } else {
                _this4.ws.close();
            }
            if (_this4.ws.readyState === 3) res();
        });
    };

    return ChainWebSocket;
}();

exports.default = ChainWebSocket;
module.exports = exports["default"];
}).call(this,require('_process'))

},{"_process":6,"ws":5}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GrapheneApi = function () {
    function GrapheneApi(ws_rpc, api_name) {
        _classCallCheck(this, GrapheneApi);

        this.ws_rpc = ws_rpc;
        this.api_name = api_name;
    }

    GrapheneApi.prototype.init = function init() {
        var self = this;
        return this.ws_rpc.call([1, this.api_name, []]).then(function (response) {
            //console.log("[GrapheneApi.js:11] ----- GrapheneApi.init ----->", this.api_name, response);
            self.api_id = response;
            return self;
        });
    };

    GrapheneApi.prototype.exec = function exec(method, params) {
        return this.ws_rpc.call([this.api_id, method, params]).catch(function (error) {
            // console.log("!!! GrapheneApi error: ", method, params, error, JSON.stringify(error));
            throw error;
        });
    };

    return GrapheneApi;
}();

exports.default = GrapheneApi;
module.exports = exports["default"];
},{}],5:[function(require,module,exports){

},{}],6:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1])(1)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjanMvc3JjL0FwaUluc3RhbmNlcy5qcyIsImNqcy9zcmMvQ2hhaW5Db25maWcuanMiLCJjanMvc3JjL0NoYWluV2ViU29ja2V0LmpzIiwiY2pzL3NyYy9HcmFwaGVuZUFwaS5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCJub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3BPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNuUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX0NoYWluV2ViU29ja2V0ID0gcmVxdWlyZShcIi4vQ2hhaW5XZWJTb2NrZXRcIik7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5XZWJTb2NrZXQpO1xuXG52YXIgX0dyYXBoZW5lQXBpID0gcmVxdWlyZShcIi4vR3JhcGhlbmVBcGlcIik7XG5cbnZhciBfR3JhcGhlbmVBcGkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfR3JhcGhlbmVBcGkpO1xuXG52YXIgX0NoYWluQ29uZmlnID0gcmVxdWlyZShcIi4vQ2hhaW5Db25maWdcIik7XG5cbnZhciBfQ2hhaW5Db25maWcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5Db25maWcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfSAvLyB2YXIgeyBMaXN0IH0gPSByZXF1aXJlKFwiaW1tdXRhYmxlXCIpO1xuXG5cbmlmIChnbG9iYWwpIHtcbiAgICBnbG9iYWwuaW5zdCA9IFwiXCI7XG59IGVsc2Uge1xuICAgIHZhciBfaW5zdCA9IHZvaWQgMDtcbn07XG52YXIgYXV0b1JlY29ubmVjdCA9IGZhbHNlOyAvLyBieSBkZWZhdWx0IGRvbid0IHVzZSByZWNvbm5lY3Rpbmctd2Vic29ja2V0XG4vKipcbiAgICBDb25maWd1cmU6IGNvbmZpZ3VyZSBhcyBmb2xsb3dzIGBBcGlzLmluc3RhbmNlKFwid3M6Ly9sb2NhbGhvc3Q6ODA5MFwiKS5pbml0X3Byb21pc2VgLiAgVGhpcyByZXR1cm5zIGEgcHJvbWlzZSwgb25jZSByZXNvbHZlZCB0aGUgY29ubmVjdGlvbiBpcyByZWFkeS5cblxuICAgIEltcG9ydDogaW1wb3J0IHsgQXBpcyB9IGZyb20gXCJAZ3JhcGhlbmUvY2hhaW5cIlxuXG4gICAgU2hvcnQtaGFuZDogQXBpcy5kYihcIm1ldGhvZFwiLCBcInBhcm0xXCIsIDIsIDMsIC4uLikuICBSZXR1cm5zIGEgcHJvbWlzZSB3aXRoIHJlc3VsdHMuXG5cbiAgICBBZGRpdGlvbmFsIHVzYWdlOiBBcGlzLmluc3RhbmNlKCkuZGJfYXBpKCkuZXhlYyhcIm1ldGhvZFwiLCBbXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi5dKS4gIFJldHVybnMgYSBwcm9taXNlIHdpdGggcmVzdWx0cy5cbiovXG5cbmV4cG9ydHMuZGVmYXVsdCA9IHtcblxuICAgIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjazogZnVuY3Rpb24gc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcbiAgICAgICAgaWYgKGluc3QpIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICAgIEBhcmcge2Jvb2xlYW59IGF1dG8gbWVhbnMgYXV0b21hdGljIHJlY29ubmVjdCBpZiBwb3NzaWJsZSggYnJvd3NlciBjYXNlKSwgZGVmYXVsdCB0cnVlXG4gICAgKi9cbiAgICBzZXRBdXRvUmVjb25uZWN0OiBmdW5jdGlvbiBzZXRBdXRvUmVjb25uZWN0KGF1dG8pIHtcbiAgICAgICAgYXV0b1JlY29ubmVjdCA9IGF1dG87XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAgICBAYXJnIHtzdHJpbmd9IGNzIGlzIG9ubHkgcHJvdmlkZWQgaW4gdGhlIGZpcnN0IGNhbGxcbiAgICAgICAgQHJldHVybiB7QXBpc30gc2luZ2xldG9uIC4uIENoZWNrIEFwaXMuaW5zdGFuY2UoKS5pbml0X3Byb21pc2UgdG8ga25vdyB3aGVuIHRoZSBjb25uZWN0aW9uIGlzIGVzdGFibGlzaGVkXG4gICAgKi9cbiAgICByZXNldDogZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgICAgIHZhciBjcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogXCJ3czovL2xvY2FsaG9zdDo4MDkwXCI7XG4gICAgICAgIHZhciBjb25uZWN0ID0gYXJndW1lbnRzWzFdO1xuICAgICAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDQwMDA7XG5cbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICB2YXIgb3B0aW9uYWxBcGlzID0gYXJndW1lbnRzWzNdO1xuICAgICAgICB2YXIgY2xvc2VDYiA9IGFyZ3VtZW50c1s0XTtcblxuICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBBcGlzSW5zdGFuY2UoKTtcbiAgICAgICAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKF90aGlzLnN0YXR1c0NiKTtcblxuICAgICAgICAgICAgaWYgKGluc3QgJiYgY29ubmVjdCkge1xuICAgICAgICAgICAgICAgIGluc3QuY29ubmVjdChjcywgY29ubmVjdFRpbWVvdXQsIG9wdGlvbmFsQXBpcywgY2xvc2VDYik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBpbnN0O1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIGluc3RhbmNlOiBmdW5jdGlvbiBpbnN0YW5jZSgpIHtcbiAgICAgICAgdmFyIGNzID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiBcIndzOi8vbG9jYWxob3N0OjgwOTBcIjtcbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcbiAgICAgICAgdmFyIG9wdGlvbmFsQXBpcyA9IGFyZ3VtZW50c1szXTtcbiAgICAgICAgdmFyIGNsb3NlQ2IgPSBhcmd1bWVudHNbNF07XG5cbiAgICAgICAgaWYgKCFpbnN0KSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IEFwaXNJbnN0YW5jZSgpO1xuICAgICAgICAgICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICAgICAgICBpbnN0LmNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0LCBvcHRpb25hbEFwaXMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjbG9zZUNiKSBpbnN0LmNsb3NlQ2IgPSBjbG9zZUNiO1xuICAgICAgICByZXR1cm4gaW5zdDtcbiAgICB9LFxuICAgIGNoYWluSWQ6IGZ1bmN0aW9uIGNoYWluSWQoKSB7XG4gICAgICAgIHJldHVybiBBcGlzLmluc3RhbmNlKCkuY2hhaW5faWQ7XG4gICAgfSxcblxuICAgIGNsb3NlOiBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgaWYgKGluc3QpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICAgICAgaW5zdC5jbG9zZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpbnN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgcmVzKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9XG4gICAgLy8gZGI6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5kYl9hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKSxcbiAgICAvLyBuZXR3b3JrOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkubmV0d29ya19hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKSxcbiAgICAvLyBoaXN0b3J5OiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuaGlzdG9yeV9hcGkoKS5leGVjKG1ldGhvZCwgdG9TdHJpbmdzKGFyZ3MpKSxcbiAgICAvLyBjcnlwdG86IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5jcnlwdG9fYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSlcbiAgICAvLyBvcmRlcnM6IChtZXRob2QsIC4uLmFyZ3MpID0+IEFwaXMuaW5zdGFuY2UoKS5vcmRlcnNfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSlcbn07XG5cbnZhciBBcGlzSW5zdGFuY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQXBpc0luc3RhbmNlKCkge1xuICAgICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgQXBpc0luc3RhbmNlKTtcbiAgICB9XG5cbiAgICAvKiogQGFyZyB7c3RyaW5nfSBjb25uZWN0aW9uIC4uICovXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdChjcywgY29ubmVjdFRpbWVvdXQpIHtcbiAgICAgICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICAgICAgdmFyIG9wdGlvbmFsQXBpcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogeyBlbmFibGVDcnlwdG86IGZhbHNlLCBlbmFibGVPcmRlcnM6IGZhbHNlIH07XG5cbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJJTkZPXFx0QXBpSW5zdGFuY2VzXFx0Y29ubmVjdFxcdFwiLCBjcyk7XG4gICAgICAgIHRoaXMudXJsID0gY3M7XG4gICAgICAgIHZhciBycGNfdXNlciA9IFwiXCIsXG4gICAgICAgICAgICBycGNfcGFzc3dvcmQgPSBcIlwiO1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3cubG9jYXRpb24gJiYgd2luZG93LmxvY2F0aW9uLnByb3RvY29sID09PSBcImh0dHBzOlwiICYmIGNzLmluZGV4T2YoXCJ3c3M6Ly9cIikgPCAwKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTZWN1cmUgZG9tYWlucyByZXF1aXJlIHdzcyBjb25uZWN0aW9uXCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMud3NfcnBjKSB7XG4gICAgICAgICAgICB0aGlzLndzX3JwYy5zdGF0dXNDYiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy53c19ycGMgPSBuZXcgX0NoYWluV2ViU29ja2V0Mi5kZWZhdWx0KGNzLCB0aGlzLnN0YXR1c0NiLCBjb25uZWN0VGltZW91dCwgYXV0b1JlY29ubmVjdCwgZnVuY3Rpb24gKGNsb3NlZCkge1xuICAgICAgICAgICAgaWYgKF90aGlzMi5fZGIgJiYgIWNsb3NlZCkge1xuICAgICAgICAgICAgICAgIF90aGlzMi5fZGIuZXhlYygnZ2V0X29iamVjdHMnLCBbWycyLjEuMCddXSkuY2F0Y2goZnVuY3Rpb24gKGUpIHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuaW5pdF9wcm9taXNlID0gdGhpcy53c19ycGMubG9naW4ocnBjX3VzZXIsIHJwY19wYXNzd29yZCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNvbm5lY3RlZCB0byBBUEkgbm9kZTpcIiwgY3MpO1xuICAgICAgICAgICAgX3RoaXMyLl9kYiA9IG5ldyBfR3JhcGhlbmVBcGkyLmRlZmF1bHQoX3RoaXMyLndzX3JwYywgXCJkYXRhYmFzZVwiKTtcbiAgICAgICAgICAgIF90aGlzMi5fbmV0ID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpczIud3NfcnBjLCBcIm5ldHdvcmtfYnJvYWRjYXN0XCIpO1xuICAgICAgICAgICAgX3RoaXMyLl9oaXN0ID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpczIud3NfcnBjLCBcImhpc3RvcnlcIik7XG4gICAgICAgICAgICBpZiAob3B0aW9uYWxBcGlzLmVuYWJsZU9yZGVycykgX3RoaXMyLl9vcmRlcnMgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwib3JkZXJzXCIpO1xuICAgICAgICAgICAgaWYgKG9wdGlvbmFsQXBpcy5lbmFibGVDcnlwdG8pIF90aGlzMi5fY3J5cHQgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwiY3J5cHRvXCIpO1xuICAgICAgICAgICAgdmFyIGRiX3Byb21pc2UgPSBfdGhpczIuX2RiLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvL2h0dHBzOi8vZ2l0aHViLmNvbS9jcnlwdG9ub21leC9ncmFwaGVuZS93aWtpL2NoYWluLWxvY2tlZC10eFxuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpczIuX2RiLmV4ZWMoXCJnZXRfY2hhaW5faWRcIiwgW10pLnRoZW4oZnVuY3Rpb24gKF9jaGFpbl9pZCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpczIuY2hhaW5faWQgPSBfY2hhaW5faWQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfQ2hhaW5Db25maWcyLmRlZmF1bHQuc2V0Q2hhaW5JZChfY2hhaW5faWQpO1xuICAgICAgICAgICAgICAgICAgICAvL0RFQlVHIGNvbnNvbGUubG9nKFwiY2hhaW5faWQxXCIsdGhpcy5jaGFpbl9pZClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgX3RoaXMyLndzX3JwYy5vbl9yZWNvbm5lY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFfdGhpczIud3NfcnBjKSByZXR1cm47XG4gICAgICAgICAgICAgICAgX3RoaXMyLndzX3JwYy5sb2dpbihcIlwiLCBcIlwiKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMyLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMyLnN0YXR1c0NiKSBfdGhpczIuc3RhdHVzQ2IoXCJyZWNvbm5lY3RcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBfdGhpczIuX25ldC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzMi5faGlzdC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25hbEFwaXMuZW5hYmxlT3JkZXJzKSBfdGhpczIuX29yZGVycy5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25hbEFwaXMuZW5hYmxlQ3J5cHRvKSBfdGhpczIuX2NyeXB0LmluaXQoKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBfdGhpczIud3NfcnBjLm9uX2Nsb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIF90aGlzMi5jbG9zZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMyLmNsb3NlQ2IpIF90aGlzMi5jbG9zZUNiKCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGluaXRQcm9taXNlcyA9IFtkYl9wcm9taXNlLCBfdGhpczIuX25ldC5pbml0KCksIF90aGlzMi5faGlzdC5pbml0KCldO1xuXG4gICAgICAgICAgICBpZiAob3B0aW9uYWxBcGlzLmVuYWJsZU9yZGVycykgaW5pdFByb21pc2VzLnB1c2goX3RoaXMyLl9vcmRlcnMuaW5pdCgpKTtcbiAgICAgICAgICAgIGlmIChvcHRpb25hbEFwaXMuZW5hYmxlQ3J5cHRvKSBpbml0UHJvbWlzZXMucHVzaChfdGhpczIuX2NyeXB0LmluaXQoKSk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoaW5pdFByb21pc2VzKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihjcywgXCJGYWlsZWQgdG8gaW5pdGlhbGl6ZSB3aXRoIGVycm9yXCIsIGVyciAmJiBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICByZXR1cm4gX3RoaXMyLmNsb3NlKCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgIGlmICh0aGlzLndzX3JwYyAmJiB0aGlzLndzX3JwYy53cy5yZWFkeVN0YXRlID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy53c19ycGMuY2xvc2UoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfdGhpczMud3NfcnBjID0gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLndzX3JwYyA9IG51bGw7XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5kYl9hcGkgPSBmdW5jdGlvbiBkYl9hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9kYjtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5uZXR3b3JrX2FwaSA9IGZ1bmN0aW9uIG5ldHdvcmtfYXBpKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fbmV0O1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmhpc3RvcnlfYXBpID0gZnVuY3Rpb24gaGlzdG9yeV9hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9oaXN0O1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmNyeXB0b19hcGkgPSBmdW5jdGlvbiBjcnlwdG9fYXBpKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY3J5cHQ7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUub3JkZXJzX2FwaSA9IGZ1bmN0aW9uIG9yZGVyc19hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9vcmRlcnM7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrID0gZnVuY3Rpb24gc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBjYWxsYmFjaztcbiAgICB9O1xuXG4gICAgcmV0dXJuIEFwaXNJbnN0YW5jZTtcbn0oKTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzW1wiZGVmYXVsdFwiXTsiLCJcInVzZSBzdHJpY3RcIjtcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcbnZhciBfdGhpcyA9IHZvaWQgMDtcblxudmFyIGVjY19jb25maWcgPSB7XG4gICAgYWRkcmVzc19wcmVmaXg6IHByb2Nlc3MuZW52Lm5wbV9jb25maWdfX2dyYXBoZW5lX2VjY19kZWZhdWx0X2FkZHJlc3NfcHJlZml4IHx8IFwiR1BIXCJcbn07XG5cbl90aGlzID0ge1xuICAgIGNvcmVfYXNzZXQ6IFwiQ09SRVwiLFxuICAgIGFkZHJlc3NfcHJlZml4OiBcIkdQSFwiLFxuICAgIGV4cGlyZV9pbl9zZWNzOiAxNSxcbiAgICBleHBpcmVfaW5fc2Vjc19wcm9wb3NhbDogMjQgKiA2MCAqIDYwLFxuICAgIHJldmlld19pbl9zZWNzX2NvbW1pdHRlZTogMjQgKiA2MCAqIDYwLFxuICAgIG5ldHdvcmtzOiB7XG4gICAgICAgIEJpdFNoYXJlczoge1xuICAgICAgICAgICAgY29yZV9hc3NldDogXCJCVFNcIixcbiAgICAgICAgICAgIGFkZHJlc3NfcHJlZml4OiBcIkJUU1wiLFxuICAgICAgICAgICAgY2hhaW5faWQ6IFwiNDAxOGQ3ODQ0Yzc4ZjZhNmM0MWM2YTU1MmI4OTgwMjIzMTBmYzVkZWMwNmRhNDY3ZWU3OTA1YThkYWQ1MTJjOFwiXG4gICAgICAgIH0sXG4gICAgICAgIE11c2U6IHtcbiAgICAgICAgICAgIGNvcmVfYXNzZXQ6IFwiTVVTRVwiLFxuICAgICAgICAgICAgYWRkcmVzc19wcmVmaXg6IFwiTVVTRVwiLFxuICAgICAgICAgICAgY2hhaW5faWQ6IFwiNDVhZDJkM2Y5ZWY5MmE0OWI1NWMyMjI3ZWIwNjEyM2Y2MTNiYjM1ZGQwOGJkODc2ZjJhZWEyMTkyNWE2N2E2N1wiXG4gICAgICAgIH0sXG4gICAgICAgIFRlc3Q6IHtcbiAgICAgICAgICAgIGNvcmVfYXNzZXQ6IFwiVEVTVFwiLFxuICAgICAgICAgICAgYWRkcmVzc19wcmVmaXg6IFwiVEVTVFwiLFxuICAgICAgICAgICAgY2hhaW5faWQ6IFwiMzlmNWUyZWRlMWY4YmMxYTNhNTRhNzkxNDQxNGUzNzc5ZTMzMTkzZjFmNTY5MzUxMGU3M2NiN2E4NzYxNzQ0N1wiXG4gICAgICAgIH0sXG4gICAgICAgIE9iZWxpc2s6IHtcbiAgICAgICAgICAgIGNvcmVfYXNzZXQ6IFwiR09WXCIsXG4gICAgICAgICAgICBhZGRyZXNzX3ByZWZpeDogXCJGRVdcIixcbiAgICAgICAgICAgIGNoYWluX2lkOiBcIjFjZmRlN2MzODhiOWU4YWMwNjQ2MmQ2OGFhZGJkOTY2YjU4Zjg4Nzk3NjM3ZDlhZjgwNWI0NTYwYjBlOTY2MWVcIlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKiBTZXQgYSBmZXcgcHJvcGVydGllcyBmb3Iga25vd24gY2hhaW4gSURzLiAqL1xuICAgIHNldENoYWluSWQ6IGZ1bmN0aW9uIHNldENoYWluSWQoY2hhaW5faWQpIHtcblxuICAgICAgICB2YXIgaSA9IHZvaWQgMCxcbiAgICAgICAgICAgIGxlbiA9IHZvaWQgMCxcbiAgICAgICAgICAgIG5ldHdvcmsgPSB2b2lkIDAsXG4gICAgICAgICAgICBuZXR3b3JrX25hbWUgPSB2b2lkIDAsXG4gICAgICAgICAgICByZWYgPSB2b2lkIDA7XG4gICAgICAgIHJlZiA9IE9iamVjdC5rZXlzKF90aGlzLm5ldHdvcmtzKTtcblxuICAgICAgICBmb3IgKGkgPSAwLCBsZW4gPSByZWYubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcblxuICAgICAgICAgICAgbmV0d29ya19uYW1lID0gcmVmW2ldO1xuICAgICAgICAgICAgbmV0d29yayA9IF90aGlzLm5ldHdvcmtzW25ldHdvcmtfbmFtZV07XG5cbiAgICAgICAgICAgIGlmIChuZXR3b3JrLmNoYWluX2lkID09PSBjaGFpbl9pZCkge1xuXG4gICAgICAgICAgICAgICAgX3RoaXMubmV0d29ya19uYW1lID0gbmV0d29ya19uYW1lO1xuXG4gICAgICAgICAgICAgICAgaWYgKG5ldHdvcmsuYWRkcmVzc19wcmVmaXgpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuICAgICAgICAgICAgICAgICAgICBlY2NfY29uZmlnLmFkZHJlc3NfcHJlZml4ID0gbmV0d29yay5hZGRyZXNzX3ByZWZpeDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIklORk8gICAgQ29uZmlndXJlZCBmb3JcIiwgbmV0d29ya19uYW1lLCBcIjpcIiwgbmV0d29yay5jb3JlX2Fzc2V0LCBcIlxcblwiKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcmtfbmFtZTogbmV0d29ya19uYW1lLFxuICAgICAgICAgICAgICAgICAgICBuZXR3b3JrOiBuZXR3b3JrXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghX3RoaXMubmV0d29ya19uYW1lKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVua25vd24gY2hhaW4gaWQgKHRoaXMgbWF5IGJlIGEgdGVzdG5ldClcIiwgY2hhaW5faWQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlc2V0OiBmdW5jdGlvbiByZXNldCgpIHtcbiAgICAgICAgX3RoaXMuY29yZV9hc3NldCA9IFwiQ09SRVwiO1xuICAgICAgICBfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IFwiR1BIXCI7XG4gICAgICAgIGVjY19jb25maWcuYWRkcmVzc19wcmVmaXggPSBcIkdQSFwiO1xuICAgICAgICBfdGhpcy5leHBpcmVfaW5fc2VjcyA9IDE1O1xuICAgICAgICBfdGhpcy5leHBpcmVfaW5fc2Vjc19wcm9wb3NhbCA9IDI0ICogNjAgKiA2MDtcblxuICAgICAgICBjb25zb2xlLmxvZyhcIkNoYWluIGNvbmZpZyByZXNldFwiKTtcbiAgICB9LFxuXG4gICAgc2V0UHJlZml4OiBmdW5jdGlvbiBzZXRQcmVmaXgoKSB7XG4gICAgICAgIHZhciBwcmVmaXggPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IFwiR1BIXCI7XG5cbiAgICAgICAgX3RoaXMuYWRkcmVzc19wcmVmaXggPSBwcmVmaXg7XG4gICAgICAgIGVjY19jb25maWcuYWRkcmVzc19wcmVmaXggPSBwcmVmaXg7XG4gICAgfVxufTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gX3RoaXM7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgV2ViU29ja2V0Q2xpZW50ID0gdm9pZCAwO1xuaWYgKHR5cGVvZiBXZWJTb2NrZXQgPT09IFwidW5kZWZpbmVkXCIgJiYgIXByb2Nlc3MuZW52LmJyb3dzZXIpIHtcbiAgICBXZWJTb2NrZXRDbGllbnQgPSByZXF1aXJlKFwid3NcIik7XG59IGVsc2Uge1xuICAgIFdlYlNvY2tldENsaWVudCA9IFdlYlNvY2tldDtcbn1cblxudmFyIFNPQ0tFVF9ERUJVRyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBnZXRXZWJTb2NrZXRDbGllbnQoYXV0b1JlY29ubmVjdCkge1xuICAgIGlmICghYXV0b1JlY29ubmVjdCAmJiB0eXBlb2YgV2ViU29ja2V0ICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICByZXR1cm4gV2ViU29ja2V0O1xuICAgIH1cbiAgICByZXR1cm4gV2ViU29ja2V0Q2xpZW50O1xufVxuXG52YXIga2VlcF9hbGl2ZV9pbnRlcnZhbCA9IDUwMDA7XG52YXIgbWF4X3NlbmRfbGlmZSA9IDU7XG52YXIgbWF4X3JlY3ZfbGlmZSA9IG1heF9zZW5kX2xpZmUgKiAyO1xuXG52YXIgQ2hhaW5XZWJTb2NrZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2hhaW5XZWJTb2NrZXQod3Nfc2VydmVyLCBzdGF0dXNDYikge1xuICAgICAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDUwMDA7XG5cbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcblxuICAgICAgICB2YXIgYXV0b1JlY29ubmVjdCA9IGFyZ3VtZW50cy5sZW5ndGggPiAzICYmIGFyZ3VtZW50c1szXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzNdIDogdHJ1ZTtcbiAgICAgICAgdmFyIGtlZXBBbGl2ZUNiID0gYXJndW1lbnRzLmxlbmd0aCA+IDQgJiYgYXJndW1lbnRzWzRdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbNF0gOiBudWxsO1xuXG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBDaGFpbldlYlNvY2tldCk7XG5cbiAgICAgICAgdGhpcy51cmwgPSB3c19zZXJ2ZXI7XG4gICAgICAgIHRoaXMuc3RhdHVzQ2IgPSBzdGF0dXNDYjtcbiAgICAgICAgdGhpcy5jb25uZWN0aW9uVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKF90aGlzLmN1cnJlbnRfcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlamVjdCA9IF90aGlzLmN1cnJlbnRfcmVqZWN0O1xuICAgICAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBfdGhpcy5jbG9zZSgpO1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoXCJDb25uZWN0aW9uIGF0dGVtcHQgdGltZWQgb3V0IGFmdGVyIFwiICsgY29ubmVjdFRpbWVvdXQgLyAxMDAwICsgXCJzXCIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgY29ubmVjdFRpbWVvdXQpO1xuXG4gICAgICAgIHRoaXMuY3VycmVudF9yZWplY3QgPSBudWxsO1xuICAgICAgICB0aGlzLm9uX3JlY29ubmVjdCA9IG51bGw7XG4gICAgICAgIHRoaXMuY2xvc2VkID0gZmFsc2U7XG4gICAgICAgIHRoaXMuc2VuZF9saWZlID0gbWF4X3NlbmRfbGlmZTtcbiAgICAgICAgdGhpcy5yZWN2X2xpZmUgPSBtYXhfcmVjdl9saWZlO1xuICAgICAgICB0aGlzLmtlZXBBbGl2ZUNiID0ga2VlcEFsaXZlQ2I7XG4gICAgICAgIHRoaXMuY29ubmVjdF9wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgX3RoaXMuY3VycmVudF9yZWplY3QgPSByZWplY3Q7XG4gICAgICAgICAgICB2YXIgV3NDbGllbnQgPSBnZXRXZWJTb2NrZXRDbGllbnQoYXV0b1JlY29ubmVjdCk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIF90aGlzLndzID0gbmV3IFdzQ2xpZW50KHdzX3NlcnZlcik7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIF90aGlzLndzID0geyByZWFkeVN0YXRlOiAzLCBjbG9zZTogZnVuY3Rpb24gY2xvc2UoKSB7fSB9OyAvLyBESVNDT05ORUNURURcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiSW52YWxpZCB1cmxcIiwgd3Nfc2VydmVyLCBcIiBjbG9zZWRcIikpO1xuICAgICAgICAgICAgICAgIC8vIHJldHVybiB0aGlzLmNsb3NlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gICAgIGNvbnNvbGUubG9nKFwiSW52YWxpZCB1cmxcIiwgd3Nfc2VydmVyLCBcIiBjbG9zZWRcIik7XG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHRocm93IG5ldyBFcnJvcihcIkludmFsaWQgdXJsXCIsIHdzX3NlcnZlciwgXCIgY2xvc2VkXCIpXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIHJldHVybiB0aGlzLmN1cnJlbnRfcmVqZWN0KEVycm9yKFwiSW52YWxpZCB3ZWJzb2NrZXQgdXJsOiBcIiArIHdzX3NlcnZlcikpO1xuICAgICAgICAgICAgICAgIC8vIH0pXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIF90aGlzLndzLm9ub3BlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMuY29ubmVjdGlvblRpbWVvdXQpO1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zdGF0dXNDYikgX3RoaXMuc3RhdHVzQ2IoXCJvcGVuXCIpO1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5vbl9yZWNvbm5lY3QpIF90aGlzLm9uX3JlY29ubmVjdCgpO1xuICAgICAgICAgICAgICAgIF90aGlzLmtlZXBhbGl2ZV90aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgICAgICAgICBfdGhpcy5yZWN2X2xpZmUtLTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLnJlY3ZfbGlmZSA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKF90aGlzLnVybCArICcgY29ubmVjdGlvbiBpcyBkZWFkLCB0ZXJtaW5hdGluZyB3cycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNsZWFySW50ZXJ2YWwodGhpcy5rZWVwYWxpdmVfdGltZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2VuZF9saWZlLS07XG4gICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5zZW5kX2xpZmUgPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy53cy5waW5nKCcnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMua2VlcEFsaXZlQ2IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5rZWVwQWxpdmVDYihfdGhpcy5jbG9zZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuc2VuZF9saWZlID0gbWF4X3NlbmRfbGlmZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sIDUwMDApO1xuICAgICAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXMud3Mub25lcnJvciA9IGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5rZWVwYWxpdmVfdGltZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChfdGhpcy5rZWVwYWxpdmVfdGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChfdGhpcy5jb25uZWN0aW9uVGltZW91dCk7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSBfdGhpcy5zdGF0dXNDYihcImVycm9yXCIpO1xuXG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLmN1cnJlbnRfcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXMud3Mub25tZXNzYWdlID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5yZWN2X2xpZmUgPSBtYXhfcmVjdl9saWZlO1xuICAgICAgICAgICAgICAgIF90aGlzLmxpc3RlbmVyKEpTT04ucGFyc2UobWVzc2FnZS5kYXRhKSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgX3RoaXMud3Mub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBfdGhpcy5jbG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGlmIChfdGhpcy5rZWVwYWxpdmVfdGltZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChfdGhpcy5rZWVwYWxpdmVfdGltZXIpO1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ2Nvbm5lY3Rpb24gY2xvc2VkJyk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgY2JJZCA9IF90aGlzLnJlc3BvbnNlQ2JJZCArIDE7IGNiSWQgPD0gX3RoaXMuY2JJZDsgY2JJZCArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzLmNic1tjYklkXS5yZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSBfdGhpcy5zdGF0dXNDYihcImNsb3NlZFwiKTtcbiAgICAgICAgICAgICAgICBpZiAoX3RoaXMuX2Nsb3NlQ2IpIF90aGlzLl9jbG9zZUNiKCk7XG4gICAgICAgICAgICAgICAgaWYgKF90aGlzLm9uX2Nsb3NlKSBfdGhpcy5vbl9jbG9zZSgpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuY2JJZCA9IDA7XG4gICAgICAgIHRoaXMucmVzcG9uc2VDYklkID0gMDtcbiAgICAgICAgdGhpcy5jYnMgPSB7fTtcbiAgICAgICAgdGhpcy5zdWJzID0ge307XG4gICAgICAgIHRoaXMudW5zdWIgPSB7fTtcbiAgICB9XG5cbiAgICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIGNhbGwocGFyYW1zKSB7XG4gICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgIGlmICh0aGlzLndzLnJlYWR5U3RhdGUgIT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ3dlYnNvY2tldCBzdGF0ZSBlcnJvcjonICsgdGhpcy53cy5yZWFkeVN0YXRlKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG1ldGhvZCA9IHBhcmFtc1sxXTtcbiAgICAgICAgaWYgKFNPQ0tFVF9ERUJVRykgY29uc29sZS5sb2coXCJbQ2hhaW5XZWJTb2NrZXRdID4tLS0tIGNhbGwgLS0tLS0+ICBcXFwiaWRcXFwiOlwiICsgKHRoaXMuY2JJZCArIDEpLCBKU09OLnN0cmluZ2lmeShwYXJhbXMpKTtcblxuICAgICAgICB0aGlzLmNiSWQgKz0gMTtcblxuICAgICAgICBpZiAobWV0aG9kID09PSBcInNldF9zdWJzY3JpYmVfY2FsbGJhY2tcIiB8fCBtZXRob2QgPT09IFwic3Vic2NyaWJlX3RvX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJicm9hZGNhc3RfdHJhbnNhY3Rpb25fd2l0aF9jYWxsYmFja1wiIHx8IG1ldGhvZCA9PT0gXCJzZXRfcGVuZGluZ190cmFuc2FjdGlvbl9jYWxsYmFja1wiKSB7XG4gICAgICAgICAgICAvLyBTdG9yZSBjYWxsYmFjayBpbiBzdWJzIG1hcFxuICAgICAgICAgICAgdGhpcy5zdWJzW3RoaXMuY2JJZF0gPSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHBhcmFtc1syXVswXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gUmVwbGFjZSBjYWxsYmFjayB3aXRoIHRoZSBjYWxsYmFjayBpZFxuICAgICAgICAgICAgcGFyYW1zWzJdWzBdID0gdGhpcy5jYklkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX2FjY291bnRzXCIpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzJdWzBdICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJGaXJzdCBwYXJhbWV0ZXIgb2YgdW5zdWIgbXVzdCBiZSB0aGUgb3JpZ2luYWwgY2FsbGJhY2tcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHZhciB1blN1YkNiID0gcGFyYW1zWzJdLnNwbGljZSgwLCAxKVswXTtcblxuICAgICAgICAgICAgLy8gRmluZCB0aGUgY29ycmVzcG9uZGluZyBzdWJzY3JpcHRpb25cbiAgICAgICAgICAgIGZvciAodmFyIGlkIGluIHRoaXMuc3Vicykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN1YnNbaWRdLmNhbGxiYWNrID09PSB1blN1YkNiKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudW5zdWJbdGhpcy5jYklkXSA9IGlkO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgcmVxdWVzdCA9IHtcbiAgICAgICAgICAgIG1ldGhvZDogXCJjYWxsXCIsXG4gICAgICAgICAgICBwYXJhbXM6IHBhcmFtc1xuICAgICAgICB9O1xuICAgICAgICByZXF1ZXN0LmlkID0gdGhpcy5jYklkO1xuICAgICAgICB0aGlzLnNlbmRfbGlmZSA9IG1heF9zZW5kX2xpZmU7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIF90aGlzMi5jYnNbX3RoaXMyLmNiSWRdID0ge1xuICAgICAgICAgICAgICAgIHRpbWU6IG5ldyBEYXRlKCksXG4gICAgICAgICAgICAgICAgcmVzb2x2ZTogcmVzb2x2ZSxcbiAgICAgICAgICAgICAgICByZWplY3Q6IHJlamVjdFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIF90aGlzMi53cy5zZW5kKEpTT04uc3RyaW5naWZ5KHJlcXVlc3QpKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5saXN0ZW5lciA9IGZ1bmN0aW9uIGxpc3RlbmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChTT0NLRVRfREVCVUcpIGNvbnNvbGUubG9nKFwiW0NoYWluV2ViU29ja2V0XSA8LS0tLSByZXBseSAtLS0tPFwiLCBKU09OLnN0cmluZ2lmeShyZXNwb25zZSkpO1xuXG4gICAgICAgIHZhciBzdWIgPSBmYWxzZSxcbiAgICAgICAgICAgIGNhbGxiYWNrID0gbnVsbDtcblxuICAgICAgICBpZiAocmVzcG9uc2UubWV0aG9kID09PSBcIm5vdGljZVwiKSB7XG4gICAgICAgICAgICBzdWIgPSB0cnVlO1xuICAgICAgICAgICAgcmVzcG9uc2UuaWQgPSByZXNwb25zZS5wYXJhbXNbMF07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXN1Yikge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0aGlzLmNic1tyZXNwb25zZS5pZF07XG4gICAgICAgICAgICB0aGlzLnJlc3BvbnNlQ2JJZCA9IHJlc3BvbnNlLmlkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSB0aGlzLnN1YnNbcmVzcG9uc2UuaWRdLmNhbGxiYWNrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGNhbGxiYWNrICYmICFzdWIpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5lcnJvcikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLnJlamVjdChyZXNwb25zZS5lcnJvcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrLnJlc29sdmUocmVzcG9uc2UucmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmNic1tyZXNwb25zZS5pZF07XG5cbiAgICAgICAgICAgIGlmICh0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnN1YnNbdGhpcy51bnN1YltyZXNwb25zZS5pZF1dO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSB0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjYWxsYmFjayAmJiBzdWIpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLnBhcmFtc1sxXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIldhcm5pbmc6IHVua25vd24gd2Vic29ja2V0IHJlc3BvbnNlOiBcIiwgcmVzcG9uc2UpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIENoYWluV2ViU29ja2V0LnByb3RvdHlwZS5sb2dpbiA9IGZ1bmN0aW9uIGxvZ2luKHVzZXIsIHBhc3N3b3JkKSB7XG4gICAgICAgIHZhciBfdGhpczMgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmNvbm5lY3RfcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBfdGhpczMuY2FsbChbMSwgXCJsb2dpblwiLCBbdXNlciwgcGFzc3dvcmRdXSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbiBjbG9zZSgpIHtcbiAgICAgICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoX3RoaXM0LmtlZXBhbGl2ZV90aW1lcik7XG4gICAgICAgICAgICBfdGhpczQua2VlcGFsaXZlX3RpbWVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgX3RoaXM0Ll9jbG9zZUNiID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJlcygpO1xuICAgICAgICAgICAgICAgIF90aGlzNC5fY2xvc2VDYiA9IG51bGw7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKCFfdGhpczQud3MpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIldlYnNvY2tldCBhbHJlYWR5IGNsZWFyZWRcIiwgX3RoaXM0KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoX3RoaXM0LndzLnRlcm1pbmF0ZSkge1xuICAgICAgICAgICAgICAgIF90aGlzNC53cy50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgX3RoaXM0LndzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoX3RoaXM0LndzLnJlYWR5U3RhdGUgPT09IDMpIHJlcygpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIENoYWluV2ViU29ja2V0O1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBDaGFpbldlYlNvY2tldDtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBHcmFwaGVuZUFwaSA9IGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBHcmFwaGVuZUFwaSh3c19ycGMsIGFwaV9uYW1lKSB7XG4gICAgICAgIF9jbGFzc0NhbGxDaGVjayh0aGlzLCBHcmFwaGVuZUFwaSk7XG5cbiAgICAgICAgdGhpcy53c19ycGMgPSB3c19ycGM7XG4gICAgICAgIHRoaXMuYXBpX25hbWUgPSBhcGlfbmFtZTtcbiAgICB9XG5cbiAgICBHcmFwaGVuZUFwaS5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIGluaXQoKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoWzEsIHRoaXMuYXBpX25hbWUsIFtdXSkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJbR3JhcGhlbmVBcGkuanM6MTFdIC0tLS0tIEdyYXBoZW5lQXBpLmluaXQgLS0tLS0+XCIsIHRoaXMuYXBpX25hbWUsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIHNlbGYuYXBpX2lkID0gcmVzcG9uc2U7XG4gICAgICAgICAgICByZXR1cm4gc2VsZjtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIEdyYXBoZW5lQXBpLnByb3RvdHlwZS5leGVjID0gZnVuY3Rpb24gZXhlYyhtZXRob2QsIHBhcmFtcykge1xuICAgICAgICByZXR1cm4gdGhpcy53c19ycGMuY2FsbChbdGhpcy5hcGlfaWQsIG1ldGhvZCwgcGFyYW1zXSkuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcIiEhISBHcmFwaGVuZUFwaSBlcnJvcjogXCIsIG1ldGhvZCwgcGFyYW1zLCBlcnJvciwgSlNPTi5zdHJpbmdpZnkoZXJyb3IpKTtcbiAgICAgICAgICAgIHRocm93IGVycm9yO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIEdyYXBoZW5lQXBpO1xufSgpO1xuXG5leHBvcnRzLmRlZmF1bHQgPSBHcmFwaGVuZUFwaTtcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiJdfQ==
