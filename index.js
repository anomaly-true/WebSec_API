const express = require("express");
require("dotenv").config();
const app = express();
const path = require("path");
const port = process.env.PORT || 8080;
const webhook = require("./Routes/webhook.js");
const mongoose = require("mongoose");

app.use(express.json({ limit: "1mb" }));
app.listen(port, () => {
    console.log(`Listening to ${port}`)
    mongoose.connect(process.env.MONGODB_URI, {
        keepAlive: true
    }).then(() => console.log("Database connection created."));
})

app.use("/", webhook)
app.use("/assets", express.static("assets"))

app.get("/", (req, res)=> {
    res.sendFile("/main.html", {root: path.join(__dirname, "./Files")})
})

app.get("/soon", (req, res) => {
    res.sendFile("/soon.html", {root: path.join(__dirname, "./Files")})
})

app.get("*", (req, res) => {
    res.sendFile("/lost.html", {root: path.join(__dirname, "./Files")})
})