const moment = require('moment');
const hwid = ["syn-fingerprint", "exploit-guid", "proto-user-identifier", "sentinel-fingerprint", 'krnl-hwid', "user-identifier", "fingerprint"]
/**
 * 
 * @param {Object} obj 
 * @param {String} ip
 * @param {Object} headers
 */
function replaceString(obj, ip, headers) {
    let HWID = "Unknown"
    hwid.forEach(str => {
        if (headers.hasOwnProperty(str)) {
            HWID = headers[str]
        }
    })
    for (var i in obj) {
        if ((typeof(obj[i])==="string" && !!obj[i])) {
            obj[i] = obj[i].replace(/<ip>/, ip).replace(/<time>/, moment().format("HH:mm:ss Z")).replace(/<date>/, moment().format("DD/MM/YY")).replace(/<hwid>/, HWID).replace(/<agent>/, headers["user-agent"])
            while (!(obj[i] === obj[i].replace(/(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/, "███.███.███.███"))) {
                obj[i] = obj[i].replace(/(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/, "███.███.███.███")
            }
        } else if((typeof(obj[i])==="object") || (typeof(obj[i])==="array")) {
            replaceString(obj[i], ip, headers)
        }
    }
}

module.exports = replaceString