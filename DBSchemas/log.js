const mongoose = require("mongoose");
const reqString = { required: true, type: String }
const reqNumber = { required: true, type: Number }
const schema = new mongoose.Schema({
    ip: reqString,
    time: reqNumber,
    body: reqString,
    issue: reqString,
    issuedId: reqNumber,
    repeats: reqNumber
})

module.exports = schema;