/**
 * 
 * @param {Object} obj 
 * @returns String
 */
function objectToString(obj) {
    var str = '';
    for (var p in obj) {
        if (typeof(obj[p]) === "string" || typeof(obj[p]) === "number") {
            str += obj[p] + ' ';
        } else if (typeof(obj[p]) === "object") {
            str += objectToString(obj[p]) + " ";
        }
    }
    return str;
}

module.exports = objectToString;