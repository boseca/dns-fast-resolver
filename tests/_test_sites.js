module.exports = [
    // online
    { IPv4: 1, IPv6: 1, Id: 0, Hostname: 'google.com' },
    { IPv4: 1, IPv6: 0, Id: 1, Hostname: '172.217.1.174' },
    { IPv4: 1, IPv6: 1, Id: 2, Hostname: 'yahoo.com' },
    { IPv4: 1, IPv6: 0, Id: 3, Hostname: '24h.com.vn' },
    { IPv4: 1, IPv6: 0, Id: 4, Hostname: 'doctissimo.fr' },
    { IPv4: 1, IPv6: 0, Id: 5, Hostname: 'sapo.pt' },

    // ECONNREFUSED (online)
    { IPv4: 1, IPv6: 1, Id: 6, Hostname: 'wikimedia.org' },
    // ENOTFOUND    (offline)
    { IPv4: 0, IPv6: 0, Id: 7, Hostname: '17kuxun.com' },
    // EAI_AGAIN    (offline)
    { IPv4: 0, IPv6: 0, Id: 8, Hostname: 'megaupload.com' },
    // ESERVFAIL    (offline)
    { IPv4: 0, IPv6: 0, Id: 9, Hostname: 'pcgames.com.cn' },
    // 0.0.0.0      (offline)
    { IPv4: 0, IPv6: 0, Id: 10, Hostname: 'rapidshare.com' },

    // Resolved IP  (offline)
    { IPv4: 1, IPv6: 0, Id: 11, Hostname: '10.121.254.81' },
    { IPv4: 1, IPv6: 0, Id: 12, Hostname: '10.121.222.222' },

    // null         (offline)
    { IPv4: 0, IPv6: 0, Id: 13, Hostname: null },

    // slow         (online)
    { IPv4: 1, IPv6: 0, Id: 14, Hostname: 'archive.org' },
    { IPv4: 0, IPv6: 0, Id: 15, Hostname: '5d6d.com' },
    { IPv4: 0, IPv6: 0, Id: 16, Hostname: 'juchang.com' },
    { IPv4: 0, IPv6: 0, Id: 17, Hostname: 'letitbit.net ' }
]
