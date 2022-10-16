const mongoose = require("mongoose");
const schema = require("../../DBSchemas/main.js");
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

async function logs(hook, issue, ip, body, id) {
    if (hook.logs.length > 100) hook.logs.pop();
    const curTime = Date.now();
    hook.logs.sort((a, b) => a.time - b.time);
    const last = hook.logs[hook.logs.length - 1];
    if (last && last.ip == ip && last.issuedId == id && last.time + 300000 > curTime) {
        last.repeats++;
        last.time = curTime;
        hook.logs.pop();
        hook.logs.push(last);
    } else {
        if (hook.state.notify) {
            fetch("http://localhost:6942", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    ip: ip,
                    time: curTime,
                    body: body,
                    issue: issue,
                    id: hook.id
                })
            })
        }
        hook.logs.push({
            ip: ip,
            time: curTime,
            body: body,
            issue: issue,
            issuedId: id,
            repeats: 1
        })
    }
    hook.save()
}

module.exports = logs;