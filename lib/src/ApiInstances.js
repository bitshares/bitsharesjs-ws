// var { List } = require("immutable");
import ChainWebSocket from "./ChainWebSocket";
import GrapheneApi from "./GrapheneApi";
import ChainConfig from "./ChainConfig";

let inst;

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
        @arg {string} cs is only provided in the first call
        @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
    */
    reset: function ( cs = "ws://localhost:8090", connect, connectTimeout = 4000 ) {
        if ( inst ) {
            inst.close();
            inst = null;
        }
        inst = new ApisInstance();
        inst.setRpcConnectionStatusCallback(this.statusCb);

        if (inst && connect) {
            inst.connect(cs, connectTimeout);
        }

        return inst;
    },
    instance: function ( cs = "ws://localhost:8090", connect, connectTimeout = 4000, enableCrypto) {
        if ( ! inst ) {
            inst = new ApisInstance();
            inst.setRpcConnectionStatusCallback(this.statusCb);
        }

        if (inst && connect) {
            inst.connect(cs, connectTimeout, enableCrypto);
        }

        return inst;
    },
    chainId: ()=> Apis.instance().chain_id,

    close: () => {
        if (inst) {
            inst.close();
            inst = null;
        }
    }
    // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
    // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
    // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
    // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

class ApisInstance {

    /** @arg {string} connection .. */
    connect( cs, connectTimeout, enableCrypto = false ) {
        // console.log("INFO\tApiInstances\tconnect\t", cs);

        let rpc_user = "", rpc_password = "";
        if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
            throw new Error("Secure domains require wss connection");
        }

        this.ws_rpc = new ChainWebSocket(cs, this.statusCb, connectTimeout);

        this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(() => {
            console.log("Connected to API node:", cs);
            this._db = new GrapheneApi(this.ws_rpc, "database");
            this._net = new GrapheneApi(this.ws_rpc, "network_broadcast");
            this._hist = new GrapheneApi(this.ws_rpc, "history");
            if (enableCrypto) this._crypt = new GrapheneApi(this.ws_rpc, "crypto");
            var db_promise = this._db.init().then( ()=> {
                //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
                return this._db.exec("get_chain_id",[]).then( _chain_id => {
                    this.chain_id = _chain_id
                    return ChainConfig.setChainId( _chain_id )
                    //DEBUG console.log("chain_id1",this.chain_id)
                });
            });

            let initPromises = [
                db_promise,
                this._net.init(),
                this._hist.init(),
            ];
            if (enableCrypto) initPromises.push(this._crypt.init());
            return Promise.all(initPromises);
        });
    }

    close() {
        if (this.ws_rpc) this.ws_rpc.close();
        this.ws_rpc = null;
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

    setRpcConnectionStatusCallback(callback) {
        this.statusCb = callback;
    }

}
