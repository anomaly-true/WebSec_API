const mongoose = require("mongoose");
const ownerSchema = require("./owner.js");
const optionSchema = require("./options.js");
const logSchema = require("./log.js");
const reqString = { required: true, type: String }
const reqBoolean = {required: true, type: Boolean}

const keySchema = new mongoose.Schema({
    name: reqString,
    link: reqString,
    owner: ownerSchema,
    options: optionSchema,
    state: {
        locked: reqBoolean,
        uses: {required: true, type: Number, default: 0},
        notify: {required: false, type: Boolean, default: false},
        hide: {required: false, type: Boolean, default: false}
    },
    logs: [logSchema],
    methods: {
        post: reqBoolean,
        get: reqBoolean,
        patch: reqBoolean,
        delete: reqBoolean
    },
    body_form: {
        required: false,
        type: Object,
        default: {potentials: {}, determined: "", enabled: false}
    }
}, {
    timestamps: true
})

module.exports = mongoose.model("webhooks_v2", keySchema)