const { defineConfig } = require('@vue/cli-service')

// console.log(this, process.env);

module.exports = defineConfig({
    // publicPath: './'
    publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
})