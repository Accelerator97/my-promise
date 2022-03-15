import commonjs from 'rollup-plugin-commonjs'
export default {
    input:'./src/core.js',
    output:{
        file:'./dist/index.js',
        format:'umd',
        name:'myPromise'
    },
    plugins:[
        commonjs()
    ]
}