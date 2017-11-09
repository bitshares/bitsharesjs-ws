"use strict";

exports.__esModule = true;

var _ApiInstances = require("./ApiInstances");

var _ApiInstances2 = _interopRequireDefault(_ApiInstances);

var _ChainWebSocket = require("./ChainWebSocket");

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Manager = function () {
    function Manager(_ref) {
        var url = _ref.url,
            urls = _ref.urls;

        _classCallCheck(this, Manager);

        this.url = url;
        this.urls = urls.filter(function (a) {
            return a !== url;
        });
    }

    Manager.close = function close() {
        return _ApiInstances2.default.close();
    };

    Manager.prototype.logFailure = function logFailure(url, err) {
        console.error("Skipping to next full node API server. Error: " + (err ? JSON.stringify(err.message) : ""));
    };

    Manager.prototype.connect = function connect() {
        var _connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

        var _this = this;

        var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;
        var enableCrypto = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

        return new Promise(function (resolve, reject) {
            _ApiInstances2.default.instance(url, _connect, undefined, enableCrypto).init_promise.then(function (res) {
                _this.url = url;
                resolve(res);
            }).catch(function (err) {
                _ApiInstances2.default.close().then(function () {
                    reject(new Error("Unable to connect to node: " + url + ", error:" + JSON.stringify(err && err.message)));
                });
            });
        });
    };

    Manager.prototype.connectWithFallback = function connectWithFallback() {
        var connect = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
        var url = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.url;
        var index = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
        var resolve = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

        var _this2 = this;

        var reject = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : null;
        var enableCrypto = arguments[5];

        if (reject && index > this.urls.length) return reject(new Error("Tried " + index + " connections, none of which worked: " + JSON.stringify(this.urls.concat(this.url))));
        var fallback = function fallback(err, resolve, reject) {
            _this2.logFailure(url, err);
            return _this2.connectWithFallback(connect, _this2.urls[index], index + 1, resolve, reject, enableCrypto);
        };
        if (resolve && reject) {
            return this.connect(connect, url, enableCrypto).then(resolve).catch(function (err) {
                fallback(err, resolve, reject);
            });
        } else {
            return new Promise(function (resolve, reject) {
                _this2.connect(connect, undefined, enableCrypto).then(resolve).catch(function (err) {
                    fallback(err, resolve, reject);
                });
            });
        }
    };

    Manager.prototype.checkConnections = function checkConnections() {
        var rpc_user = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";
        var rpc_password = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "";

        var _this3 = this;

        var resolve = arguments[2];
        var reject = arguments[3];

        var connectionStartTimes = {};
        var checkFunction = function checkFunction(resolve, reject) {
            var fullList = _this3.urls.concat(_this3.url);
            var connectionPromises = [];

            fullList.forEach(function (url) {
                var conn = new _ChainWebSocket2.default(url, function () {});
                connectionStartTimes[url] = new Date().getTime();
                connectionPromises.push(function () {
                    return conn.login(rpc_user, rpc_password).then(function (data) {
                        var _result;

                        var result = (_result = {}, _result[url] = new Date().getTime() - connectionStartTimes[url], _result);
                        return conn.close().then(function () {
                            return result;
                        });
                    }).catch(function (err) {
                        if (url === _this3.url) {
                            _this3.url = _this3.urls[0];
                        } else {
                            _this3.urls = _this3.urls.filter(function (a) {
                                return a !== url;
                            });
                        }
                        return conn.close().then(function () {
                            return null;
                        });
                    });
                });
            });

            Promise.all(connectionPromises.map(function (a) {
                return a();
            })).then(function (res) {
                resolve(res.filter(function (a) {
                    return !!a;
                }).reduce(function (f, a) {
                    var key = Object.keys(a)[0];
                    f[key] = a[key];
                    return f;
                }, {}));
            }).catch(function () {
                return _this3.checkConnections(rpc_user, rpc_password, resolve, reject);
            });
        };

        if (resolve && reject) {
            checkFunction(resolve, reject);
        } else {
            return new Promise(checkFunction);
        }
    };

    return Manager;
}();

exports.default = Manager;
module.exports = exports["default"];