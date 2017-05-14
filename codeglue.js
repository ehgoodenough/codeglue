#! /usr/bin/env node

// Codeglue v1.2.1

// Usage:
// codeglue --stage=PRODUCTION
// codeglue --stage=DEVELOPMENT --mode=SERVER
// codeglue --stage=PRODUCTION --mode=PUBLISH

var path = require("path")
var yargs = require("yargs")
var chalk = require("chalk")
var rimraf = require("rimraf")
var ip = require("internal-ip")
var webpack = require("webpack")
var filesize = require("filesize")
var dateformat = require("dateformat")
var browsersync = require("browser-sync")

var WebpackCopyPlugin = require("copy-webpack-plugin")
var WebpackStatsPlugin = require("stats-webpack-plugin")
var WebpackProgressBarPlugin = require("progress-bar-webpack-plugin")

var NAME = require("./package.json").name || "whatever"
var VERSION = require("./package.json").version || "0.0.0"

var PORT = yargs.argv.port || process.env.PORT ||  8080
var MODE = (yargs.argv.mode || process.env.MODE || "BUILD").toUpperCase()
var STAGE = (yargs.argv.stage || process.env.STAGE || "DEVELOPMENT").toUpperCase()

var build = new Object()

rimraf("./builds/web", function() {
    webpack({
        entry: {
            "index.js": "./source/index.js",
        },
        output: {
            filename: "[name]",
            path: path.resolve("./builds/web"),
        },
        resolve: {
            modules: [
                path.resolve("./source"),
                "node_modules"
            ]
        },
        module: {
            rules: [
                {
                    loader: "eslint-loader",
                    test: new RegExp("\.js$", "i"),
                    exclude: new RegExp("node_modules"),
                    enforce: "pre"
                },
                {
                    loader: "babel-loader",
                    test: new RegExp("\.js$", "i"),
                    exclude: new RegExp("node_modules"),
                    options: {
                        presets: [
                            "es2015",
                            "react"
                        ]
                    }
                },
                {
                    loader: "url-loader",
                    test: new RegExp("\.(png|jpe?g|gif|svg)$", "i"),
                },
                {
                    loader: "file-loader",
                    test: new RegExp("\.(tff|woff|eot|mp3|wav|ogg)$", "i"),
                }
            ],
        },
        plugins: [
            new WebpackCopyPlugin([
                {from: "source/index.html"},
                {from: "source/index.css"},
            ]),
            new WebpackProgressBarPlugin({
                width: "00000000".length,
                complete: chalk.green(new String("O")),
                incomplete: chalk.red(new String("0")),
                format: "[:bar] Building (:elapseds)",
                customSummary: new Function(),
                summary: false,
            }),
            new WebpackStatsPlugin("stats.json"),
        ],
        watch: (
            MODE == "SERVER"
        )
    }, (error, stats) => {
        abort(error)

        stats = stats.toJson()

        var time = stats.time / 1000 + "s"
        var size = filesize(stats.assets.reduce((size, asset) => {
            return size + asset.size
        }, 0), {spacer: ""})

        print("Building (" + time + ")(" + size + ")")

        stats.errors.forEach((error) => {console.log(error.toString())})
        stats.warnings.forEach((warning) => {console.log(warning.toString())})

        if(MODE == "SERVER") {
            if(build.server == null) {
                build.server = browsersync({
                    server: "./builds/web",
                    logLevel: "silent",
                    notify: false,
                    minify: false,
                    port: PORT
                })

                print("Listening on " + chalk.underline("http://" + "127.0.0.1" + ":" + PORT))
                print("Listening on " + chalk.underline("http://" + ip.v4() + ":" + PORT))
            } else if(build.server != null) {
                build.server.reload()
            }
        } else if(MODE == "PUBLISH") {
            require("gh-pages").publish(path.resolve("./builds/web"), {
                message: "Publishing " + NAME + "@" + VERSION
            }, (error) => {
                abort(error)
                print("Published " + NAME + "@" + VERSION)
            })
        }
    })
})

function print(message) {
    var time = dateformat(new Date(), "HH:MM:ss")
    console.log("[" + chalk.green(time) + "]", message)
}

function abort(error) {
    if(error != undefined) {
        console.log(error)
        throw -1
    }
}
