#! /usr/bin/env node

// Codeglue v1.3.x

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

var WebpackDefinePlugin = webpack.DefinePlugin
var WebpackCopyPlugin = require("copy-webpack-plugin")
var WebpackStatsPlugin = require("stats-webpack-plugin")
var WebpackProgressBarPlugin = require("progress-bar-webpack-plugin")

var PACKAGE = require(path.join(process.cwd(), "./package.json"))

var NAME = PACKAGE.name || "!!!"
var VERSION = PACKAGE.version || "0.0.0"

var MODE = (yargs.argv.mode || process.env.MODE || "BUILD").toUpperCase()
var STAGE = (yargs.argv.stage || process.env.STAGE || "DEVELOPMENT").toUpperCase()
var SLUG = yargs.argv.slug || "."

var PORT = yargs.argv.port || process.env.PORT ||  8080

var LOCAL_ADDRESS = "127.0.0.1"
var INTERNAL_ADDRESS = "0.0.0.0"
ip.v4().then((address) => {
    INTERNAL_ADDRESS = address
})

var build = new Object()

rimraf("./builds/web", () => {
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
                },
                {
                    loaders: ["style-loader", "css-loader", "less-loader"],
                    test: new RegExp("\.(css|less)$", "i"),
                }
                {
                    loader: "file-loader",
                    test: new RegExp("\.(png|jpe?g|gif|svg)$", "i"),
                },
                {
                    loader: "file-loader",
                    test: new RegExp("\.(ttf|woff|eot)$", "i"),
                },
                {
                    loader: "file-loader",
                    test: new RegExp("\.(mp3|wav|ogg)$", "i"),
                },
            ],
        },
        plugins: [
            new WebpackCopyPlugin([
                {from: "source/index.html"},
            ]),
            new WebpackProgressBarPlugin({
                width: "00000000".length,
                complete: chalk.green(new String("O")),
                incomplete: chalk.red(new String("0")),
                format: "[:bar] Building (:elapseds)",
                customSummary: new Function(),
                summary: false,
            }),
            new WebpackDefinePlugin({
                __NAME__: JSON.stringify(NAME),
                __VERSION__: JSON.stringify(VERSION),
                __STAGE__: JSON.stringify(STAGE),
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

                print("Listening on " + chalk.underline("http://" + LOCAL_ADDRESS + ":" + PORT))
                print("Listening on " + chalk.underline("http://" + INTERNAL_ADDRESS + ":" + PORT))
            } else if(build.server != null) {
                build.server.reload()
            }
        } else if(MODE == "PUBLISH") {
            require("gh-pages").publish(path.resolve("./builds/web"), {
                message: "Publishing " + NAME + "@" + VERSION + " to " + SLUG,
                add: SLUG === ".",
                dest: SLUG,
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
