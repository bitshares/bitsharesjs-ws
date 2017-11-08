(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.bitshares_ws = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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


var inst = void 0;
var autoReconnect = true;
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

        var _this = this;

        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

        return this.close().then(function () {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(_this.statusCb);

            if (inst && connect) {
                inst.connect(cs, connectTimeout);
            }

            return inst;
        });
    },
    instance: function instance() {
        var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
        var connect = arguments[1];
        var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;
        var enableCrypto = arguments[3];

        if (!inst) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs, connectTimeout, enableCrypto);
        }

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
};

var ApisInstance = function () {
    function ApisInstance() {
        _classCallCheck(this, ApisInstance);
    }

    /** @arg {string} connection .. */
    ApisInstance.prototype.connect = function connect(cs, connectTimeout) {
        var _this2 = this;

        var enableCrypto = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        // console.log("INFO\tApiInstances\tconnect\t", cs);
        this.url = cs;
        var rpc_user = "",
            rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb, connectTimeout, autoReconnect, function () {
            _this2._db.exec('get_objects', [['2.1.0']]).catch(function (e) {});
        });

        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
            console.log("Connected to API node:", cs);
            _this2._db = new _GrapheneApi2.default(_this2.ws_rpc, "database");
            _this2._net = new _GrapheneApi2.default(_this2.ws_rpc, "network_broadcast");
            _this2._hist = new _GrapheneApi2.default(_this2.ws_rpc, "history");
            if (enableCrypto) _this2._crypt = new _GrapheneApi2.default(_this2.ws_rpc, "crypto");
            var db_promise = _this2._db.init().then(function () {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return _this2._db.exec("get_chain_id", []).then(function (_chain_id) {
                    _this2.chain_id = _chain_id;
                    return _ChainConfig2.default.setChainId(_chain_id);
                    //DEBUG console.log("chain_id1",this.chain_id)
                });
            });
            _this2.ws_rpc.on_reconnect = function () {
                _this2.ws_rpc.login("", "").then(function () {
                    _this2._db.init().then(function () {
                        if (_this2.statusCb) _this2.statusCb("reconnect");
                    });
                    _this2._net.init();
                    _this2._hist.init();
                    if (enableCrypto) _this2._crypt.init();
                });
            };
            var initPromises = [db_promise, _this2._net.init(), _this2._hist.init()];
            if (enableCrypto) initPromises.push(_this2._crypt.init());
            return Promise.all(initPromises);
        });
    };

    ApisInstance.prototype.close = function close() {
        var _this3 = this;

        if (this.ws_rpc) {
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

    ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    };

    return ApisInstance;
}();

module.exports = exports["default"];
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

},{"_process":5}],3:[function(require,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebSocketClient = require("reconnecting-websocket");
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

    this.statusCb = statusCb;
    this.connectionTimeout = setTimeout(function () {
      if (_this.current_reject) _this.current_reject(new Error("Connection attempt timed out: " + ws_server));
    }, connectTimeout);
    var WsClient = getWebSocketClient(autoReconnect);
    try {
      this.ws = new WsClient(ws_server);
    } catch (error) {
      console.error("invalid websocket URL:", error, ws_server);
      this.ws = new WsClient("wss://127.0.0.1:8090");
    }
    this.ws.timeoutInterval = 5000;
    this.current_reject = null;
    this.on_reconnect = null;
    this.send_life = max_send_life;
    this.recv_life = max_recv_life;
    this.keepAliveCb = keepAliveCb;
    this.connect_promise = new Promise(function (resolve, reject) {
      _this.current_reject = reject;
      _this.ws.onopen = function () {
        clearTimeout(_this.connectionTimeout);
        if (_this.statusCb) _this.statusCb("open");
        if (_this.on_reconnect) _this.on_reconnect();
        _this.keepalive_timer = setInterval(function () {
          _this.recv_life--;
          if (_this.recv_life == 0) {
            console.error("keep alive timeout.");
            if (_this.ws.terminate) {
              _this.ws.terminate();
            } else {
              _this.ws.close();
            }
            clearInterval(_this.keepalive_timer);
            _this.keepalive_timer = undefined;
            return;
          }
          _this.send_life--;
          if (_this.send_life == 0) {
            // this.ws.ping('', false, true);
            if (_this.keepAliveCb) {
              _this.keepAliveCb();
            }
            _this.send_life = max_send_life;
          }
        }, 5000);
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
        if (_this.keepalive_timer) {
          clearInterval(_this.keepalive_timer);
          _this.keepalive_timer = undefined;
        }
        var err = new Error("connection closed");
        for (var cbId = _this.responseCbId + 1; cbId <= _this.cbId; cbId += 1) {
          _this.cbs[cbId].reject(err);
        }
        if (_this.statusCb) _this.statusCb("closed");
        if (_this.closeCb) _this.closeCb();
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
      return Promise.reject(new Error("websocket state error:" + this.ws.readyState));
    }
    var method = params[1];
    if (SOCKET_DEBUG) console.log('[ChainWebSocket] >---- call ----->  "id":' + (this.cbId + 1), JSON.stringify(params));

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
      _this4.closeCb = function () {
        res();
        _this4.closeCb = null;
      };
      _this4.ws.close();
      if (_this4.ws.readyState !== 1) res();
    });
  };

  return ChainWebSocket;
}();

exports.default = ChainWebSocket;
module.exports = exports["default"];
},{"reconnecting-websocket":6}],4:[function(require,module,exports){
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
            console.log("!!! GrapheneApi error: ", method, params, error, JSON.stringify(error));
            throw error;
        });
    };

    return GrapheneApi;
}();

exports.default = GrapheneApi;
module.exports = exports["default"];
},{}],5:[function(require,module,exports){
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

},{}],6:[function(require,module,exports){
"use strict";
;
;
;
var isWebSocket = function (constructor) {
    return constructor && constructor.CLOSING === 2;
};
var isGlobalWebSocket = function () {
    return typeof WebSocket !== 'undefined' && isWebSocket(WebSocket);
};
var getDefaultOptions = function () { return ({
    constructor: isGlobalWebSocket() ? WebSocket : null,
    maxReconnectionDelay: 10000,
    minReconnectionDelay: 1500,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 4000,
    maxRetries: Infinity,
    debug: false,
}); };
var bypassProperty = function (src, dst, name) {
    Object.defineProperty(dst, name, {
        get: function () { return src[name]; },
        set: function (value) { src[name] = value; },
        enumerable: true,
        configurable: true,
    });
};
var initReconnectionDelay = function (config) {
    return (config.minReconnectionDelay + Math.random() * config.minReconnectionDelay);
};
var updateReconnectionDelay = function (config, previousDelay) {
    var newDelay = previousDelay * config.reconnectionDelayGrowFactor;
    return (newDelay > config.maxReconnectionDelay)
        ? config.maxReconnectionDelay
        : newDelay;
};
var LEVEL_0_EVENTS = ['onopen', 'onclose', 'onmessage', 'onerror'];
var reassignEventListeners = function (ws, oldWs, listeners) {
    Object.keys(listeners).forEach(function (type) {
        listeners[type].forEach(function (_a) {
            var listener = _a[0], options = _a[1];
            ws.addEventListener(type, listener, options);
        });
    });
    if (oldWs) {
        LEVEL_0_EVENTS.forEach(function (name) {
            ws[name] = oldWs[name];
        });
    }
};
var ReconnectingWebsocket = function (url, protocols, options) {
    var _this = this;
    if (options === void 0) { options = {}; }
    var ws;
    var connectingTimeout;
    var reconnectDelay = 0;
    var retriesCount = 0;
    var shouldRetry = true;
    var savedOnClose = null;
    var listeners = {};
    // require new to construct
    if (!(this instanceof ReconnectingWebsocket)) {
        throw new TypeError("Failed to construct 'ReconnectingWebSocket': Please use the 'new' operator");
    }
    // Set config. Not using `Object.assign` because of IE11
    var config = getDefaultOptions();
    Object.keys(config)
        .filter(function (key) { return options.hasOwnProperty(key); })
        .forEach(function (key) { return config[key] = options[key]; });
    if (!isWebSocket(config.constructor)) {
        throw new TypeError('Invalid WebSocket constructor. Set `options.constructor`');
    }
    var log = config.debug ? function () {
        var params = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            params[_i] = arguments[_i];
        }
        return console.log.apply(console, ['RWS:'].concat(params));
    } : function () { };
    /**
     * Not using dispatchEvent, otherwise we must use a DOM Event object
     * Deferred because we want to handle the close event before this
     */
    var emitError = function (code, msg) { return setTimeout(function () {
        var err = new Error(msg);
        err.code = code;
        if (Array.isArray(listeners.error)) {
            listeners.error.forEach(function (_a) {
                var fn = _a[0];
                return fn(err);
            });
        }
        if (ws.onerror) {
            ws.onerror(err);
        }
    }, 0); };
    var handleClose = function () {
        log('handleClose', { shouldRetry: shouldRetry });
        retriesCount++;
        log('retries count:', retriesCount);
        if (retriesCount > config.maxRetries) {
            emitError('EHOSTDOWN', 'Too many failed connection attempts');
            return;
        }
        if (!reconnectDelay) {
            reconnectDelay = initReconnectionDelay(config);
        }
        else {
            reconnectDelay = updateReconnectionDelay(config, reconnectDelay);
        }
        log('handleClose - reconnectDelay:', reconnectDelay);
        if (shouldRetry) {
            setTimeout(connect, reconnectDelay);
        }
    };
    var connect = function () {
        if (!shouldRetry) {
            return;
        }
        log('connect');
        var oldWs = ws;
        var wsUrl = (typeof url === 'function') ? url() : url;
        ws = new config.constructor(wsUrl, protocols);
        connectingTimeout = setTimeout(function () {
            log('timeout');
            ws.close();
            emitError('ETIMEDOUT', 'Connection timeout');
        }, config.connectionTimeout);
        log('bypass properties');
        for (var key in ws) {
            // @todo move to constant
            if (['addEventListener', 'removeEventListener', 'close', 'send'].indexOf(key) < 0) {
                bypassProperty(ws, _this, key);
            }
        }
        ws.addEventListener('open', function () {
            clearTimeout(connectingTimeout);
            log('open');
            reconnectDelay = initReconnectionDelay(config);
            log('reconnectDelay:', reconnectDelay);
            retriesCount = 0;
        });
        ws.addEventListener('close', handleClose);
        reassignEventListeners(ws, oldWs, listeners);
        // because when closing with fastClose=true, it is saved and set to null to avoid double calls
        ws.onclose = ws.onclose || savedOnClose;
        savedOnClose = null;
    };
    log('init');
    connect();
    this.close = function (code, reason, _a) {
        if (code === void 0) { code = 1000; }
        if (reason === void 0) { reason = ''; }
        var _b = _a === void 0 ? {} : _a, _c = _b.keepClosed, keepClosed = _c === void 0 ? false : _c, _d = _b.fastClose, fastClose = _d === void 0 ? true : _d, _e = _b.delay, delay = _e === void 0 ? 0 : _e;
        log('close - params:', { reason: reason, keepClosed: keepClosed, fastClose: fastClose, delay: delay, retriesCount: retriesCount, maxRetries: config.maxRetries });
        shouldRetry = !keepClosed && retriesCount <= config.maxRetries;
        if (delay) {
            reconnectDelay = delay;
        }
        ws.close(code, reason);
        if (fastClose) {
            var fakeCloseEvent_1 = {
                code: code,
                reason: reason,
                wasClean: true,
            };
            // execute close listeners soon with a fake closeEvent
            // and remove them from the WS instance so they
            // don't get fired on the real close.
            handleClose();
            ws.removeEventListener('close', handleClose);
            // run and remove level2
            if (Array.isArray(listeners.close)) {
                listeners.close.forEach(function (_a) {
                    var listener = _a[0], options = _a[1];
                    listener(fakeCloseEvent_1);
                    ws.removeEventListener('close', listener, options);
                });
            }
            // run and remove level0
            if (ws.onclose) {
                savedOnClose = ws.onclose;
                ws.onclose(fakeCloseEvent_1);
                ws.onclose = null;
            }
        }
    };
    this.send = function (data) {
        ws.send(data);
    };
    this.addEventListener = function (type, listener, options) {
        if (Array.isArray(listeners[type])) {
            if (!listeners[type].some(function (_a) {
                var l = _a[0];
                return l === listener;
            })) {
                listeners[type].push([listener, options]);
            }
        }
        else {
            listeners[type] = [[listener, options]];
        }
        ws.addEventListener(type, listener, options);
    };
    this.removeEventListener = function (type, listener, options) {
        if (Array.isArray(listeners[type])) {
            listeners[type] = listeners[type].filter(function (_a) {
                var l = _a[0];
                return l !== listener;
            });
        }
        ws.removeEventListener(type, listener, options);
    };
};
module.exports = ReconnectingWebsocket;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjanMvc3JjL0FwaUluc3RhbmNlcy5qcyIsImNqcy9zcmMvQ2hhaW5Db25maWcuanMiLCJjanMvc3JjL0NoYWluV2ViU29ja2V0LmpzIiwiY2pzL3NyYy9HcmFwaGVuZUFwaS5qcyIsIm5vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvcmVjb25uZWN0aW5nLXdlYnNvY2tldC9kaXN0L2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNyTUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG52YXIgX0NoYWluV2ViU29ja2V0ID0gcmVxdWlyZShcIi4vQ2hhaW5XZWJTb2NrZXRcIik7XG5cbnZhciBfQ2hhaW5XZWJTb2NrZXQyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5XZWJTb2NrZXQpO1xuXG52YXIgX0dyYXBoZW5lQXBpID0gcmVxdWlyZShcIi4vR3JhcGhlbmVBcGlcIik7XG5cbnZhciBfR3JhcGhlbmVBcGkyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfR3JhcGhlbmVBcGkpO1xuXG52YXIgX0NoYWluQ29uZmlnID0gcmVxdWlyZShcIi4vQ2hhaW5Db25maWdcIik7XG5cbnZhciBfQ2hhaW5Db25maWcyID0gX2ludGVyb3BSZXF1aXJlRGVmYXVsdChfQ2hhaW5Db25maWcpO1xuXG5mdW5jdGlvbiBfaW50ZXJvcFJlcXVpcmVEZWZhdWx0KG9iaikgeyByZXR1cm4gb2JqICYmIG9iai5fX2VzTW9kdWxlID8gb2JqIDogeyBkZWZhdWx0OiBvYmogfTsgfVxuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfSAvLyB2YXIgeyBMaXN0IH0gPSByZXF1aXJlKFwiaW1tdXRhYmxlXCIpO1xuXG5cbnZhciBpbnN0ID0gdm9pZCAwO1xudmFyIGF1dG9SZWNvbm5lY3QgPSB0cnVlO1xuLyoqXG4gICAgQ29uZmlndXJlOiBjb25maWd1cmUgYXMgZm9sbG93cyBgQXBpcy5pbnN0YW5jZShcIndzOi8vbG9jYWxob3N0OjgwOTBcIikuaW5pdF9wcm9taXNlYC4gIFRoaXMgcmV0dXJucyBhIHByb21pc2UsIG9uY2UgcmVzb2x2ZWQgdGhlIGNvbm5lY3Rpb24gaXMgcmVhZHkuXG5cbiAgICBJbXBvcnQ6IGltcG9ydCB7IEFwaXMgfSBmcm9tIFwiQGdyYXBoZW5lL2NoYWluXCJcblxuICAgIFNob3J0LWhhbmQ6IEFwaXMuZGIoXCJtZXRob2RcIiwgXCJwYXJtMVwiLCAyLCAzLCAuLi4pLiAgUmV0dXJucyBhIHByb21pc2Ugd2l0aCByZXN1bHRzLlxuXG4gICAgQWRkaXRpb25hbCB1c2FnZTogQXBpcy5pbnN0YW5jZSgpLmRiX2FwaSgpLmV4ZWMoXCJtZXRob2RcIiwgW1wibWV0aG9kXCIsIFwicGFybTFcIiwgMiwgMywgLi4uXSkuICBSZXR1cm5zIGEgcHJvbWlzZSB3aXRoIHJlc3VsdHMuXG4qL1xuXG5leHBvcnRzLmRlZmF1bHQgPSB7XG5cbiAgICBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2s6IGZ1bmN0aW9uIHNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjaykge1xuICAgICAgICB0aGlzLnN0YXR1c0NiID0gY2FsbGJhY2s7XG4gICAgICAgIGlmIChpbnN0KSBpbnN0LnNldFJwY0Nvbm5lY3Rpb25TdGF0dXNDYWxsYmFjayhjYWxsYmFjayk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAgICBAYXJnIHtib29sZWFufSBhdXRvIG1lYW5zIGF1dG9tYXRpYyByZWNvbm5lY3QgaWYgcG9zc2libGUoIGJyb3dzZXIgY2FzZSksIGRlZmF1bHQgdHJ1ZVxuICAgICovXG4gICAgc2V0QXV0b1JlY29ubmVjdDogZnVuY3Rpb24gc2V0QXV0b1JlY29ubmVjdChhdXRvKSB7XG4gICAgICAgIGF1dG9SZWNvbm5lY3QgPSBhdXRvO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgICAgQGFyZyB7c3RyaW5nfSBjcyBpcyBvbmx5IHByb3ZpZGVkIGluIHRoZSBmaXJzdCBjYWxsXG4gICAgICAgIEByZXR1cm4ge0FwaXN9IHNpbmdsZXRvbiAuLiBDaGVjayBBcGlzLmluc3RhbmNlKCkuaW5pdF9wcm9taXNlIHRvIGtub3cgd2hlbiB0aGUgY29ubmVjdGlvbiBpcyBlc3RhYmxpc2hlZFxuICAgICovXG4gICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICB2YXIgY3MgPSBhcmd1bWVudHMubGVuZ3RoID4gMCAmJiBhcmd1bWVudHNbMF0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1swXSA6IFwid3M6Ly9sb2NhbGhvc3Q6ODA5MFwiO1xuXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgICAgICAgdmFyIGNvbm5lY3QgPSBhcmd1bWVudHNbMV07XG4gICAgICAgIHZhciBjb25uZWN0VGltZW91dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIGFyZ3VtZW50c1syXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzJdIDogNDAwMDtcblxuICAgICAgICByZXR1cm4gdGhpcy5jbG9zZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBBcGlzSW5zdGFuY2UoKTtcbiAgICAgICAgICAgIGluc3Quc2V0UnBjQ29ubmVjdGlvblN0YXR1c0NhbGxiYWNrKF90aGlzLnN0YXR1c0NiKTtcblxuICAgICAgICAgICAgaWYgKGluc3QgJiYgY29ubmVjdCkge1xuICAgICAgICAgICAgICAgIGluc3QuY29ubmVjdChjcywgY29ubmVjdFRpbWVvdXQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gaW5zdDtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBpbnN0YW5jZTogZnVuY3Rpb24gaW5zdGFuY2UoKSB7XG4gICAgICAgIHZhciBjcyA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogXCJ3czovL2xvY2FsaG9zdDo4MDkwXCI7XG4gICAgICAgIHZhciBjb25uZWN0ID0gYXJndW1lbnRzWzFdO1xuICAgICAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDQwMDA7XG4gICAgICAgIHZhciBlbmFibGVDcnlwdG8gPSBhcmd1bWVudHNbM107XG5cbiAgICAgICAgaWYgKCFpbnN0KSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IEFwaXNJbnN0YW5jZSgpO1xuICAgICAgICAgICAgaW5zdC5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sodGhpcy5zdGF0dXNDYik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoaW5zdCAmJiBjb25uZWN0KSB7XG4gICAgICAgICAgICBpbnN0LmNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0LCBlbmFibGVDcnlwdG8pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgfSxcbiAgICBjaGFpbklkOiBmdW5jdGlvbiBjaGFpbklkKCkge1xuICAgICAgICByZXR1cm4gQXBpcy5pbnN0YW5jZSgpLmNoYWluX2lkO1xuICAgIH0sXG5cbiAgICBjbG9zZTogZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgICAgIGlmIChpbnN0KSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcykge1xuICAgICAgICAgICAgICAgIGluc3QuY2xvc2UoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgIHJlcygpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfVxuICAgIC8vIGRiOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuZGJfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gICAgLy8gbmV0d29yazogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLm5ldHdvcmtfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gICAgLy8gaGlzdG9yeTogKG1ldGhvZCwgLi4uYXJncykgPT4gQXBpcy5pbnN0YW5jZSgpLmhpc3RvcnlfYXBpKCkuZXhlYyhtZXRob2QsIHRvU3RyaW5ncyhhcmdzKSksXG4gICAgLy8gY3J5cHRvOiAobWV0aG9kLCAuLi5hcmdzKSA9PiBBcGlzLmluc3RhbmNlKCkuY3J5cHRvX2FwaSgpLmV4ZWMobWV0aG9kLCB0b1N0cmluZ3MoYXJncykpXG59O1xuXG52YXIgQXBpc0luc3RhbmNlID0gZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIEFwaXNJbnN0YW5jZSgpIHtcbiAgICAgICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIEFwaXNJbnN0YW5jZSk7XG4gICAgfVxuXG4gICAgLyoqIEBhcmcge3N0cmluZ30gY29ubmVjdGlvbiAuLiAqL1xuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uIGNvbm5lY3QoY3MsIGNvbm5lY3RUaW1lb3V0KSB7XG4gICAgICAgIHZhciBfdGhpczIgPSB0aGlzO1xuXG4gICAgICAgIHZhciBlbmFibGVDcnlwdG8gPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IGZhbHNlO1xuXG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiSU5GT1xcdEFwaUluc3RhbmNlc1xcdGNvbm5lY3RcXHRcIiwgY3MpO1xuICAgICAgICB0aGlzLnVybCA9IGNzO1xuICAgICAgICB2YXIgcnBjX3VzZXIgPSBcIlwiLFxuICAgICAgICAgICAgcnBjX3Bhc3N3b3JkID0gXCJcIjtcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgJiYgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCA9PT0gXCJodHRwczpcIiAmJiBjcy5pbmRleE9mKFwid3NzOi8vXCIpIDwgMCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2VjdXJlIGRvbWFpbnMgcmVxdWlyZSB3c3MgY29ubmVjdGlvblwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMud3NfcnBjID0gbmV3IF9DaGFpbldlYlNvY2tldDIuZGVmYXVsdChjcywgdGhpcy5zdGF0dXNDYiwgY29ubmVjdFRpbWVvdXQsIGF1dG9SZWNvbm5lY3QsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIF90aGlzMi5fZGIuZXhlYygnZ2V0X29iamVjdHMnLCBbWycyLjEuMCddXSkuY2F0Y2goZnVuY3Rpb24gKGUpIHt9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pbml0X3Byb21pc2UgPSB0aGlzLndzX3JwYy5sb2dpbihycGNfdXNlciwgcnBjX3Bhc3N3b3JkKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ29ubmVjdGVkIHRvIEFQSSBub2RlOlwiLCBjcyk7XG4gICAgICAgICAgICBfdGhpczIuX2RiID0gbmV3IF9HcmFwaGVuZUFwaTIuZGVmYXVsdChfdGhpczIud3NfcnBjLCBcImRhdGFiYXNlXCIpO1xuICAgICAgICAgICAgX3RoaXMyLl9uZXQgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwibmV0d29ya19icm9hZGNhc3RcIik7XG4gICAgICAgICAgICBfdGhpczIuX2hpc3QgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwiaGlzdG9yeVwiKTtcbiAgICAgICAgICAgIGlmIChlbmFibGVDcnlwdG8pIF90aGlzMi5fY3J5cHQgPSBuZXcgX0dyYXBoZW5lQXBpMi5kZWZhdWx0KF90aGlzMi53c19ycGMsIFwiY3J5cHRvXCIpO1xuICAgICAgICAgICAgdmFyIGRiX3Byb21pc2UgPSBfdGhpczIuX2RiLmluaXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvL2h0dHBzOi8vZ2l0aHViLmNvbS9jcnlwdG9ub21leC9ncmFwaGVuZS93aWtpL2NoYWluLWxvY2tlZC10eFxuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpczIuX2RiLmV4ZWMoXCJnZXRfY2hhaW5faWRcIiwgW10pLnRoZW4oZnVuY3Rpb24gKF9jaGFpbl9pZCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpczIuY2hhaW5faWQgPSBfY2hhaW5faWQ7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfQ2hhaW5Db25maWcyLmRlZmF1bHQuc2V0Q2hhaW5JZChfY2hhaW5faWQpO1xuICAgICAgICAgICAgICAgICAgICAvL0RFQlVHIGNvbnNvbGUubG9nKFwiY2hhaW5faWQxXCIsdGhpcy5jaGFpbl9pZClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgX3RoaXMyLndzX3JwYy5vbl9yZWNvbm5lY3QgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMyLndzX3JwYy5sb2dpbihcIlwiLCBcIlwiKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMyLl9kYi5pbml0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX3RoaXMyLnN0YXR1c0NiKSBfdGhpczIuc3RhdHVzQ2IoXCJyZWNvbm5lY3RcIik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBfdGhpczIuX25ldC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzMi5faGlzdC5pbml0KCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmFibGVDcnlwdG8pIF90aGlzMi5fY3J5cHQuaW5pdCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHZhciBpbml0UHJvbWlzZXMgPSBbZGJfcHJvbWlzZSwgX3RoaXMyLl9uZXQuaW5pdCgpLCBfdGhpczIuX2hpc3QuaW5pdCgpXTtcbiAgICAgICAgICAgIGlmIChlbmFibGVDcnlwdG8pIGluaXRQcm9taXNlcy5wdXNoKF90aGlzMi5fY3J5cHQuaW5pdCgpKTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChpbml0UHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIGNsb3NlKCkge1xuICAgICAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgICAgICBpZiAodGhpcy53c19ycGMpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLndzX3JwYy5jbG9zZSgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIF90aGlzMy53c19ycGMgPSBudWxsO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMud3NfcnBjID0gbnVsbDtcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLmRiX2FwaSA9IGZ1bmN0aW9uIGRiX2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2RiO1xuICAgIH07XG5cbiAgICBBcGlzSW5zdGFuY2UucHJvdG90eXBlLm5ldHdvcmtfYXBpID0gZnVuY3Rpb24gbmV0d29ya19hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9uZXQ7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuaGlzdG9yeV9hcGkgPSBmdW5jdGlvbiBoaXN0b3J5X2FwaSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2hpc3Q7XG4gICAgfTtcblxuICAgIEFwaXNJbnN0YW5jZS5wcm90b3R5cGUuY3J5cHRvX2FwaSA9IGZ1bmN0aW9uIGNyeXB0b19hcGkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jcnlwdDtcbiAgICB9O1xuXG4gICAgQXBpc0luc3RhbmNlLnByb3RvdHlwZS5zZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2sgPSBmdW5jdGlvbiBzZXRScGNDb25uZWN0aW9uU3RhdHVzQ2FsbGJhY2soY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5zdGF0dXNDYiA9IGNhbGxiYWNrO1xuICAgIH07XG5cbiAgICByZXR1cm4gQXBpc0luc3RhbmNlO1xufSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xudmFyIF90aGlzID0gdm9pZCAwO1xuXG52YXIgZWNjX2NvbmZpZyA9IHtcbiAgICBhZGRyZXNzX3ByZWZpeDogcHJvY2Vzcy5lbnYubnBtX2NvbmZpZ19fZ3JhcGhlbmVfZWNjX2RlZmF1bHRfYWRkcmVzc19wcmVmaXggfHwgXCJHUEhcIlxufTtcblxuX3RoaXMgPSB7XG4gICAgY29yZV9hc3NldDogXCJDT1JFXCIsXG4gICAgYWRkcmVzc19wcmVmaXg6IFwiR1BIXCIsXG4gICAgZXhwaXJlX2luX3NlY3M6IDE1LFxuICAgIGV4cGlyZV9pbl9zZWNzX3Byb3Bvc2FsOiAyNCAqIDYwICogNjAsXG4gICAgcmV2aWV3X2luX3NlY3NfY29tbWl0dGVlOiAyNCAqIDYwICogNjAsXG4gICAgbmV0d29ya3M6IHtcbiAgICAgICAgQml0U2hhcmVzOiB7XG4gICAgICAgICAgICBjb3JlX2Fzc2V0OiBcIkJUU1wiLFxuICAgICAgICAgICAgYWRkcmVzc19wcmVmaXg6IFwiQlRTXCIsXG4gICAgICAgICAgICBjaGFpbl9pZDogXCI0MDE4ZDc4NDRjNzhmNmE2YzQxYzZhNTUyYjg5ODAyMjMxMGZjNWRlYzA2ZGE0NjdlZTc5MDVhOGRhZDUxMmM4XCJcbiAgICAgICAgfSxcbiAgICAgICAgTXVzZToge1xuICAgICAgICAgICAgY29yZV9hc3NldDogXCJNVVNFXCIsXG4gICAgICAgICAgICBhZGRyZXNzX3ByZWZpeDogXCJNVVNFXCIsXG4gICAgICAgICAgICBjaGFpbl9pZDogXCI0NWFkMmQzZjllZjkyYTQ5YjU1YzIyMjdlYjA2MTIzZjYxM2JiMzVkZDA4YmQ4NzZmMmFlYTIxOTI1YTY3YTY3XCJcbiAgICAgICAgfSxcbiAgICAgICAgVGVzdDoge1xuICAgICAgICAgICAgY29yZV9hc3NldDogXCJURVNUXCIsXG4gICAgICAgICAgICBhZGRyZXNzX3ByZWZpeDogXCJURVNUXCIsXG4gICAgICAgICAgICBjaGFpbl9pZDogXCIzOWY1ZTJlZGUxZjhiYzFhM2E1NGE3OTE0NDE0ZTM3NzllMzMxOTNmMWY1NjkzNTEwZTczY2I3YTg3NjE3NDQ3XCJcbiAgICAgICAgfSxcbiAgICAgICAgT2JlbGlzazoge1xuICAgICAgICAgICAgY29yZV9hc3NldDogXCJHT1ZcIixcbiAgICAgICAgICAgIGFkZHJlc3NfcHJlZml4OiBcIkZFV1wiLFxuICAgICAgICAgICAgY2hhaW5faWQ6IFwiMWNmZGU3YzM4OGI5ZThhYzA2NDYyZDY4YWFkYmQ5NjZiNThmODg3OTc2MzdkOWFmODA1YjQ1NjBiMGU5NjYxZVwiXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqIFNldCBhIGZldyBwcm9wZXJ0aWVzIGZvciBrbm93biBjaGFpbiBJRHMuICovXG4gICAgc2V0Q2hhaW5JZDogZnVuY3Rpb24gc2V0Q2hhaW5JZChjaGFpbl9pZCkge1xuXG4gICAgICAgIHZhciBpID0gdm9pZCAwLFxuICAgICAgICAgICAgbGVuID0gdm9pZCAwLFxuICAgICAgICAgICAgbmV0d29yayA9IHZvaWQgMCxcbiAgICAgICAgICAgIG5ldHdvcmtfbmFtZSA9IHZvaWQgMCxcbiAgICAgICAgICAgIHJlZiA9IHZvaWQgMDtcbiAgICAgICAgcmVmID0gT2JqZWN0LmtleXMoX3RoaXMubmV0d29ya3MpO1xuXG4gICAgICAgIGZvciAoaSA9IDAsIGxlbiA9IHJlZi5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuXG4gICAgICAgICAgICBuZXR3b3JrX25hbWUgPSByZWZbaV07XG4gICAgICAgICAgICBuZXR3b3JrID0gX3RoaXMubmV0d29ya3NbbmV0d29ya19uYW1lXTtcblxuICAgICAgICAgICAgaWYgKG5ldHdvcmsuY2hhaW5faWQgPT09IGNoYWluX2lkKSB7XG5cbiAgICAgICAgICAgICAgICBfdGhpcy5uZXR3b3JrX25hbWUgPSBuZXR3b3JrX25hbWU7XG5cbiAgICAgICAgICAgICAgICBpZiAobmV0d29yay5hZGRyZXNzX3ByZWZpeCkge1xuICAgICAgICAgICAgICAgICAgICBfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IG5ldHdvcmsuYWRkcmVzc19wcmVmaXg7XG4gICAgICAgICAgICAgICAgICAgIGVjY19jb25maWcuYWRkcmVzc19wcmVmaXggPSBuZXR3b3JrLmFkZHJlc3NfcHJlZml4O1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiSU5GTyAgICBDb25maWd1cmVkIGZvclwiLCBuZXR3b3JrX25hbWUsIFwiOlwiLCBuZXR3b3JrLmNvcmVfYXNzZXQsIFwiXFxuXCIpO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmV0d29ya19uYW1lOiBuZXR3b3JrX25hbWUsXG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcms6IG5ldHdvcmtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFfdGhpcy5uZXR3b3JrX25hbWUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVW5rbm93biBjaGFpbiBpZCAodGhpcyBtYXkgYmUgYSB0ZXN0bmV0KVwiLCBjaGFpbl9pZCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVzZXQ6IGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgICAgICBfdGhpcy5jb3JlX2Fzc2V0ID0gXCJDT1JFXCI7XG4gICAgICAgIF90aGlzLmFkZHJlc3NfcHJlZml4ID0gXCJHUEhcIjtcbiAgICAgICAgZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IFwiR1BIXCI7XG4gICAgICAgIF90aGlzLmV4cGlyZV9pbl9zZWNzID0gMTU7XG4gICAgICAgIF90aGlzLmV4cGlyZV9pbl9zZWNzX3Byb3Bvc2FsID0gMjQgKiA2MCAqIDYwO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQ2hhaW4gY29uZmlnIHJlc2V0XCIpO1xuICAgIH0sXG5cbiAgICBzZXRQcmVmaXg6IGZ1bmN0aW9uIHNldFByZWZpeCgpIHtcbiAgICAgICAgdmFyIHByZWZpeCA9IGFyZ3VtZW50cy5sZW5ndGggPiAwICYmIGFyZ3VtZW50c1swXSAhPT0gdW5kZWZpbmVkID8gYXJndW1lbnRzWzBdIDogXCJHUEhcIjtcblxuICAgICAgICBfdGhpcy5hZGRyZXNzX3ByZWZpeCA9IHByZWZpeDtcbiAgICAgICAgZWNjX2NvbmZpZy5hZGRyZXNzX3ByZWZpeCA9IHByZWZpeDtcbiAgICB9XG59O1xuXG5leHBvcnRzLmRlZmF1bHQgPSBfdGhpcztcbm1vZHVsZS5leHBvcnRzID0gZXhwb3J0c1tcImRlZmF1bHRcIl07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmV4cG9ydHMuX19lc01vZHVsZSA9IHRydWU7XG5cbmZ1bmN0aW9uIF9jbGFzc0NhbGxDaGVjayhpbnN0YW5jZSwgQ29uc3RydWN0b3IpIHsgaWYgKCEoaW5zdGFuY2UgaW5zdGFuY2VvZiBDb25zdHJ1Y3RvcikpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkNhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvblwiKTsgfSB9XG5cbnZhciBXZWJTb2NrZXRDbGllbnQgPSByZXF1aXJlKFwicmVjb25uZWN0aW5nLXdlYnNvY2tldFwiKTtcbnZhciBTT0NLRVRfREVCVUcgPSBmYWxzZTtcblxuZnVuY3Rpb24gZ2V0V2ViU29ja2V0Q2xpZW50KGF1dG9SZWNvbm5lY3QpIHtcbiAgaWYgKCFhdXRvUmVjb25uZWN0ICYmIHR5cGVvZiBXZWJTb2NrZXQgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIGRvY3VtZW50ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgcmV0dXJuIFdlYlNvY2tldDtcbiAgfVxuICByZXR1cm4gV2ViU29ja2V0Q2xpZW50O1xufVxuXG52YXIga2VlcF9hbGl2ZV9pbnRlcnZhbCA9IDUwMDA7XG52YXIgbWF4X3NlbmRfbGlmZSA9IDU7XG52YXIgbWF4X3JlY3ZfbGlmZSA9IG1heF9zZW5kX2xpZmUgKiAyO1xuXG52YXIgQ2hhaW5XZWJTb2NrZXQgPSBmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIENoYWluV2ViU29ja2V0KHdzX3NlcnZlciwgc3RhdHVzQ2IpIHtcbiAgICB2YXIgY29ubmVjdFRpbWVvdXQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiAmJiBhcmd1bWVudHNbMl0gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1syXSA6IDUwMDA7XG5cbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgdmFyIGF1dG9SZWNvbm5lY3QgPSBhcmd1bWVudHMubGVuZ3RoID4gMyAmJiBhcmd1bWVudHNbM10gIT09IHVuZGVmaW5lZCA/IGFyZ3VtZW50c1szXSA6IHRydWU7XG4gICAgdmFyIGtlZXBBbGl2ZUNiID0gYXJndW1lbnRzLmxlbmd0aCA+IDQgJiYgYXJndW1lbnRzWzRdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbNF0gOiBudWxsO1xuXG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIENoYWluV2ViU29ja2V0KTtcblxuICAgIHRoaXMuc3RhdHVzQ2IgPSBzdGF0dXNDYjtcbiAgICB0aGlzLmNvbm5lY3Rpb25UaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoX3RoaXMuY3VycmVudF9yZWplY3QpIF90aGlzLmN1cnJlbnRfcmVqZWN0KG5ldyBFcnJvcihcIkNvbm5lY3Rpb24gYXR0ZW1wdCB0aW1lZCBvdXQ6IFwiICsgd3Nfc2VydmVyKSk7XG4gICAgfSwgY29ubmVjdFRpbWVvdXQpO1xuICAgIHZhciBXc0NsaWVudCA9IGdldFdlYlNvY2tldENsaWVudChhdXRvUmVjb25uZWN0KTtcbiAgICB0cnkge1xuICAgICAgdGhpcy53cyA9IG5ldyBXc0NsaWVudCh3c19zZXJ2ZXIpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiaW52YWxpZCB3ZWJzb2NrZXQgVVJMOlwiLCBlcnJvciwgd3Nfc2VydmVyKTtcbiAgICAgIHRoaXMud3MgPSBuZXcgV3NDbGllbnQoXCJ3c3M6Ly8xMjcuMC4wLjE6ODA5MFwiKTtcbiAgICB9XG4gICAgdGhpcy53cy50aW1lb3V0SW50ZXJ2YWwgPSA1MDAwO1xuICAgIHRoaXMuY3VycmVudF9yZWplY3QgPSBudWxsO1xuICAgIHRoaXMub25fcmVjb25uZWN0ID0gbnVsbDtcbiAgICB0aGlzLnNlbmRfbGlmZSA9IG1heF9zZW5kX2xpZmU7XG4gICAgdGhpcy5yZWN2X2xpZmUgPSBtYXhfcmVjdl9saWZlO1xuICAgIHRoaXMua2VlcEFsaXZlQ2IgPSBrZWVwQWxpdmVDYjtcbiAgICB0aGlzLmNvbm5lY3RfcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0ID0gcmVqZWN0O1xuICAgICAgX3RoaXMud3Mub25vcGVuID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBjbGVhclRpbWVvdXQoX3RoaXMuY29ubmVjdGlvblRpbWVvdXQpO1xuICAgICAgICBpZiAoX3RoaXMuc3RhdHVzQ2IpIF90aGlzLnN0YXR1c0NiKFwib3BlblwiKTtcbiAgICAgICAgaWYgKF90aGlzLm9uX3JlY29ubmVjdCkgX3RoaXMub25fcmVjb25uZWN0KCk7XG4gICAgICAgIF90aGlzLmtlZXBhbGl2ZV90aW1lciA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBfdGhpcy5yZWN2X2xpZmUtLTtcbiAgICAgICAgICBpZiAoX3RoaXMucmVjdl9saWZlID09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJrZWVwIGFsaXZlIHRpbWVvdXQuXCIpO1xuICAgICAgICAgICAgaWYgKF90aGlzLndzLnRlcm1pbmF0ZSkge1xuICAgICAgICAgICAgICBfdGhpcy53cy50ZXJtaW5hdGUoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIF90aGlzLndzLmNsb3NlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjbGVhckludGVydmFsKF90aGlzLmtlZXBhbGl2ZV90aW1lcik7XG4gICAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIF90aGlzLnNlbmRfbGlmZS0tO1xuICAgICAgICAgIGlmIChfdGhpcy5zZW5kX2xpZmUgPT0gMCkge1xuICAgICAgICAgICAgLy8gdGhpcy53cy5waW5nKCcnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoX3RoaXMua2VlcEFsaXZlQ2IpIHtcbiAgICAgICAgICAgICAgX3RoaXMua2VlcEFsaXZlQ2IoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF90aGlzLnNlbmRfbGlmZSA9IG1heF9zZW5kX2xpZmU7XG4gICAgICAgICAgfVxuICAgICAgICB9LCA1MDAwKTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfTtcbiAgICAgIF90aGlzLndzLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcbiAgICAgICAgaWYgKF90aGlzLmtlZXBhbGl2ZV90aW1lcikge1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwoX3RoaXMua2VlcGFsaXZlX3RpbWVyKTtcbiAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgY2xlYXJUaW1lb3V0KF90aGlzLmNvbm5lY3Rpb25UaW1lb3V0KTtcbiAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSBfdGhpcy5zdGF0dXNDYihcImVycm9yXCIpO1xuXG4gICAgICAgIGlmIChfdGhpcy5jdXJyZW50X3JlamVjdCkge1xuICAgICAgICAgIF90aGlzLmN1cnJlbnRfcmVqZWN0KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIF90aGlzLndzLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgICAgIF90aGlzLnJlY3ZfbGlmZSA9IG1heF9yZWN2X2xpZmU7XG4gICAgICAgIF90aGlzLmxpc3RlbmVyKEpTT04ucGFyc2UobWVzc2FnZS5kYXRhKSk7XG4gICAgICB9O1xuICAgICAgX3RoaXMud3Mub25jbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKF90aGlzLmtlZXBhbGl2ZV90aW1lcikge1xuICAgICAgICAgIGNsZWFySW50ZXJ2YWwoX3RoaXMua2VlcGFsaXZlX3RpbWVyKTtcbiAgICAgICAgICBfdGhpcy5rZWVwYWxpdmVfdGltZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihcImNvbm5lY3Rpb24gY2xvc2VkXCIpO1xuICAgICAgICBmb3IgKHZhciBjYklkID0gX3RoaXMucmVzcG9uc2VDYklkICsgMTsgY2JJZCA8PSBfdGhpcy5jYklkOyBjYklkICs9IDEpIHtcbiAgICAgICAgICBfdGhpcy5jYnNbY2JJZF0ucmVqZWN0KGVycik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF90aGlzLnN0YXR1c0NiKSBfdGhpcy5zdGF0dXNDYihcImNsb3NlZFwiKTtcbiAgICAgICAgaWYgKF90aGlzLmNsb3NlQ2IpIF90aGlzLmNsb3NlQ2IoKTtcbiAgICAgIH07XG4gICAgfSk7XG4gICAgdGhpcy5jYklkID0gMDtcbiAgICB0aGlzLnJlc3BvbnNlQ2JJZCA9IDA7XG4gICAgdGhpcy5jYnMgPSB7fTtcbiAgICB0aGlzLnN1YnMgPSB7fTtcbiAgICB0aGlzLnVuc3ViID0ge307XG4gIH1cblxuICBDaGFpbldlYlNvY2tldC5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIGNhbGwocGFyYW1zKSB7XG4gICAgdmFyIF90aGlzMiA9IHRoaXM7XG5cbiAgICBpZiAodGhpcy53cy5yZWFkeVN0YXRlICE9PSAxKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKFwid2Vic29ja2V0IHN0YXRlIGVycm9yOlwiICsgdGhpcy53cy5yZWFkeVN0YXRlKSk7XG4gICAgfVxuICAgIHZhciBtZXRob2QgPSBwYXJhbXNbMV07XG4gICAgaWYgKFNPQ0tFVF9ERUJVRykgY29uc29sZS5sb2coJ1tDaGFpbldlYlNvY2tldF0gPi0tLS0gY2FsbCAtLS0tLT4gIFwiaWRcIjonICsgKHRoaXMuY2JJZCArIDEpLCBKU09OLnN0cmluZ2lmeShwYXJhbXMpKTtcblxuICAgIHRoaXMuY2JJZCArPSAxO1xuXG4gICAgaWYgKG1ldGhvZCA9PT0gXCJzZXRfc3Vic2NyaWJlX2NhbGxiYWNrXCIgfHwgbWV0aG9kID09PSBcInN1YnNjcmliZV90b19tYXJrZXRcIiB8fCBtZXRob2QgPT09IFwiYnJvYWRjYXN0X3RyYW5zYWN0aW9uX3dpdGhfY2FsbGJhY2tcIiB8fCBtZXRob2QgPT09IFwic2V0X3BlbmRpbmdfdHJhbnNhY3Rpb25fY2FsbGJhY2tcIikge1xuICAgICAgLy8gU3RvcmUgY2FsbGJhY2sgaW4gc3VicyBtYXBcbiAgICAgIHRoaXMuc3Vic1t0aGlzLmNiSWRdID0ge1xuICAgICAgICBjYWxsYmFjazogcGFyYW1zWzJdWzBdXG4gICAgICB9O1xuXG4gICAgICAvLyBSZXBsYWNlIGNhbGxiYWNrIHdpdGggdGhlIGNhbGxiYWNrIGlkXG4gICAgICBwYXJhbXNbMl1bMF0gPSB0aGlzLmNiSWQ7XG4gICAgfVxuXG4gICAgaWYgKG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX21hcmtldFwiIHx8IG1ldGhvZCA9PT0gXCJ1bnN1YnNjcmliZV9mcm9tX2FjY291bnRzXCIpIHtcbiAgICAgIGlmICh0eXBlb2YgcGFyYW1zWzJdWzBdICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRmlyc3QgcGFyYW1ldGVyIG9mIHVuc3ViIG11c3QgYmUgdGhlIG9yaWdpbmFsIGNhbGxiYWNrXCIpO1xuICAgICAgfVxuXG4gICAgICB2YXIgdW5TdWJDYiA9IHBhcmFtc1syXS5zcGxpY2UoMCwgMSlbMF07XG5cbiAgICAgIC8vIEZpbmQgdGhlIGNvcnJlc3BvbmRpbmcgc3Vic2NyaXB0aW9uXG4gICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLnN1YnMpIHtcbiAgICAgICAgaWYgKHRoaXMuc3Vic1tpZF0uY2FsbGJhY2sgPT09IHVuU3ViQ2IpIHtcbiAgICAgICAgICB0aGlzLnVuc3ViW3RoaXMuY2JJZF0gPSBpZDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHZhciByZXF1ZXN0ID0ge1xuICAgICAgbWV0aG9kOiBcImNhbGxcIixcbiAgICAgIHBhcmFtczogcGFyYW1zXG4gICAgfTtcbiAgICByZXF1ZXN0LmlkID0gdGhpcy5jYklkO1xuICAgIHRoaXMuc2VuZF9saWZlID0gbWF4X3NlbmRfbGlmZTtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBfdGhpczIuY2JzW190aGlzMi5jYklkXSA9IHtcbiAgICAgICAgdGltZTogbmV3IERhdGUoKSxcbiAgICAgICAgcmVzb2x2ZTogcmVzb2x2ZSxcbiAgICAgICAgcmVqZWN0OiByZWplY3RcbiAgICAgIH07XG4gICAgICBfdGhpczIud3Muc2VuZChKU09OLnN0cmluZ2lmeShyZXF1ZXN0KSk7XG4gICAgfSk7XG4gIH07XG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmxpc3RlbmVyID0gZnVuY3Rpb24gbGlzdGVuZXIocmVzcG9uc2UpIHtcbiAgICBpZiAoU09DS0VUX0RFQlVHKSBjb25zb2xlLmxvZyhcIltDaGFpbldlYlNvY2tldF0gPC0tLS0gcmVwbHkgLS0tLTxcIiwgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpKTtcblxuICAgIHZhciBzdWIgPSBmYWxzZSxcbiAgICAgICAgY2FsbGJhY2sgPSBudWxsO1xuXG4gICAgaWYgKHJlc3BvbnNlLm1ldGhvZCA9PT0gXCJub3RpY2VcIikge1xuICAgICAgc3ViID0gdHJ1ZTtcbiAgICAgIHJlc3BvbnNlLmlkID0gcmVzcG9uc2UucGFyYW1zWzBdO1xuICAgIH1cblxuICAgIGlmICghc3ViKSB7XG4gICAgICBjYWxsYmFjayA9IHRoaXMuY2JzW3Jlc3BvbnNlLmlkXTtcbiAgICAgIHRoaXMucmVzcG9uc2VDYklkID0gcmVzcG9uc2UuaWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrID0gdGhpcy5zdWJzW3Jlc3BvbnNlLmlkXS5jYWxsYmFjaztcbiAgICB9XG5cbiAgICBpZiAoY2FsbGJhY2sgJiYgIXN1Yikge1xuICAgICAgaWYgKHJlc3BvbnNlLmVycm9yKSB7XG4gICAgICAgIGNhbGxiYWNrLnJlamVjdChyZXNwb25zZS5lcnJvcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjay5yZXNvbHZlKHJlc3BvbnNlLnJlc3VsdCk7XG4gICAgICB9XG4gICAgICBkZWxldGUgdGhpcy5jYnNbcmVzcG9uc2UuaWRdO1xuXG4gICAgICBpZiAodGhpcy51bnN1YltyZXNwb25zZS5pZF0pIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3Vic1t0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXV07XG4gICAgICAgIGRlbGV0ZSB0aGlzLnVuc3ViW3Jlc3BvbnNlLmlkXTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGNhbGxiYWNrICYmIHN1Yikge1xuICAgICAgY2FsbGJhY2socmVzcG9uc2UucGFyYW1zWzFdKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJXYXJuaW5nOiB1bmtub3duIHdlYnNvY2tldCByZXNwb25zZTogXCIsIHJlc3BvbnNlKTtcbiAgICB9XG4gIH07XG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmxvZ2luID0gZnVuY3Rpb24gbG9naW4odXNlciwgcGFzc3dvcmQpIHtcbiAgICB2YXIgX3RoaXMzID0gdGhpcztcblxuICAgIHJldHVybiB0aGlzLmNvbm5lY3RfcHJvbWlzZS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBfdGhpczMuY2FsbChbMSwgXCJsb2dpblwiLCBbdXNlciwgcGFzc3dvcmRdXSk7XG4gICAgfSk7XG4gIH07XG5cbiAgQ2hhaW5XZWJTb2NrZXQucHJvdG90eXBlLmNsb3NlID0gZnVuY3Rpb24gY2xvc2UoKSB7XG4gICAgdmFyIF90aGlzNCA9IHRoaXM7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlcykge1xuICAgICAgX3RoaXM0LmNsb3NlQ2IgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJlcygpO1xuICAgICAgICBfdGhpczQuY2xvc2VDYiA9IG51bGw7XG4gICAgICB9O1xuICAgICAgX3RoaXM0LndzLmNsb3NlKCk7XG4gICAgICBpZiAoX3RoaXM0LndzLnJlYWR5U3RhdGUgIT09IDEpIHJlcygpO1xuICAgIH0pO1xuICB9O1xuXG4gIHJldHVybiBDaGFpbldlYlNvY2tldDtcbn0oKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gQ2hhaW5XZWJTb2NrZXQ7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIlwidXNlIHN0cmljdFwiO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb25cIik7IH0gfVxuXG52YXIgR3JhcGhlbmVBcGkgPSBmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gR3JhcGhlbmVBcGkod3NfcnBjLCBhcGlfbmFtZSkge1xuICAgICAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgR3JhcGhlbmVBcGkpO1xuXG4gICAgICAgIHRoaXMud3NfcnBjID0gd3NfcnBjO1xuICAgICAgICB0aGlzLmFwaV9uYW1lID0gYXBpX25hbWU7XG4gICAgfVxuXG4gICAgR3JhcGhlbmVBcGkucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiBpbml0KCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHJldHVybiB0aGlzLndzX3JwYy5jYWxsKFsxLCB0aGlzLmFwaV9uYW1lLCBbXV0pLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAvL2NvbnNvbGUubG9nKFwiW0dyYXBoZW5lQXBpLmpzOjExXSAtLS0tLSBHcmFwaGVuZUFwaS5pbml0IC0tLS0tPlwiLCB0aGlzLmFwaV9uYW1lLCByZXNwb25zZSk7XG4gICAgICAgICAgICBzZWxmLmFwaV9pZCA9IHJlc3BvbnNlO1xuICAgICAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBHcmFwaGVuZUFwaS5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uIGV4ZWMobWV0aG9kLCBwYXJhbXMpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMud3NfcnBjLmNhbGwoW3RoaXMuYXBpX2lkLCBtZXRob2QsIHBhcmFtc10pLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCIhISEgR3JhcGhlbmVBcGkgZXJyb3I6IFwiLCBtZXRob2QsIHBhcmFtcywgZXJyb3IsIEpTT04uc3RyaW5naWZ5KGVycm9yKSk7XG4gICAgICAgICAgICB0aHJvdyBlcnJvcjtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiBHcmFwaGVuZUFwaTtcbn0oKTtcblxuZXhwb3J0cy5kZWZhdWx0ID0gR3JhcGhlbmVBcGk7XG5tb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHNbXCJkZWZhdWx0XCJdOyIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJcInVzZSBzdHJpY3RcIjtcbjtcbjtcbjtcbnZhciBpc1dlYlNvY2tldCA9IGZ1bmN0aW9uIChjb25zdHJ1Y3Rvcikge1xuICAgIHJldHVybiBjb25zdHJ1Y3RvciAmJiBjb25zdHJ1Y3Rvci5DTE9TSU5HID09PSAyO1xufTtcbnZhciBpc0dsb2JhbFdlYlNvY2tldCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdHlwZW9mIFdlYlNvY2tldCAhPT0gJ3VuZGVmaW5lZCcgJiYgaXNXZWJTb2NrZXQoV2ViU29ja2V0KTtcbn07XG52YXIgZ2V0RGVmYXVsdE9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAoe1xuICAgIGNvbnN0cnVjdG9yOiBpc0dsb2JhbFdlYlNvY2tldCgpID8gV2ViU29ja2V0IDogbnVsbCxcbiAgICBtYXhSZWNvbm5lY3Rpb25EZWxheTogMTAwMDAsXG4gICAgbWluUmVjb25uZWN0aW9uRGVsYXk6IDE1MDAsXG4gICAgcmVjb25uZWN0aW9uRGVsYXlHcm93RmFjdG9yOiAxLjMsXG4gICAgY29ubmVjdGlvblRpbWVvdXQ6IDQwMDAsXG4gICAgbWF4UmV0cmllczogSW5maW5pdHksXG4gICAgZGVidWc6IGZhbHNlLFxufSk7IH07XG52YXIgYnlwYXNzUHJvcGVydHkgPSBmdW5jdGlvbiAoc3JjLCBkc3QsIG5hbWUpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZHN0LCBuYW1lLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gc3JjW25hbWVdOyB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWx1ZSkgeyBzcmNbbmFtZV0gPSB2YWx1ZTsgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIH0pO1xufTtcbnZhciBpbml0UmVjb25uZWN0aW9uRGVsYXkgPSBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgcmV0dXJuIChjb25maWcubWluUmVjb25uZWN0aW9uRGVsYXkgKyBNYXRoLnJhbmRvbSgpICogY29uZmlnLm1pblJlY29ubmVjdGlvbkRlbGF5KTtcbn07XG52YXIgdXBkYXRlUmVjb25uZWN0aW9uRGVsYXkgPSBmdW5jdGlvbiAoY29uZmlnLCBwcmV2aW91c0RlbGF5KSB7XG4gICAgdmFyIG5ld0RlbGF5ID0gcHJldmlvdXNEZWxheSAqIGNvbmZpZy5yZWNvbm5lY3Rpb25EZWxheUdyb3dGYWN0b3I7XG4gICAgcmV0dXJuIChuZXdEZWxheSA+IGNvbmZpZy5tYXhSZWNvbm5lY3Rpb25EZWxheSlcbiAgICAgICAgPyBjb25maWcubWF4UmVjb25uZWN0aW9uRGVsYXlcbiAgICAgICAgOiBuZXdEZWxheTtcbn07XG52YXIgTEVWRUxfMF9FVkVOVFMgPSBbJ29ub3BlbicsICdvbmNsb3NlJywgJ29ubWVzc2FnZScsICdvbmVycm9yJ107XG52YXIgcmVhc3NpZ25FdmVudExpc3RlbmVycyA9IGZ1bmN0aW9uICh3cywgb2xkV3MsIGxpc3RlbmVycykge1xuICAgIE9iamVjdC5rZXlzKGxpc3RlbmVycykuZm9yRWFjaChmdW5jdGlvbiAodHlwZSkge1xuICAgICAgICBsaXN0ZW5lcnNbdHlwZV0uZm9yRWFjaChmdW5jdGlvbiAoX2EpIHtcbiAgICAgICAgICAgIHZhciBsaXN0ZW5lciA9IF9hWzBdLCBvcHRpb25zID0gX2FbMV07XG4gICAgICAgICAgICB3cy5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gICAgaWYgKG9sZFdzKSB7XG4gICAgICAgIExFVkVMXzBfRVZFTlRTLmZvckVhY2goZnVuY3Rpb24gKG5hbWUpIHtcbiAgICAgICAgICAgIHdzW25hbWVdID0gb2xkV3NbbmFtZV07XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG52YXIgUmVjb25uZWN0aW5nV2Vic29ja2V0ID0gZnVuY3Rpb24gKHVybCwgcHJvdG9jb2xzLCBvcHRpb25zKSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgIHZhciB3cztcbiAgICB2YXIgY29ubmVjdGluZ1RpbWVvdXQ7XG4gICAgdmFyIHJlY29ubmVjdERlbGF5ID0gMDtcbiAgICB2YXIgcmV0cmllc0NvdW50ID0gMDtcbiAgICB2YXIgc2hvdWxkUmV0cnkgPSB0cnVlO1xuICAgIHZhciBzYXZlZE9uQ2xvc2UgPSBudWxsO1xuICAgIHZhciBsaXN0ZW5lcnMgPSB7fTtcbiAgICAvLyByZXF1aXJlIG5ldyB0byBjb25zdHJ1Y3RcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgUmVjb25uZWN0aW5nV2Vic29ja2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRmFpbGVkIHRvIGNvbnN0cnVjdCAnUmVjb25uZWN0aW5nV2ViU29ja2V0JzogUGxlYXNlIHVzZSB0aGUgJ25ldycgb3BlcmF0b3JcIik7XG4gICAgfVxuICAgIC8vIFNldCBjb25maWcuIE5vdCB1c2luZyBgT2JqZWN0LmFzc2lnbmAgYmVjYXVzZSBvZiBJRTExXG4gICAgdmFyIGNvbmZpZyA9IGdldERlZmF1bHRPcHRpb25zKCk7XG4gICAgT2JqZWN0LmtleXMoY29uZmlnKVxuICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChrZXkpIHsgcmV0dXJuIG9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KTsgfSlcbiAgICAgICAgLmZvckVhY2goZnVuY3Rpb24gKGtleSkgeyByZXR1cm4gY29uZmlnW2tleV0gPSBvcHRpb25zW2tleV07IH0pO1xuICAgIGlmICghaXNXZWJTb2NrZXQoY29uZmlnLmNvbnN0cnVjdG9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIFdlYlNvY2tldCBjb25zdHJ1Y3Rvci4gU2V0IGBvcHRpb25zLmNvbnN0cnVjdG9yYCcpO1xuICAgIH1cbiAgICB2YXIgbG9nID0gY29uZmlnLmRlYnVnID8gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFyYW1zID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBwYXJhbXNbX2ldID0gYXJndW1lbnRzW19pXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgWydSV1M6J10uY29uY2F0KHBhcmFtcykpO1xuICAgIH0gOiBmdW5jdGlvbiAoKSB7IH07XG4gICAgLyoqXG4gICAgICogTm90IHVzaW5nIGRpc3BhdGNoRXZlbnQsIG90aGVyd2lzZSB3ZSBtdXN0IHVzZSBhIERPTSBFdmVudCBvYmplY3RcbiAgICAgKiBEZWZlcnJlZCBiZWNhdXNlIHdlIHdhbnQgdG8gaGFuZGxlIHRoZSBjbG9zZSBldmVudCBiZWZvcmUgdGhpc1xuICAgICAqL1xuICAgIHZhciBlbWl0RXJyb3IgPSBmdW5jdGlvbiAoY29kZSwgbXNnKSB7IHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihtc2cpO1xuICAgICAgICBlcnIuY29kZSA9IGNvZGU7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3RlbmVycy5lcnJvcikpIHtcbiAgICAgICAgICAgIGxpc3RlbmVycy5lcnJvci5mb3JFYWNoKGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgIHZhciBmbiA9IF9hWzBdO1xuICAgICAgICAgICAgICAgIHJldHVybiBmbihlcnIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHdzLm9uZXJyb3IpIHtcbiAgICAgICAgICAgIHdzLm9uZXJyb3IoZXJyKTtcbiAgICAgICAgfVxuICAgIH0sIDApOyB9O1xuICAgIHZhciBoYW5kbGVDbG9zZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbG9nKCdoYW5kbGVDbG9zZScsIHsgc2hvdWxkUmV0cnk6IHNob3VsZFJldHJ5IH0pO1xuICAgICAgICByZXRyaWVzQ291bnQrKztcbiAgICAgICAgbG9nKCdyZXRyaWVzIGNvdW50OicsIHJldHJpZXNDb3VudCk7XG4gICAgICAgIGlmIChyZXRyaWVzQ291bnQgPiBjb25maWcubWF4UmV0cmllcykge1xuICAgICAgICAgICAgZW1pdEVycm9yKCdFSE9TVERPV04nLCAnVG9vIG1hbnkgZmFpbGVkIGNvbm5lY3Rpb24gYXR0ZW1wdHMnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXJlY29ubmVjdERlbGF5KSB7XG4gICAgICAgICAgICByZWNvbm5lY3REZWxheSA9IGluaXRSZWNvbm5lY3Rpb25EZWxheShjb25maWcpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVjb25uZWN0RGVsYXkgPSB1cGRhdGVSZWNvbm5lY3Rpb25EZWxheShjb25maWcsIHJlY29ubmVjdERlbGF5KTtcbiAgICAgICAgfVxuICAgICAgICBsb2coJ2hhbmRsZUNsb3NlIC0gcmVjb25uZWN0RGVsYXk6JywgcmVjb25uZWN0RGVsYXkpO1xuICAgICAgICBpZiAoc2hvdWxkUmV0cnkpIHtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoY29ubmVjdCwgcmVjb25uZWN0RGVsYXkpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCFzaG91bGRSZXRyeSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGxvZygnY29ubmVjdCcpO1xuICAgICAgICB2YXIgb2xkV3MgPSB3cztcbiAgICAgICAgdmFyIHdzVXJsID0gKHR5cGVvZiB1cmwgPT09ICdmdW5jdGlvbicpID8gdXJsKCkgOiB1cmw7XG4gICAgICAgIHdzID0gbmV3IGNvbmZpZy5jb25zdHJ1Y3Rvcih3c1VybCwgcHJvdG9jb2xzKTtcbiAgICAgICAgY29ubmVjdGluZ1RpbWVvdXQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGxvZygndGltZW91dCcpO1xuICAgICAgICAgICAgd3MuY2xvc2UoKTtcbiAgICAgICAgICAgIGVtaXRFcnJvcignRVRJTUVET1VUJywgJ0Nvbm5lY3Rpb24gdGltZW91dCcpO1xuICAgICAgICB9LCBjb25maWcuY29ubmVjdGlvblRpbWVvdXQpO1xuICAgICAgICBsb2coJ2J5cGFzcyBwcm9wZXJ0aWVzJyk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiB3cykge1xuICAgICAgICAgICAgLy8gQHRvZG8gbW92ZSB0byBjb25zdGFudFxuICAgICAgICAgICAgaWYgKFsnYWRkRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVFdmVudExpc3RlbmVyJywgJ2Nsb3NlJywgJ3NlbmQnXS5pbmRleE9mKGtleSkgPCAwKSB7XG4gICAgICAgICAgICAgICAgYnlwYXNzUHJvcGVydHkod3MsIF90aGlzLCBrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIoJ29wZW4nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoY29ubmVjdGluZ1RpbWVvdXQpO1xuICAgICAgICAgICAgbG9nKCdvcGVuJyk7XG4gICAgICAgICAgICByZWNvbm5lY3REZWxheSA9IGluaXRSZWNvbm5lY3Rpb25EZWxheShjb25maWcpO1xuICAgICAgICAgICAgbG9nKCdyZWNvbm5lY3REZWxheTonLCByZWNvbm5lY3REZWxheSk7XG4gICAgICAgICAgICByZXRyaWVzQ291bnQgPSAwO1xuICAgICAgICB9KTtcbiAgICAgICAgd3MuYWRkRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBoYW5kbGVDbG9zZSk7XG4gICAgICAgIHJlYXNzaWduRXZlbnRMaXN0ZW5lcnMod3MsIG9sZFdzLCBsaXN0ZW5lcnMpO1xuICAgICAgICAvLyBiZWNhdXNlIHdoZW4gY2xvc2luZyB3aXRoIGZhc3RDbG9zZT10cnVlLCBpdCBpcyBzYXZlZCBhbmQgc2V0IHRvIG51bGwgdG8gYXZvaWQgZG91YmxlIGNhbGxzXG4gICAgICAgIHdzLm9uY2xvc2UgPSB3cy5vbmNsb3NlIHx8IHNhdmVkT25DbG9zZTtcbiAgICAgICAgc2F2ZWRPbkNsb3NlID0gbnVsbDtcbiAgICB9O1xuICAgIGxvZygnaW5pdCcpO1xuICAgIGNvbm5lY3QoKTtcbiAgICB0aGlzLmNsb3NlID0gZnVuY3Rpb24gKGNvZGUsIHJlYXNvbiwgX2EpIHtcbiAgICAgICAgaWYgKGNvZGUgPT09IHZvaWQgMCkgeyBjb2RlID0gMTAwMDsgfVxuICAgICAgICBpZiAocmVhc29uID09PSB2b2lkIDApIHsgcmVhc29uID0gJyc7IH1cbiAgICAgICAgdmFyIF9iID0gX2EgPT09IHZvaWQgMCA/IHt9IDogX2EsIF9jID0gX2Iua2VlcENsb3NlZCwga2VlcENsb3NlZCA9IF9jID09PSB2b2lkIDAgPyBmYWxzZSA6IF9jLCBfZCA9IF9iLmZhc3RDbG9zZSwgZmFzdENsb3NlID0gX2QgPT09IHZvaWQgMCA/IHRydWUgOiBfZCwgX2UgPSBfYi5kZWxheSwgZGVsYXkgPSBfZSA9PT0gdm9pZCAwID8gMCA6IF9lO1xuICAgICAgICBsb2coJ2Nsb3NlIC0gcGFyYW1zOicsIHsgcmVhc29uOiByZWFzb24sIGtlZXBDbG9zZWQ6IGtlZXBDbG9zZWQsIGZhc3RDbG9zZTogZmFzdENsb3NlLCBkZWxheTogZGVsYXksIHJldHJpZXNDb3VudDogcmV0cmllc0NvdW50LCBtYXhSZXRyaWVzOiBjb25maWcubWF4UmV0cmllcyB9KTtcbiAgICAgICAgc2hvdWxkUmV0cnkgPSAha2VlcENsb3NlZCAmJiByZXRyaWVzQ291bnQgPD0gY29uZmlnLm1heFJldHJpZXM7XG4gICAgICAgIGlmIChkZWxheSkge1xuICAgICAgICAgICAgcmVjb25uZWN0RGVsYXkgPSBkZWxheTtcbiAgICAgICAgfVxuICAgICAgICB3cy5jbG9zZShjb2RlLCByZWFzb24pO1xuICAgICAgICBpZiAoZmFzdENsb3NlKSB7XG4gICAgICAgICAgICB2YXIgZmFrZUNsb3NlRXZlbnRfMSA9IHtcbiAgICAgICAgICAgICAgICBjb2RlOiBjb2RlLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogcmVhc29uLFxuICAgICAgICAgICAgICAgIHdhc0NsZWFuOiB0cnVlLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIC8vIGV4ZWN1dGUgY2xvc2UgbGlzdGVuZXJzIHNvb24gd2l0aCBhIGZha2UgY2xvc2VFdmVudFxuICAgICAgICAgICAgLy8gYW5kIHJlbW92ZSB0aGVtIGZyb20gdGhlIFdTIGluc3RhbmNlIHNvIHRoZXlcbiAgICAgICAgICAgIC8vIGRvbid0IGdldCBmaXJlZCBvbiB0aGUgcmVhbCBjbG9zZS5cbiAgICAgICAgICAgIGhhbmRsZUNsb3NlKCk7XG4gICAgICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbG9zZScsIGhhbmRsZUNsb3NlKTtcbiAgICAgICAgICAgIC8vIHJ1biBhbmQgcmVtb3ZlIGxldmVsMlxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkobGlzdGVuZXJzLmNsb3NlKSkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVycy5jbG9zZS5mb3JFYWNoKGZ1bmN0aW9uIChfYSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbGlzdGVuZXIgPSBfYVswXSwgb3B0aW9ucyA9IF9hWzFdO1xuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcihmYWtlQ2xvc2VFdmVudF8xKTtcbiAgICAgICAgICAgICAgICAgICAgd3MucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xvc2UnLCBsaXN0ZW5lciwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBydW4gYW5kIHJlbW92ZSBsZXZlbDBcbiAgICAgICAgICAgIGlmICh3cy5vbmNsb3NlKSB7XG4gICAgICAgICAgICAgICAgc2F2ZWRPbkNsb3NlID0gd3Mub25jbG9zZTtcbiAgICAgICAgICAgICAgICB3cy5vbmNsb3NlKGZha2VDbG9zZUV2ZW50XzEpO1xuICAgICAgICAgICAgICAgIHdzLm9uY2xvc2UgPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICB0aGlzLnNlbmQgPSBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB3cy5zZW5kKGRhdGEpO1xuICAgIH07XG4gICAgdGhpcy5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3RlbmVyc1t0eXBlXSkpIHtcbiAgICAgICAgICAgIGlmICghbGlzdGVuZXJzW3R5cGVdLnNvbWUoZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgdmFyIGwgPSBfYVswXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbCA9PT0gbGlzdGVuZXI7XG4gICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgICAgIGxpc3RlbmVyc1t0eXBlXS5wdXNoKFtsaXN0ZW5lciwgb3B0aW9uc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgbGlzdGVuZXJzW3R5cGVdID0gW1tsaXN0ZW5lciwgb3B0aW9uc11dO1xuICAgICAgICB9XG4gICAgICAgIHdzLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgbGlzdGVuZXIsIG9wdGlvbnMpO1xuICAgIH07XG4gICAgdGhpcy5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24gKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGxpc3RlbmVyc1t0eXBlXSkpIHtcbiAgICAgICAgICAgIGxpc3RlbmVyc1t0eXBlXSA9IGxpc3RlbmVyc1t0eXBlXS5maWx0ZXIoZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgICAgICAgICAgdmFyIGwgPSBfYVswXTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbCAhPT0gbGlzdGVuZXI7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICB3cy5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcbiAgICB9O1xufTtcbm1vZHVsZS5leHBvcnRzID0gUmVjb25uZWN0aW5nV2Vic29ja2V0O1xuIl19
