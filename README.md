# dns-fast-resolver
A custom `dns.lookup` based on `dns.Resolver` with timeout and cancellation handlers.
This is intendent to be used as replacement for the standard `dns.lookup` in cases when more than 100 connections are required. Currently, [socket.connect](https://nodejs.org/api/net.html#net_socket_connect_options_connectlistener) uses `dns.lookup` by default which is not intended for concurrent request (see [Implementation considerations](https://nodejs.org/api/dns.html#dns_implementation_considerations)).
Under the hood, this function performs a DNS query on the network and the results may differ from ping and `dns.lookup`.

[![NPM version](https://img.shields.io/npm/v/dns-fast-resolver.svg)](https://www.npmjs.com/package/dns-fast-resolver)
[![Release Status](https://github.com/boseca/dns-fast-resolver/workflows/npm%20release/badge.svg)](https://github.com/boseca/dns-fast-resolver/releases)
[![Build Status](https://github.com/boseca/dns-fast-resolver/workflows/build/badge.svg)](https://github.com/boseca/dns-fast-resolver/actions?query=workflow%3Abuild)
[![Coverage Status](https://coveralls.io/repos/github/boseca/dns-fast-resolver/badge.svg?branch=main)](https://coveralls.io/github/boseca/dns-fast-resolver?branch=main)


## Table of contents
---
- [Installation](#installation)
- [How to use](#how-to-use)
- [API](#api)
- [Speed test](#speed-test)
- [Testing](#testing)


## Installation
---
```
$ npm install dns-fast-resolver --save
```
[back to top](#table-of-contents)


## How to use
---

With `request` module
```js
const request = require('request')
const { fastResolver } = require('dns-fast-resolver')

request({
    url: 'http://google.com',
    method: 'GET',
    lookup: fastResolver
}, (error, response, body) => {
    // ...
})
```

Direct usage
```js
const { fastResolver } = require('dns-fast-resolver')

fastResolver('google.com', {}, (error, address, family) => {
    // ...
})
```

Resolving `IPv4` addresses only,  specify param `{family: 4}`. In that case, you will avoid 
spending time on useless searching for `IPv6`. Apply the same technique if you are looking for `IPv6` addresses only. 

```js
fastResolver('google.com', {family: 4}, (error, address, family) => {
   // address === "172.217.165.14"
   // family === 4
});
```

[back to top](#table-of-contents)

## API
### fastResolver(hostname[, options], callback)   
> Uses same definition as [dns.lookup](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback)

* hostname `<string>` When hostname is an IP address, the callback returns the same IP value without making any attempt to resolve it.
* options `<integer>` | `<Object>`
    - family `<integer>` The record family. Must be 4, 6, or 0. The value 0 indicates that IPv4 and IPv6 addresses are both returned. Default: 0.
    - hints `<number>` One or more supported getaddrinfo flags. Multiple flags may be passed by bitwise ORing their values.
    - all `<boolean>` When true, the callback returns all resolved addresses in an array. Otherwise, returns a single address. Default: false.
    - verbatim `<boolean>` When true, the callback receives IPv4 and IPv6 addresses in the order the DNS resolver returned them. When false, IPv4 addresses are placed before IPv6 addresses. Default: currently false (addresses are reordered) but this is expected to change in the not too distant future. New code should use { verbatim: true }.
    - **timeout** `<integer>` Number of miliseconds to wait before the resolving request is canceled. Default value 4000 (4s).
    >In rare cases, hostnames may need more than 4 seconds to be resolved. Use the `timeout` option to adjust the waiting time.
    - **[servers](https://nodejs.org/api/dns.html#dns_dns_setservers_servers)** `<string[]>` Array of RFC 5952 formatted addresses. (Example: `['4.4.4.4', '[2001:4860:4860::8888]', '4.4.4.4:1053', '[2001:4860:4860::8888]:1053']`)
]`
* callback `<Function>`
    - err `<Error>`
    - address `<string>` A string representation of an IPv4 or IPv6 address.
    - family `<integer>` 4 or 6, denoting the family of address, or 0 if the address is not an IPv4 or IPv6 address. 0 is a likely indicator of a bug in the name resolution service used by the operating system.

Resolves a host name (e.g. 'wikipedia.org') into the first found A (IPv4) or AAAA (IPv6) record. All option properties are optional. If options is an integer, then it must be 4 or 6 – if options is not provided, then IPv4 and IPv6 addresses are both returned if found.

With the `all` option set to true, the arguments for callback change to (err, addresses), with addresses being an array of objects with the properties address and family.

On error, `err` is an `Error` object, where `err.code` is the error code. Keep in mind that `err.code` will be set to `'ENOTFOUND'` not only when the host name does not exist but also when the lookup fails in other ways such as no available file descriptors.


[back to top](#table-of-contents)

## Speed test
---
Output from `speed test` unit test using default settings
```js
`dns-fast-resolver`  invalid  63, valid 937, resolved  6.3%, duration  3.96s
`dns.Resolver`       invalid 558, valid 442, resolved 55.8%, duration 10.41s
`dns.lookup`         invalid  62, valid 938, resolved  6.2%, duration 93.86s
```
[back to top](#table-of-contents)

## Testing
Run all tests
```
$ npm run unit-test
```

Run test with 1000 websites
```
$ npm run unit-test -- --grep "resolve \"_top_1000_sites.js\" - strict"
```

Run `speed test` test
```
$ npm run unit-test -- --grep "speed test"
```

[back to top](#table-of-contents)
