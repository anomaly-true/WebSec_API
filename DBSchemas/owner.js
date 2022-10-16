const mongoose = require("mongoose");
const ownerSchema = new mongoose.Schema({id: {required: true, type: String}, tag: {required: true, type: String}}, {versionKey: false, id: false})

module.exports = ownerSchema;