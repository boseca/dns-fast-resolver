const net = require('net')
const dns = require('dns')
const _ = require('lodash')
const { Resolver } = require('dns')

const DEFAULT_RESOLVER_TIMEOUT = 4000  // 4s
const MIN_DOMAIN_LENGTH = 3

class FastResolver {
    constructor(options) {
        this._resolver = new Resolver()
        const servers = options && options.servers
        if (!_.isEmpty(servers)) this._resolver.setServers(servers)
        this._timeout = (_.isNumber(options && options.timeout)) ? options.timeout : DEFAULT_RESOLVER_TIMEOUT

        this.cancel = this.cancel.bind(this)
        this.resolve = this.resolve.bind(this)
    }

    static get IPv4() { return 4 }
    static get IPv6() { return 6 }
    /*
    * Resolver for hostnames that are already a valid IPv4 or IPv6 address.
    * Returns:  `ip` when `ip` is a valid IPv4 or IPv6 address.
    *           Otherwise returns null or [] when options.all is passed
    */
    static staticIpResolver(ip, options, callback) {
        // #region  parse parameters
        if (_.isFunction(options)) {
            callback = options
            options = {}
        } else if (_.isNumber(options)) {
            options = { family: options }
        } else if (!_.isPlainObject(options)) {
            throw new Error('options must be an object or an ip version number')
        }
        if (!_.isFunction(callback)) {
            throw new Error('callback param must be a function')
        }
        // #endregion

        const ipFamily = net.isIP(ip)
        const addr = {
            address: ip,        // assuming the IP is a valid IPs and don't need DNS resolving
            family: ipFamily
        }
        if (options.all) {
            callback(null, (ipFamily) ? [addr] : [])
        } else {
            callback(null, addr.address, addr.family)
        }
    }

    cancel() {
        return this._resolver && this._resolver.cancel && this._resolver.cancel()
    }

    resolve(hostname, options, callback) {
        // #region  parse parameters
        if (_.isFunction(options)) {
            callback = options
            options = {}
        } else if (_.isNumber(options)) {
            options = { family: options }
        } else if (!_.isPlainObject(options)) {
            throw new Error('options must be an object or an ip version number')
        }
        if (!_.isFunction(callback)) {
            throw new Error('callback param must be a function')
        }

        if (!hostname) {
            if (options.all) {
                process.nextTick(callback, null, [])
            } else {
                process.nextTick(
                    callback,
                    null,
                    null,
                    options.family === FastResolver.IPv6 ? FastResolver.IPv6 : FastResolver.IPv4
                )
            }
            return
        }
        if (!_.isString(hostname)) {
            throw new Error('hostname must be a string')
        }
        hostname = hostname.trim()
        options.timeout = _.isNumber(options.timeout) ? options.timeout : (this._timeout || DEFAULT_RESOLVER_TIMEOUT)

        if (!_.isEmpty(options.servers)) {
            this._resolver && this._resolver.setServers && this._resolver.setServers(options.servers)
        }
        // #endregion

        // max wait time
        const waitTimer = setTimeout(() => {
            this._resolver && this._resolver.cancel && this._resolver.cancel()
        }, options.timeout)

        const resolveCb = (err, addresses, family) => {
            // clean up
            clearTimeout(waitTimer)
            process.nextTick(() => { this._resolver = null })

            // call back
            if (callback) {
                if (err) callback(err)
                else if (options.all) callback(err, addresses)
                else callback(err, addresses, family)
            }
        }

        // choose resolve types
        let resolversList = []
        switch (options.family) {
        case FastResolver.IPv4:
            resolversList = ['resolve4']
            break
        case FastResolver.IPv6:
            resolversList = ['resolve6']
            break
        case undefined:
            resolversList = ['resolve4', 'resolve6']
            break
        default:
            throw new Error('invalid family number, must be one of the {4, 6} or undefined')
        }

        let proms

        // when hostname is an IP then skip the resolver
        if (hostname.length < MIN_DOMAIN_LENGTH) proms = [Promise.resolve([])]
        else if (net.isIP(hostname)) proms = [Promise.resolve([hostname])]
        else {
            proms = resolversList.map(fn => {
                return new Promise((resolve, reject) => {
                    this._resolver && this._resolver[fn](hostname, options, (err, addresses) => {
                        if (err) {
                            if ([dns.SERVFAIL, dns.NOTFOUND, dns.NODATA, dns.CANCELLED, dns.TIMEOUT].includes(err.code)) {
                                resolve([])
                            } else {
                                reject(err)
                            }
                        } else {
                            resolve(addresses || [])
                        }
                    })
                })
            })
        }

        // do resolve
        Promise.all(proms)
            .then(records => {
                const [ipv4records, ipv6records] = records

                if (options.all) {
                    const addresses = ipv4records.concat(ipv6records || []) || []

                    // convert results
                    const family = options.family
                    for (let i = 0; i < addresses.length; i++) {
                        const addr = addresses[i]
                        addresses[i] = {
                            address: addr,
                            family: family || net.isIP(addr)
                        }
                    }

                    return addresses
                } else if (!_.isEmpty(ipv4records)) {
                    return ipv4records
                } else if (!_.isEmpty(ipv6records)) {
                    return ipv6records
                } else {
                    return []
                }
            })
            .then(addresses => {
                addresses = addresses.filter(ip => ip !== '0.0.0.0') // remove 0 IP
                if (options.all) resolveCb(null, addresses)
                else resolveCb(null, addresses[0], options.family || net.isIP(addresses[0]))
            })
            .catch(err => {
                console.warn('FastResolver::run() error: ', err)
                resolveCb(err)
            })
    }
}

module.exports = FastResolver
