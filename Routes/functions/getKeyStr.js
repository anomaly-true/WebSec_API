/**
 * 
 * @param {Object} object 
 * @returns String
 */
function getKeyString(object) {
    var str = '';
    str += Object.keys(object).join("")
    for (var i in object) {
        if (typeof(object[i]) === "object") {
            str += getKeyString(object[i]);
        }
    }
    return str;
}
module.exports = getKeyString;