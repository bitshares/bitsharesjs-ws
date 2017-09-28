import Apis from "./ApiInstances";
import ChainWebSocket from "./ChainWebSocket";

class Manager {
    constructor({url, urls}) {
        this.url = url;
        this.urls = urls.filter(a => a !== url);
    }

    static close() {
        return Apis.close();
    }

    logFailure(url, err) {
        console.error("Skipping to next full node API server. Error: " + (err ? JSON.stringify(err.message) : ""));
    }

    connect(connect = true, url = this.url, enableCrypto = false) {
        return new Promise((resolve, reject) => {
            Apis.instance(url, connect, undefined, enableCrypto).init_promise
            .then((res) => {
                this.url = url;
                resolve(res);
            }).catch((err) => {
                Apis.close().then(() => {
                    reject(new Error("Unable to connect to node: " + url + ", error:" + JSON.stringify(err && err.message)));
                });
            });
        });
    }

    connectWithFallback(connect = true, url = this.url, index = 0, resolve = null, reject = null, enableCrypto) {
        if (reject && (index > this.urls.length)) return reject(new Error("Tried "+ (index) +" connections, none of which worked: " + JSON.stringify(this.urls.concat(this.url))));
        const fallback = (err, resolve, reject) => {
            this.logFailure(url, err);
            return this.connectWithFallback(connect, this.urls[index], index + 1, resolve, reject, enableCrypto);
        }
        if (resolve && reject) {
            return this.connect(connect, url, enableCrypto)
            .then(resolve)
            .catch((err) => {
                fallback(err, resolve, reject);
            })
        } else {
            return new Promise((resolve, reject) => {
                this.connect(connect, undefined, enableCrypto)
                .then(resolve)
                .catch((err) => {
                    fallback(err, resolve, reject);
                })
            })
        }
    }

    checkConnections(rpc_user = "", rpc_password = "", resolve, reject) {
        let connectionStartTimes = {};
        const checkFunction = (resolve, reject) => {
            let fullList = this.urls.concat(this.url);
            let connectionPromises = [];

            fullList.forEach(url => {
                let conn = new ChainWebSocket(url, () => {});
                connectionStartTimes[url] = new Date().getTime();
                connectionPromises.push(() => {
                    return conn.login(rpc_user, rpc_password).then((data) => {
                        let result = {[url]: new Date().getTime() - connectionStartTimes[url]};
                        return conn.close().then(() => result);
                    }).catch(err => {
                        if (url === this.url) {
                            this.url = this.urls[0];
                        } else {
                            this.urls = this.urls.filter(a => a !== url);
                        }
                        return conn.close().then(() => null);
                    })
                });
            });

            Promise.all(
                connectionPromises.map(a => a())
            ).then((res) => {
                resolve(res.filter(a => !!a).reduce((f, a) => {
                    let key = Object.keys(a)[0];
                    f[key] = a[key];
                    return f;
                }, {}));
            }).catch(() => {
                return this.checkConnections(rpc_user, rpc_password, resolve, reject);
            });
        };

        if (resolve && reject) {
            checkFunction(resolve, reject);
        } else {
            return new Promise(checkFunction)
        }

    }
}

export default Manager;
