#! /usr/bin/env node

// Codeglue v2.x.x

// Usage:
// codeglue --stage=production
// codeglue --stage=development --mode=server
const codeglue = {}

import path from "path"
import open from "open"
import yargs from "yargs"
import chalk from "chalk"
import fs from "fs/promises"
import {rimraf} from "rimraf"
import * as esbuild from "esbuild"
import dateformat from "dateformat"
import browsersync from "browser-sync"
import {internalIpV4} from "internal-ip"
import {lessLoader} from "esbuild-plugin-less"

const MODE = (yargs(process.argv.slice(2)).argv.mode || process.env.MODE || "BUILD").toUpperCase()
const STAGE = (yargs(process.argv.slice(2)).argv.stage || process.env.STAGE || "DEVELOPMENT").toUpperCase()

const SOURCE_DIRECTORY = path.resolve("./source")
const BUILD_DIRECTORY = path.resolve("./builds/web")

const LOCAL_ADDRESS = "127.0.0.1"
const NETWORK_ADDRESS = await internalIpV4() || "0.0.0.0"

const PORT = 8080

const timestamp = () => "[" + chalk.green(dateformat(new Date(), "HH:MM:ss")) + "]"
const pause = (time) => new Promise((done) => setTimeout(done, time))

await rimraf(BUILD_DIRECTORY)
await fs.mkdir(BUILD_DIRECTORY, {"recursive": true})
await fs.copyFile(SOURCE_DIRECTORY + "/codeglued.js", BUILD_DIRECTORY + "/codeglued.js")

const config = {
    "entryPoints": ["source/index.js"],
    "outfile": "builds/web/index.js",
    "bundle": true,
    "sourcemap": true,
    "jsxFactory": "Preact.h",
    "define": {
        "MODE": MODE,
        "STAGE": STAGE,
    },
    "loader": {
        // IMAGES
        ".png": "file",
        ".jpg": "file",
        ".gif": "file",
        ".svg": "file",

        // FONTS
        ".ttf": "file",
        ".otf": "file",
        ".eot": "file",
        ".woff": "file",
        ".woff2": "file",

        // AUDIO
        ".mp3": "file",
        ".wav": "file",
        ".ogg": "file",
        ".bank": "file",

        // xml, csv, glsl?
    },
    "plugins": [
        {
            "name": "logging",
            "setup": (build) => {
                build.onStart(() => {
                    console.log(timestamp(), "Compiling Build...")
                })
            }
        },
        lessLoader(),
        {
            "name": "export stats",
            "setup": (build) => {
                build.onEnd((buildstats) => {
                    return fs.writeFile(BUILD_DIRECTORY + "/buildstats.json", JSON.stringify(buildstats, null, 4))
                })
            }
        },
        {
            "name": "export html",
            "setup": (build) => {
                build.onEnd((buildstats) => {
                    if(buildstats.errors.length == 0) {
                        return fs.copyFile(SOURCE_DIRECTORY + "/index.html", BUILD_DIRECTORY + "/index.html")
                    } else {
                        return fs.writeFile(BUILD_DIRECTORY + "/index.html", `<html><head></head><body><script src="codeglued.js"></script></body></html>`)
                    }
                })
            }
        },
        {
            "name": "reload server",
            "setup": (build) => {
                build.onEnd((buildstats) => {
                    if(codeglue.server != undefined) {
                        codeglue.server.reload()
                    }
                })
            }
        },
    ]
}

if(MODE == "BUILD") {
    await esbuild.build(config)
}

if(MODE == "SERVER") {
    const buildserver = await esbuild.context(config)
    await buildserver.watch()

    await new Promise((resolve) => {
        codeglue.server = browsersync({
            "server": BUILD_DIRECTORY,
            "port": PORT,
            "logLevel": "silent",
            "ghostMode": false,
            "notify": false,
            "open": false,
            "callbacks": {
                "ready": () => {
                    resolve()
                }
            },
            "middleware": [
                function (request, response, next) {
                    if(request.url.includes(".ogg")
                    || request.url.includes(".wav")
                    || request.url.includes(".mp3")
                    || request.url.includes(".png")) {
                        response.setHeader("Cache-Control", "public,max-age=3600,immutable");
                    }
                    next()
                },
            ],
        })
    })

    await pause(300)
    console.log(timestamp(), "Booting Server...")
    await pause(600)
    console.log(timestamp(), "Listening on", chalk.underline("http://" + LOCAL_ADDRESS + ":" + PORT))
    console.log(timestamp(), "Listening on", chalk.underline("http://" + NETWORK_ADDRESS + ":" + PORT))
    await open("http://" + LOCAL_ADDRESS + ":" + PORT)
}
