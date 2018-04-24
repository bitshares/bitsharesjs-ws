// var { List } = require("immutable");
import ChainWebSocket from "./ChainWebSocket";
import GrapheneApi from "./GrapheneApi";
import ChainConfig from "./ChainConfig";

if (global) { global.inst = ""; } else { let inst; };
let autoReconnect = false; // by default don't use reconnecting-websocket
/**
    Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

    Import: import { Apis } from "@graphene/chain"

    Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

    Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
*/

export default {

    setRpcConnectionStatusCallback: function(callback) {
        this.statusCb = callback;
        if(inst) inst.setRpcConnectionStatusCallback(callback);
    },

    /**
        @arg {boolean} auto means automatic reconnect if possible( browser case), default true
    */
    setAutoReconnect: function ( auto ) {
        autoReconnect = auto;
    },

    /**
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    reset: function ( cs = "ws://localhost:8090", connect, connectTimeout = 4000, optionalApis, closeCb ) {
        return this.close().then(() => {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);

            if (inst && connect) {
                inst.connect(cs, connectTimeout, optionalApis, closeCb);
            }

            return inst;
        })

    },
    instance: function ( cs = "ws://localhost:8090", connect, connectTimeout = 4000, optionalApis, closeCb) {
        if ( ! inst ) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs, connectTimeout, optionalApis);
        }
        if (closeCb) inst.closeCb = closeCb;
        return inst;
    },
    chainId: ()=> Apis.instance().chain_id,

    close: () => {
        if (inst) {
            return new Promise((res) => {
                inst.close().then(() => {
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

class ApisInstance {

    /** @arg {string} connection .. */
    connect( cs, connectTimeout, optionalApis = {enableCrypto: false, enableOrders: false} ) {
        // console.log("INFO\tApiInstances\tconnect\t", cs);
        this.url = cs;
        let rpc_user = "", rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        if( this.ws_rpc) {
            this.ws_rpc.statusCb = null;
        }
        this.ws_rpc = new ChainWebSocket(cs, this.statusCb, connectTimeout, autoReconnect, (closed)=>{
            if(this._db && !closed) {
                this._db.exec('get_objects', [['2.1.0']])
                    .catch((e)=>{

                    })
            }
        });
        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(() => {
            console.log("Connected to API node:", cs);
            this._db = new GrapheneApi(this.ws_rpc, "database");
            this._net = new GrapheneApi(this.ws_rpc, "network_broadcast");
            this._hist = new GrapheneApi(this.ws_rpc, "history");
            if (optionalApis.enableOrders) this._orders = new GrapheneApi(this.ws_rpc, "orders");
            if (optionalApis.enableCrypto) this._crypt = new GrapheneApi(this.ws_rpc, "crypto");
            var db_promise = this._db.init().then( ()=> {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return this._db.exec("get_chain_id",[]).then( _chain_id => {
                    this.chain_id = _chain_id
                    return ChainConfig.setChainId( _chain_id )
                    //DEBUG console.log("chain_id1",this.chain_id)
                });
            });
            this.ws_rpc.on_reconnect = () => {
                if (!this.ws_rpc) return;
                this.ws_rpc.login("", "").then(() => {
                    this._db.init().then(() => {
                        if(this.statusCb)
                            this.statusCb("reconnect");
                    });
                    this._net.init();
                    this._hist.init();
                    if (optionalApis.enableOrders) this._orders.init();
                    if (optionalApis.enableCrypto) this._crypt.init();
                });
            }
            this.ws_rpc.on_close = () => {
                this.close().then(() => {
                    if (this.closeCb) this.closeCb();
                })
            }
            let initPromises = [
                db_promise,
                this._net.init(),
                this._hist.init(),
            ];

            if (optionalApis.enableOrders) initPromises.push(this._orders.init());
            if (optionalApis.enableCrypto) initPromises.push(this._crypt.init());
            return Promise.all(initPromises);
        }).catch(err => {
            console.error(cs, "Failed to initialize with error", err && err.message);
            return this.close().then(() => {
                throw err;
            });
        })
    }

    close() {
        if (this.ws_rpc && this.ws_rpc.ws.readyState === 1) {
            return this.ws_rpc.close()
            .then(() => {
                this.ws_rpc = null;
            });
        };
        this.ws_rpc = null;
        return Promise.resolve();
    }

    db_api () {
        return this._db;
    }

    network_api () {
        return this._net;
    }

    history_api () {
        return this._hist;
    }

    crypto_api () {
        return this._crypt;
    }

    orders_api () {
        return this._orders;
    }

    setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    }

}
