import assert from "assert";
import {Apis} from "../lib";

var coreAsset;

describe("Connection", () => {

    afterEach(function() {
        Apis.close();
    });

    // it("Connect to localhost", function() {
    //     return new Promise( function(resolve) {
    //         Apis.instance("ws://localhost:8090").init_promise.then(function (result) {
    //             coreAsset = result[0].network.core_asset;
    //
    //             if (typeof coreAsset === "string") {
    //                 resolve();
    //             } else {
    //                 reject(new Error("Expected coreAsset to be a string"));
    //             }
    //         });
    //     });
    // });


    it("Connect to Openledger", function() {
        return new Promise( function(resolve) {
            Apis.instance("wss://bitshares.openledger.info/ws", true).init_promise.then(function (result) {
                coreAsset = result[0].network.core_asset;
                assert(coreAsset === "BTS");
                resolve();
            });
        });
    });

    it("Connect to Testnet", function() {
        return new Promise( function(resolve) {
            Apis.instance("wss://testnet.bitshares.eu/ws", true).init_promise.then(function (result) {
                coreAsset = result[0].network.core_asset;
                assert(coreAsset === "TEST");
                resolve();
            });
        });
    });
});

describe("Api", () => {

    let cs = "wss://bitshares.openledger.info/ws";


    // after(function() {
    //     ChainConfig.reset();
    // });

    describe("Subscriptions", function() {

        beforeEach(function() {
            return Apis.instance(cs, true).init_promise.then(function (result) {
                coreAsset = result[0].network.core_asset;
            });
        });

        afterEach(function() {
            Apis.close();
        });

        it("Set subscribe callback", function() {
            return new Promise( function(resolve) {
                Apis.instance().db_api().exec( "set_subscribe_callback", [ callback, true ] ).then(function(sub) {
                    if (sub === null) {
                        resolve();
                    } else {
                        reject(new Error("Expected sub to equal null"));
                    }
                })

                function callback(obj) {
                    console.log("callback obj:", obj);
                    resolve()
                }
            })
        });

        it("Market subscription", function() {
            return new Promise( function(resolve) {
                Apis.instance().db_api().exec( "subscribe_to_market", [
                    callback, "1.3.0", "1.3.19"
                ] ).then(function(sub) {
                    if (sub === null) {
                        resolve();
                    } else {
                        reject(new Error("Expected sub to equal null"));
                    }
                })

                function callback() {
                    resolve()
                }
            })
        })

        it("Market unsubscribe", function() {
            this.timeout(10000);
            return new Promise( function(resolve) {
                Apis.instance().db_api().exec( "subscribe_to_market", [
                    callback, "1.3.0", "1.3.19"
                ] ).then(function() {

                    Apis.instance().db_api().exec("unsubscribe_from_market", [
                        callback, "1.3.0", "1.3.19"
                    ]).then(function(unsub) {
                        if (unsub === null) {
                            resolve();
                        } else {
                            reject(new Error("Expected unsub to equal null"));
                        }
                    })
                });

                function callback() {
                    resolve()
                }
            })
        })
    })

    describe("Api methods", function() {

        // Connect once for all tests
        before(function() {
            return Apis.instance(cs, true).init_promise.then(function (result) {
                coreAsset = result[0].network.core_asset;
            });
        });

        it("Get object", function() {
            return new Promise( function(resolve, reject) {
                Apis.instance().db_api().exec( "get_objects", [["2.0.0"]]).then(function(objects) {
                    if ((objects[0].id === "2.0.0")) {
                        resolve();
                    } else {
                        reject(new Error("Expected object with id 2.0.0"));
                    }

                })
            })
        });

        it("Get account by name", function() {
            return new Promise( function(resolve, reject) {
                Apis.instance().db_api().exec( "get_account_by_name", ["committee-account"]).then(function(account) {
                    if ((account.id === "1.2.0") && account.name === "committee-account") {
                        resolve();
                    } else {
                        reject(new Error("Expected object with id 1.2.0 and name committee-account"));
                    }

                })
            })
        });

        it("Get block", function() {
            return new Promise( function(resolve, reject) {
                Apis.instance().db_api().exec( "get_block", [1]).then(function(block) {
                    if (block.previous === "0000000000000000000000000000000000000000") {
                        resolve();
                    } else {
                        reject(new Error("Expected block with previous value of 0000000000000000000000000000000000000000"));
                    }
                })
            })
        });

        it ("Get full accounts", function() {
            return new Promise( function(resolve, reject) {
                Apis.instance().db_api().exec( "get_full_accounts", [["committee-account", "1.2.0"], true]).then(function(accounts) {
                    let byName = accounts[0][1];
                    let byId = accounts[1][1];
                    if (byName.account.id === "1.2.0" && byId.account.name === "committee-account") {
                        resolve();
                    } else {
                        reject(new Error("Expected objects with id 1.2.0 and name committee-account"));
                    }
                })
            })
        });

        it ("Lookup assets by symbol", function() {
            return new Promise( function(resolve, reject) {
                Apis.instance().db_api().exec( "lookup_asset_symbols", [ [coreAsset, coreAsset] ]).then(function(assets) {

                    if (assets[0].symbol === coreAsset && assets[1].symbol === coreAsset) {
                        resolve();
                    } else {
                        reject(new Error("Expected assets with symbol " +  coreAsset));
                    }
                })
            })
        });

        it ("List assets", function() {
            return new Promise( function(resolve, reject) {
                Apis.instance().db_api().exec( "list_assets", [ "A", 5 ]).then(function(assets) {
                    if (assets.length > 0) {
                        resolve();
                    } else {
                        reject(new Error("Expected assets with symbol " +  coreAsset));
                    }
                })
            })
        });


        it ("Get market data", function() {
            return new Promise( function(resolve, reject) {
                if (coreAsset !== "BTS") {
                    reject(new Error("This test will only work when connected to a BTS api"));
                }
                Apis.instance().history_api().exec("get_fill_order_history", ["1.3.121", "1.3.0", 10])
                .then(function(history) {
                    if (history.length > 0) {
                        resolve();
                    } else {
                        reject(new Error("Expected market history of at least one entry"));
                    }
                })
            })
        });




    });
        /*


        it("Asset by id", function() {
            return new Promise( function(resolve) {
                ChainStore.subscribe(function() {
                    assert(ChainStore.getAsset("1.3.0") != null)
                    resolve()
                })
                assert(ChainStore.getAsset("1.3.0") === undefined)
            })
        })

        it("Object by id", function() {
            return new Promise( function(resolve) {
                ChainStore.subscribe(function() {
                    assert(ChainStore.getAsset("2.0.0") != null)
                    resolve()
                })
                assert(ChainStore.getAsset("2.0.0") === undefined)
            })
        })

        */

        //     ChainStore.getAccount("not found")
        //
        //     ChainStore.unsubscribe(cb)
        //     // return FetchChain("getAccount", "notfound")
        //     let cb = res => console.log('res',res)
        //     // })
        // })


})
