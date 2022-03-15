(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.myPromise = factory());
})(this, (function () { 'use strict';

    const PENDING = 'pending';
    const FULFILLED = 'fulfilled';
    const REJECTED = 'rejected';

    class myPromise {
        constructor(executor) {
            this.status = PENDING;
            this.value = undefined;
            this.reason = undefined;
            this.onResolvedCallbacks = [];  // 存放成功的回调
            this.onRejectedCallbacks = [];  // 存放失败的回调

            const resolve = (value) => {
                if(value instanceof myPromise){ 
                    return value.then(resolve,reject) 
                }
                if (this.status === PENDING) {
                    this.value = value;
                    this.status = FULFILLED;
                    this.onResolvedCallbacks.forEach(fn => fn());
                }
            };

            const reject = (reason) => {
                if (this.status === PENDING) {
                    this.reason = reason;
                    this.status = REJECTED;
                    this.onRejectedCallbacks.forEach(fn => fn());
                }
            };

            try {
                executor(resolve, reject);
            } catch (e) {
                reject(e);
            }
        }
        then(onFulFilled, onRejected) {
            onFulFilled = typeof onFulFilled === 'function' ? onFulFilled : v => v;
            onRejected = typeof onRejected === 'function' ? onRejected : err => { throw err };
            let promise2 = new myPromise((resolve, reject) => {
                if (this.status === FULFILLED) {
                    setTimeout(() => {
                        try {
                            let x = onFulFilled(this.value);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    }, 0);
                }
                if (this.status === REJECTED) {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason);
                            resolvePromise(promise2, x, resolve, reject);
                        } catch (error) {
                            reject(error);
                        }
                    }, 0);

                }
                if (this.status === PENDING) { // 代码是异步调用resolve或者reject 订阅模式
                    // 不直接push onRejected(this.reason)或者 onFulFilled(this.value)目的是可以加入自己的逻辑
                    this.onRejectedCallbacks.push(() => {
                        // do something
                        setTimeout(() => {
                            try {
                                let x = onRejected(this.reason);
                                resolvePromise(promise2, x, resolve, reject);
                            } catch (error) {
                                reject(error);
                            }
                        }, 0);

                    });
                    this.onResolvedCallbacks.push(() => {
                        setTimeout(() => {
                            try {
                                let x = onFulFilled(this.value);
                                resolvePromise(promise2, x, resolve, reject);
                            } catch (error) {
                                reject(error);
                            }
                        }, 0);

                    });

                }

            });
            return promise2
        }
    }

    function resolvePromise(promise2, x, resolve, reject) {
        if (promise2 === x) {
            return reject(new TypeError('Chaining cycle detected for promise'))
        }

        if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
            let called = false; // 保证改变状态后不可逆
            try { // 有可能then方法是通过defineProperty实现的，取值时会发生异常，当发生异常的时候直接调用reject
                let then = x.then;
                if (typeof then === 'function') {
                    // 如果then是一个函数，那么认为x是一个promise,不写成x.then()是避免触发getter的时候发生异常
                    then.call(x, (y) => {
                        if (called) return
                        called = true;
                        resolvePromise(promise2, y, resolve, reject); // 嵌套promise的情形，直到解析值为普通值为止
                    }, (r) => {
                        if (called) return
                        called = true;
                        reject(r);
                    });
                } else {
                    resolve(x); // 如果then不是函数，那么认为x是一个普通值，直接调用resolve
                }
            } catch (err) {
                if (called) return
                called = true;
                reject(err);
            }
        } else {
            // x是一个普通值
            resolve(x);
        }
    }

    myPromise.deferred = function () {
        let dfd = {};
        dfd.promise = new myPromise((resolve, reject) => {
            dfd.resolve = resolve;
            dfd.reject = reject;
        });

        return dfd
    };

    var core = myPromise;

    return core;

}));
