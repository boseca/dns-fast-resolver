const net = require('net')
const util = require('util')
const { assert } = require('chai')

const SHOW_COMMENTS = false
const INVALID_DNS_SERVER = '4.4.4.4'

describe('Unit: FastResolver', function () {
    describe('FastResolver class', function () {
        it('Cancel resolver', function () {
            const item = JSON.parse(JSON.stringify(require('../../_test_sites')))[0] // google.com
            const fastResolver = require('../../../index')
            const _fastResolver = new fastResolver.FastResolver({ servers: [INVALID_DNS_SERVER] })

            // cancel resolver
            setTimeout(() => _fastResolver && _fastResolver.cancel(), 50)

            // run resolver with slow dns server
            return new Promise((resolve, reject) => {
                _fastResolver.resolve(
                    item.Hostname,
                    (err, address, family) => {
                        if (err) {
                            reject(err)
                        } else {
                            item.address = address
                            resolve(item)
                        }
                    })
            })
                .catch(err => {
                    assert.isNotOk(err, `Unexpected resolver error! ${err}`)
                })
                .then(result => {
                    assert.isNotOk(result && result.address, 'Expected address to be null for cancelled resolver')
                })
        })
        it('Should timeout within specified timeout value', function () {
            const start = process.hrtime()
            const timeout = 100 // ms
            const hosts = JSON.parse(JSON.stringify(require('../../_test_sites'))).slice(0, 1)
            return runFastResolver(hosts, { servers: [INVALID_DNS_SERVER], timeout })    // invalid DNS server to similuate DNS server outage
                .then(results => {
                    // address should `undefined`
                    assert.isNotOk(results[0].address, 'Hostname IP should not be resolved with an invalid DNS server')

                    // delta time should be < 300ms
                    const end = process.hrtime(start)
                    var elapsedTime = Math.round((end[0] * 1e9 + end[1]) / 1e6 * 100) / 100 // ms
                    const maxTime = timeout + 100 // ms
                    assert.isBelow(elapsedTime, maxTime, `Resolver should timeout within ${maxTime} ms`)
                })
        })
    })
    describe('FastResolver::resolve', function () {
        it('resolve "_test_sites.js"', function () {
            const hosts = JSON.parse(JSON.stringify(require('../../_test_sites')))
            return runFastResolver(hosts)
                .then(results => {
                    const unresolved = results.filter(v => (v.IPv4 && !v.address)) || []
                    assert.isOk(results.length > 0 && unresolved.length === 0, `unresolved hosts: ${JSON.stringify(unresolved)}`)
                })
        })
        it('resolve "_test_sites.js" IPv4', function () {
            const hosts = JSON.parse(JSON.stringify(require('../../_test_sites')))
            return runFastResolver(hosts, { family: 4, timeout: 2000 })
                .then(results => {
                    const unresolved = results.filter(v => (v.IPv4 && (!v.address || net.isIP(v.address) !== 4))) || []
                    assert.isOk(results.length > 0 && unresolved.length === 0, `unresolved IPv4 hosts: ${JSON.stringify(unresolved)}`)
                })
        })
        it('resolve "_test_sites.js" IPv6', function () {
            const hosts = JSON.parse(JSON.stringify(require('../../_test_sites')))
            return runFastResolver(hosts, { family: 6, timeout: 2000 })
                .then(results => {
                    const unresolved = results.filter(v => (v.IPv6 && (!v.address || net.isIP(v.address) !== 6))) || []
                    assert.isOk(results.length > 0 && unresolved.length === 0, `unresolved IPv6 hosts: ${JSON.stringify(unresolved)}`)
                })
        })

        it('resolve "_test_sites.js" and return `all` IPs', function () {
            const hosts = JSON.parse(JSON.stringify(require('../../_test_sites')))
            return runFastResolver(hosts, { all: true, timeout: 2000 })
                .then(results => {
                    const multipleIp4 = results.find(v => (v.address && v.address.length > 1))
                    assert.isOk(multipleIp4, 'There has to be at least one host with multiple IPv4 addresses')

                    const multipleIp6 = results.find(v => (v.address && v.address.length > 1))
                    assert.isOk(multipleIp6, 'There has to be at least one host with multiple IPv6 addresses')

                    const unresolvedIp4 = results.filter(v => (v.IPv4 && (!v.address || !v.address.some(ip => net.isIP(ip.address) === 4)))) || []
                    assert.isNotOk(unresolvedIp4.length, `Some IP4 addresses are not resolved : ${util.inspect(unresolvedIp4, { depth: 5 })}`)

                    const unresolvedIp6 = results.filter(v => (v.IPv6 && (!v.address || !v.address.some(ip => net.isIP(ip.address) === 6)))) || []
                    assert.isNotOk(unresolvedIp6.length, `Some IP6 addresses are not resolved : ${util.inspect(unresolvedIp6, { depth: 5 })}`)
                })
        })
        it('resolve "_test_sites.js" with custom DNS server', function () {
            const hosts = JSON.parse(JSON.stringify(require('../../_test_sites')))
            return runFastResolver(hosts, { servers: [INVALID_DNS_SERVER], timeout: 2000 })    // invalid DNS server to similuate DNS server outage
                .then(results => {
                    const ips = results.filter(v => (net.isIP(v.Hostname) > 0 && v.Hostname !== v.address))
                    assert.isNotOk(ips.length, `Hostnames that have IP address instead of name, should be returned as resolved: ${util.inspect(ips, { depth: 5 })}`)

                    const hosts = results.filter(v => (net.isIP(v.Hostname) === 0 && net.isIP(v.address) > 0))
                    assert.isNotOk(hosts.length, `Hostnames should not be resolved with a fake DN: ${util.inspect(hosts, { depth: 5 })}`)
                })
        })
    })
    xdescribe('FastResolver::resolve - 1000 websites', function () {
        it('resolve "_top_1000_sites.json" where minmum 80% of the hostnames are valid', function () {
            const hosts = JSON.parse(JSON.stringify(require('./../../_top_1000_sites')))
            return runFastResolver(hosts, { timeout: 5000 })
                .then(results => {
                    const invalid = results.filter(v => !net.isIP(v.address))
                    const per = results.length ? 100 - invalid.length / results.length * 100 : 0
                    assert.isOk(per > 80, `Minimum 80% of the hostnames should be valid. Expected 80% actual ${per}% (${invalid.length}) \n${util.inspect(invalid.slice(0, 10), { depth: 5 })}`)
                })
        })
        it('resolve "_top_1000_sites.json" - strict', function () {
            this.timeout(180000) // 3min
            const hosts = JSON.parse(JSON.stringify(require('./../../_top_1000_sites')))
            return runFastResolver(hosts, { timeout: 6000 })
                .then(results => {
                    const hosts = results.filter(v => {
                        if (v.IPv4) return (net.isIP(v.address) !== 4)
                        else if (v.IPv6) return (net.isIP(v.address) !== 6)
                    })
                    assert.isNotOk(hosts.length, `All hostnames with IPv4 or IPv6 flag should be resolved: ${util.inspect(hosts, { depth: 5 })}`)
                })
        })
        it('speed test', function () {
            this.timeout(180000) // 3min

            // get sites
            const hosts = JSON.parse(JSON.stringify(require('./../../_top_1000_sites'))) // .slice(0,100)

            // get resolvers
            const { lookup: dnsLookup, Resolver } = require('dns')
            const { fastResolver } = require('../../../index')
            const dnsResolver = new Resolver(/* {timeout: 2000}  */)
            const resolver = dnsResolver.resolve4.bind(dnsResolver)

            // process hosts
            return Promise.all([
                runResolver(resolver, hosts, { family: 4, timeout: 5000 }, 'DNS RESOLVER'),
                runResolver(dnsLookup, hosts, { family: 4, timeout: 5000 }, 'DNS_LOOKUP'),
                runResolver(fastResolver, hosts, { family: 4, timeout: 5000 }, 'DNS_FAST_RESOLVER')
            ])
                .catch(err => {
                    console.log('Speed test error:', err)
                })
        })
    })
    describe('FastResolver::staticIpResolver', function () {
        it('should resolve IP hostname to IP', function () {
            const item = JSON.parse(JSON.stringify(require('../../_test_sites')))[1] // 172.217.1.174 (google.com)
            const { staticIpResolver } = require('../../../index')

            // run resolver with slow dns server
            return new Promise((resolve, reject) => {
                staticIpResolver(
                    item.Hostname,
                    (err, address, family) => {
                        if (err) reject(err)
                        else {
                            item.address = address
                            item.family = family
                            resolve(item)
                        }
                    })
            })
                .then(result => {
                    assert.strictEqual(result && result.address, item.Hostname, 'Expected IP address to match Hostname')
                    assert.strictEqual(result && result.family, 4, 'Expected IP family to be 4 (IPv4)')
                })
                .catch(err => {
                    assert.isNotOk(err, `Unexpected resolver error! ${err}`)
                })
        })
    })

    // #region helper functions
    function runFastResolver(hosts, options = {}) {
        // Resolver
        const { fastResolver } = require('../../../index')

        // create promises
        const pms = hosts.map(item => {
            return new Promise((resolve, reject) => {
                fastResolver(item.Hostname, options, (err, address, family) => {
                    if (err) {
                        reject(err)
                    } else {
                        item.address = address
                        resolve(item)
                    }
                })
            })
        })

        var start = process.hrtime()

        // run all promises
        return Promise.all(pms)
            .catch(err => {
                console.log('DNS_FAST_RESOLVER ERROR: ', err)
            })
            .then(results => {
                if (SHOW_COMMENTS) {
                    var end = process.hrtime(start)
                    var elapsedTime = Math.round((end[0] * 1e9 + end[1]) / 1e9 * 100) / 100
                    var unresolved = results.filter(v => !v.address).length
                    var resolved = results.filter(v => net.isIP(v.address)).length
                    const per = results.length ? 100 - Math.round(unresolved / results.length * 100 * 100) / 100 : 0

                    console.log(`DNS_FAST_RESOLVER: invalid ${unresolved}, valid ${resolved}, resolved ${per}%, duration ${elapsedTime}s`)
                }
                return results
            })
    }
    function runResolver(resolver, hosts, options = {}, title) {
        // create promises
        const pms = hosts.map(item => {
            return new Promise((resolve) => {
                resolver(item.Hostname, (err, address) => {
                    item.address = err ? null : address
                    resolve(item)
                })
            })
        })

        var start = process.hrtime()

        // run all promises
        return Promise.all(pms)
            .catch(err => {
                console.log(`${title} ERROR: `, err)
            })
            .then(results => {
                var end = process.hrtime(start)
                var elapsedTime = (Math.round((end[0] * 1e9 + end[1]) / 1e9 * 100) / 100).toFixed(1).padStart(4, ' ')
                var resolved = results.filter(v => net.isIP(v.address)).length.toString().padStart(3, ' ')
                var unresolved = results.filter(v => !v.address).length.toString().padStart(3, ' ')
                const per = results.length ? 100 - Math.round(unresolved / results.length * 100 * 100) / 100 : 0
                const perStr = per.toFixed(1).padStart(4, ' ')
                const summary = `${title}:`.padEnd(30, ' ')

                console.log(`${summary} invalid ${unresolved}, valid ${resolved}, resolved ${perStr}%, duration ${elapsedTime}s`)
                return results
            })
    }
    // #endregion
})
