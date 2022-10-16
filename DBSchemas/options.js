const mongoose = require("mongoose");
const reqString = { required: true, type: String };
const reqArray = { required: true, type: Array };
const reqBoolean = { required: true, type: Boolean };
const reqNumber = { required: true, type: Number };

const options = new mongoose.Schema({
    spam: reqBoolean,
    mentions: reqBoolean,
    invites: reqBoolean,
    pings: reqBoolean,
    keywords: reqArray,
    blacklisted: reqArray,
    format: { required: false, type: Object },
    use: reqString,
})

module.exports = options;