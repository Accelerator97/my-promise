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
                if (value instanceof myPromise) {
                    return value.then(resolve, reject)
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

        static resolve(value) {
            return new myPromise((resolve, reject) => {
                resolve(value);
            })
        }

        static reject(reason) {
            return new myPromise((resolve, reject) => {
                reject(reason);
            })
        }
        static all(promises) {
            return new myPromise((resolve, reject) => {
                let res = [];
                let times = 0; // 计算成功的个数

                const handleSuccess = (index, val) => {
                    res[index] = val;
                    if(++times === promises.length){
                        resolve(res);
                    }
                };

                for (let i = 0; i < promises.length; i++) {
                    // 判断是否是promises,如果是调用then方法获取结果
                    let p = promises[i];
                    if (p && typeof p.then === 'function') {
                        p.then((data) => {
                            handleSuccess(i,data);
                        }, reject); // 如果某一个promise失败了 直接走失败即可
                    }else {
                        // 如果不是promise，直接把坐标和数据传入
                        handleSuccess(i,p); 
                    }
                }
            })
        }

        static race(promises){
            return new myPromise((resolve,reject)=>{
                for(let i = 0 ; i < promises.length ; i++){
                    let p = promises[i];
                    if(p && typeof p.then === 'function'){
                        p.then(resolve,reject); // 一旦成功就直接 停止
                    }else {
                        resolve(p);
                    }
                }
            })
        }
        
        catch(errFn) {
            return this.then(null, errFn)
        }
        finally(cb){
            // 这个data是上一次成功的结果
            return this.then((data)=>{
                // 如果cb返回的是一个promise，要等待这个promise执行完毕，所以用resolve方法包裹
                // 并且把上一次成功的结果往下传递
                // 并没有把cb执行完成功的结果n往下传递 
                return myPromise.resolve(cb()).then(()=>data)
            },(err)=>{
                // 上一个失败的结果往下传递
                // 如果cb返回的是一个promise，如果这个promise状态为失败，就不会走then方法向外抛出上一个失败的结果
                // 而是直接reject，后面的catch或者下一个then的失败回调会捕获到这个错误
                return myPromise.resolve(cb()).then(()=>{throw err})
            })
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
