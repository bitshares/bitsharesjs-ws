import assert from "assert";
import { Manager, Apis } from "../lib";

var defaultUrl = "wss://eu.nodes.bitshares.ws";

var faultyNodeList = [
    {url: "wss://bitsqsdqsdhares.openledger.info/ws", location: "Nuremberg, Germany"},
    {url: "wss://bitazdazdshares.openledger.info/ws", location: "Nuremberg, Germany"},
    {url: "wss://bitshaazdzares.openledger.info/ws", location: "Nuremberg, Germany"},
    {url: "wss://bit.btzadazdsabc.org/ws", location: "Hong Kong"},
    {url: "ws://127.0.0.1:8091", location: "Hangzhou, China"},
    {url: "wss://bitshares.openledger.info/ws", location: "Nuremberg, Germany"},
    {url: "wss://secure.freedomledger.com/ws", location: "Toronto, Canada"},
    {url: "wss://node.testnet.bitshares.eu", location: "Public Testnet Server (Frankfurt, Germany)"}
];

var noWorkingNodes = [
    {url: "wss://bitsqsdqsdhares.openledger.info/ws", location: "Nuremberg, Germany"},
    {url: "wss://bitazdazdshares.openledger.info/ws", location: "Nuremberg, Germany"},
    {url: "wss://bitshaazdzares.openledger.info/ws", location: "Nuremberg, Germany"},
    {url: "wss://bit.btzadazdsabc.org/ws", location: "Hong Kong"},
    {url: "ws://127.23230.0.1:8091", location: "Hangzhou, China"},
    {url: "wss://bitshasdares.dacplay.org:8089/ws", location:  "Hangzhou, China"},
    {url: "wss://secuasdre.freedomledger.com/ws", location: "Toronto, Canada"},
    {url: "wss://testnet.bitshares.eu/wqsdsqs", location: "Public Testnet Server (Frankfurt, Germany)"}
];

var goodNodeList = [
    {url: "wss://bitshares.openledger.info/ws", location: "Nuremberg, Germany"},
    {url: "wss://bit.btsabc.org/ws", location: "Hong Kong"},
    {url: "wss://bts.transwiser.com/ws", location: "Hangzhou, China"},
    {url: "wss://bitshares.dacplay.org:8089/ws", location:  "Hangzhou, China"},
    {url: "wss://openledger.hk/ws", location: "Hong Kong"},
    {url: "wss://secure.freedomledger.com/ws", location: "Toronto, Canada"},
    {url: "wss://node.testnet.bitshares.eu", location: "Public Testnet Server (Frankfurt, Germany)"}
];

/* This node currently throws an API error for the crypto API */
var failedInitNodes = [
    {url: "wss://bitshares.crypto.fans/ws", location: "Munich"}
];

describe("Connection Manager", function() {

    afterEach(function() {
        return new Promise(function(res) {
            Manager.close().then(res);
        })
    });

    it("Instantiates", function() {
        let man = new Manager({url: defaultUrl, urls: faultyNodeList.map(a => a.url)});
        assert.equal(man.url, defaultUrl);
    });

    it("Tries to connect default url", function() {
        this.timeout(3000);
        let man = new Manager({url: defaultUrl, urls: faultyNodeList.map(a => a.url)});
        return new Promise( function(resolve, reject) {
            man.connect().then(resolve)
            .catch(reject)
        });
    });

    it("Tries to connect to fallback and updates current url on connection success", function() {
        this.timeout(15000);
        let man = new Manager({url: "ws://127.0.0.1:8092", urls: faultyNodeList.map(a => a.url)});
        return new Promise( function(resolve, reject) {
            man.connectWithFallback().then(function() {
                assert.equal(man.url, "wss://bitshares.openledger.info/ws");
                resolve();
            })
            .catch(reject)
        });
    });

    it("Rejects if no connections are successful ", function() {
        this.timeout(15000);
        let man = new Manager({url: "ws://127.0.0.1:8092", urls: noWorkingNodes.map(a => a.url)});
        return new Promise( function(resolve, reject) {
            man.connectWithFallback().then(reject)
            .catch(resolve);
        });
    });

    it("Can check connection times for all connections", function() {
        this.timeout(20000);
        let man = new Manager({url: "ws://127.0.0.1:8090", urls: goodNodeList.map(a => a.url).concat([
            "wss://bit.btsabc.org/ws",
            "wss://secure.freedomledger.com/ws"
        ])});
        return new Promise( function(resolve, reject) {
            man.checkConnections().then(resolve).catch(reject);
        });
    });

    it("Can automatically fallback when closed", function() {
        this.timeout(20000);
        let man = new Manager({
            url: "wss://eu.nodes.bitshares.ws",
            urls: ([
                "wss://eu.nodes.bitshares.ws",
                "wss://bitshares.openledger.info/ws"
            ]),
            autoFallback: true
        });

        return new Promise( function(resolve, reject) {
            man.connectWithFallback().then(function() {
                // Assign faulty url to simulate faulty connection
                man.url = faultyNodeList[0].url;
                Apis.instance().ws_rpc.ws.close();
                setTimeout(function() {
                    if (man.isConnected) {
                        resolve();
                        /* Set autoFallback to false here to prevent permanent reconnections*/
                        man.autoFallback = false;
                    }
                    else reject();
                }, 2000);
            });
        });
    });

    it("Can call a fallbackCb when closed", function() {
        this.timeout(20000);
        return new Promise( function(resolve, reject) {

        let man = new Manager({
            url: "wss://eu.nodes.bitshares.ws",
            urls: ([
                "wss://eu.nodes.bitshares.ws",
                "wss://eu.openledger.info/ws"
            ]),
            closeCb: function() {
                resolve();
            }
        });

            man.connectWithFallback().then(function() {
                Apis.instance().ws_rpc.ws.close();
            });
        });
    })

    // it("Throws an error if an API fails to initialize", function() {
    //     this.timeout(5000);
    //     let man = new Manager({url: failedInitNodes[0].url, urls: []});
    //     return new Promise(function(resolve, reject) {
    //         man.connect(undefined, undefined, true).then(function(res) {
    //             reject();
    //         }).catch(function(err) {
    //             resolve();
    //         });
    //     });
    // });

});
