'use strict'
const FastResolver = require('./src/FastResolver')

const fastResolver = (...args) => {
    const _fastResolver = new FastResolver()
    return _fastResolver.resolve(...args)
}

module.exports = {
    fastResolver,
    FastResolver,
    staticIpResolver: FastResolver.staticIpResolver
}
