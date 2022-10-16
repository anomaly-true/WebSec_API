const express = require("express");
const router = express.Router();
const path = require("path");
const schema = require("../DBSchemas/main.js");
const objToString = require("./functions/objToString.js");
const report = require("./functions/logIssue.js");
const crypto = require("crypto");
const findAndReplace = require("./functions/findAndReplace.js");
const { append } = require("express/lib/response");
const {URL} = require("url");
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

let spam = {};

router.post("/send/:token", async (req, res) => {
    //-- Variables --\\
    const ip = req.headers["true-client-ip"] || req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "1.1.1.1";
    const webhook = await schema.findById(req.params.token).catch(() => null);
    if (!webhook) return res.status(400).send({ status: 1, message: "Invalid request | Invalid token" });
    if (!webhook.methods.post) return res.status(403).send({ status: 8, message: "Invalid request | Method not allowed" });
    if (webhook.state.locked) return res.status(503).send({ status: 10 });
    const queryParams = new URL(req.protocol + "://" + req.get("host") + req.originalUrl).search;
    const data = webhook.options;
    const id = webhook.id;
    const body = req.body;
    const time = Date.now();

    //-- Default checks --\\
    const contentString = objToString(body);
    const hashedIp = crypto.createHash("sha256").update(ip).digest("hex");
    if (data.spam) {
        spam[id] ? null : spam[id] = {};
        if (!spam[id][ip]) {
            spam[id][ip] = 1;
        } else {
            spam[id][ip]++;
        }
        setTimeout(() => {spam[id][ip]--;if(spam[id][ip]==0) delete spam[id][ip]}, 60000);
        if (spam[id][ip] > 4) {
            report(webhook, "Webhook spam.", hashedIp, JSON.stringify(body, null, 4), 2);
            return res.status(429).send({ status: 2});
        }
    }
    if (data.pings) {
        if (contentString.includes("@everyone") || contentString.includes("@here")) {
            report(webhook, "@here or @everyone pings detected.", hashedIp, JSON.stringify(body, null, 4), 3);
            return res.status(403).send({ status: 3});
        }
    }
    if (data.mentions) {
        if (contentString.search(/<@!*&*[0-9]+>/) != -1) {
            report(webhook, "User mention detected.", hashedIp, JSON.stringify(body, null, 4), 4);
            return res.status(403).send({ status: 4});
        }
    }
    if (data.invites) {
        if (contentString.search(/discord\.gg\/[a-zA-Z0-9]+/) != -1) {
            report(webhook, "Invite detected.", hashedIp, JSON.stringify(body, null, 4), 7);
            return res.status(403).send({ status: 7});
        }
    }
    if (data.keywords.length > 0) {
        if (!data.keywords.every(key => contentString.includes(key))) {
            report(webhook, "Keyword missing.", hashedIp, JSON.stringify(body, null, 4), 5);
            return res.status(403).send({ status: 5});
        }
    }
    if (data.blacklisted.length > 0) {
        if (data.blacklisted.some(key => contentString.includes(key))) {
            report(webhook, "Blacklisted phrase detected.", hashedIp, JSON.stringify(body, null, 4), 6);
            return res.status(403).send({ status: 6});
        }
    }
    findAndReplace(body, hashedIp, req.headers);
    let response = await fetch(`${webhook.link}${queryParams}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": req.headers["user-agent"]
        },
        body: JSON.stringify(body)
    }).then(async response => {
        console.log(`\x1b[32m[${req.method}]\x1b[0m Request from \x1b[31m${ip}\x1b[0m processed in ${Math.round(Date.now() - time)}ms.`)
        if (response.status === 200) {
            return response.json()
        }
    })
    if (webhook.state.hide) {
        res.status(200).send({ status: 1, message: "Invalid request | Invalid token" })
    } else if(response) {
        response["status"] = 0;
        res.status(200).send(response);
    } else {
        res.status(204).send();
    }
    webhook.state.uses += 1;
    webhook.save().catch(() => null);
});

router.get("/send", async (req, res) => {
    res.redirect("https://websec.services/");
});

router.get("/send/:token", async (req, res) => {
    const hook = await schema.findById(req.params.token).catch(() => null);
    if (!hook) return res.status(400).send({ status: 1, message: "Invalid request | Invalid token" });
    if (hook.state?.hide) return res.status(200).send({ status: 1, message: "Invalid request | Invalid token" });
    if (!hook.methods.get) return res.status(403).send({ status: 2, message: "Invalid request | Method not allowed", owner: hook.owner.tag, server_message: "Webhook security provided by WebSec. If you believe this user is violating our terms, please contact us at: https://discord.gg/bc8YDTVecF" });
    const ip = req.headers["true-client-ip"] || req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "1.1.1.1";
    const data = await fetch(hook.link, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": req.headers["user-agent"]
        }
    }).then(async response => {
        return response.json();
    })
    console.log(`\x1b[32m[${req.method}]\x1b[0m Request from \x1b[31m${ip}\x1b[0m.`)
    if (!data.type) return res.status(400).send({ status: 1, message: "Invalid request | Error Occured", owner: hook.owner.tag, server_message: "Webhook security provided by WebSec. If you believe this user is violating our terms, please contact us at: https://discord.gg/bc8YDTVecF" });
    res.status(200).send({type: data.type, status: 0, name: data.name, avatar: data.avatar, channel_id: data.channel_id, guild_id: data.guild_id, owner: hook.owner.tag, message: "Webhook security provided by WebSec. If you believe this user is violating our terms, please contact us at: https://discord.gg/bc8YDTVecF"});
    hook.state.uses += 1;
    hook.save();
})

router.delete("/send/:token", async (req, res) => {
    const hook = await schema.findById(req.params.token).catch(() => null);
    if (!hook) return res.status(400).send({ status: 1, message: "Invalid request | Invalid token" });
    if (!hook.methods.delete) return res.status(403).send({ status: 8, message: "Invalid request | Method not allowed" });
    const ip = req.headers["true-client-ip"] || req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "1.1.1.1";
    hook.remove();
    const data = await fetch(hook.link, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": req.headers["user-agent"]
        }
    })
    console.log(`\x1b[32m[${req.method}]\x1b[0m Request from \x1b[31m${ip}\x1b[0m.`)
    if (hook.state.hide) return res.status(200).send({ status: 1, message: "Invalid request | Invalid token" });
    res.status(204).send();
})

router.patch("/send/:token", async (req, res) => {
    const hook = await schema.findById(req.params.token).catch(() => null);
    if (!hook) return res.status(400).send({ status: 1, message: "Invalid request | Invalid token" });
    if (!hook.methods.patch) return res.status(403).send({ status: 8, message: "Invalid request | Method not allowed" });
    const ip = req.headers["true-client-ip"] || req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "1.1.1.1";
    const data = await fetch(hook.link, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": req.headers["user-agent"]
            },
        body: JSON.stringify(req.body)
    }).then(async response => {
        return response.json();
    })
    console.log(`\x1b[32m[${req.method}]\x1b[0m Request from \x1b[31m${ip}\x1b[0m processed.`)
    if (!data.type) return res.status(400).send({ status: 1, message: "Invalid request | Error Occured" });
    if (hook.state.hide) return res.status(200).send({ status: 1, message: "Invalid request | Invalid token" });
    res.status(200).send({type: data.type, status: 0, name: data.name, avatar: data.avatar, channel_id: data.channel_id, guild_id: data.guild_id});
    hook.state.uses += 1;
    hook.save();
})

router.patch("/send/:token/messages/:msg_id", async (req, res) => {
    //-- Variables --\\
    const ip = req.headers["true-client-ip"] || req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || "1.1.1.1";
    const hook = await schema.findById(req.params.token).catch(() => null);
    if (!hook) return res.status(400).send({ status: 1, message: "Invalid request | Invalid token" });
    if (!hook.methods.patch) return res.status(403).send({ status: 8, message: "Invalid request | Method not allowed" });
    if (hook.state.locked) return res.status(503).send({ status: 10 });
    const msg_id = req.params.msg_id;
    const queryParams = new URL(req.protocol + "://" + req.get("host") + req.originalUrl).search;
    const data = hook.options;
    const id = hook.id;
    const body = req.body;

    //-- Default checks --\\
    const contentString = objToString(body);
    const hashedIp = crypto.createHash("sha256").update(ip).digest("hex");
    if (data.spam) {
        spam[id] ? null : spam[id] = {};
        if (!spam[id][ip]) {
            spam[id][ip] = 1;
        } else {
            spam[id][ip]++;
        }
        setTimeout(() => {spam[id][ip]--;if(spam[id][ip]==0) delete spam[id][ip]}, 60000);
        if (spam[id][ip] > 4) {
            report(hook, "Webhook spam.", hashedIp, JSON.stringify(body, null, 4), 2);
            return res.status(429).send({ status: 2});
        }
    }
    if (data.pings) {
        if (contentString.includes("@everyone") || contentString.includes("@here")) {
            report(hook, "@here or @everyone pings detected.", hashedIp, JSON.stringify(body, null, 4), 3);
            return res.status(403).send({ status: 3});
        }
    }
    if (data.mentions) {
        if (contentString.search(/<@!*&*[0-9]+>/) != -1) {
            report(hook, "User mention detected.", hashedIp, JSON.stringify(body, null, 4), 4);
            return res.status(403).send({ status: 4});
        }
    }
    if (data.invites) {
        if (contentString.search(/discord\.gg\/[a-zA-Z0-9]+/) != -1) {
            report(hook, "Invite detected.", hashedIp, JSON.stringify(body, null, 4), 7);
            return res.status(403).send({ status: 7});
        }
    }
    if (data.keywords.length > 0) {
        if (data.keywords.every(key => !contentString.includes(key))) {
            report(hook, "Keyword missing.", hashedIp, JSON.stringify(body, null, 4), 5);
            return res.status(403).send({ status: 5});
        }
    }
    if (data.blacklisted.length > 0) {
        if (data.blacklisted.some(key => contentString.includes(key))) {
            report(hook, "Blacklisted phrase detected.", hashedIp, JSON.stringify(body, null, 4), 6);
            return res.status(403).send({ status: 6});
        }
    }
    findAndReplace(body, hashedIp, req.headers);

    if (!hook.methods.patch) return res.status(403).send({ status: 2, message: "Invalid request | Method not allowed" });
    let rq = await fetch(hook.link + `/messages/${msg_id}${queryParams}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "User-Agent": req.headers["user-agent"]
        },
        body: JSON.stringify(req.body)
    }).then(async response => {
        return response.json();
    })
    console.log(`\x1b[32m[${req.method}]\x1b[0m Request from \x1b[31m${ip}\x1b[0m.`)
    if (Object.keys(rq).length == 0) return res.status(400).send({ status: 1, message: "Invalid request | Error Occured" });
    if (hook.state.hide) return res.status(200).send({ status: 1, message: "Invalid request | Invalid token" });
    rq["status"] = 0;
    res.status(200).send(rq);
    hook.state.uses += 1
    hook.save()
})

module.exports = router;