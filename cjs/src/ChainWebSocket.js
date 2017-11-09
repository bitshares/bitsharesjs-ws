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
            // console.error("keep alive timeout.");
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