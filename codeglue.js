#! /usr/bin/env node

var fs = require("fs")
var path = require("path")
var yargs = require("yargs")
var chalk = require("chalk")
var rimraf = require("rimraf")
var ip = require("internal-ip")
var filesize = require("filesize")
var dateformat = require("dateformat")

var Webpack = require("webpack")
var WebpackStatsPlugin = require("stats-webpack-plugin")
var WebpackExtractPlugin = require("extract-text-webpack-plugin")
var WebpackProgressBarPlugin = require("progress-bar-webpack-plugin")
var WebpackDefinePlugin = require("extended-define-webpack-plugin")
var BrowserSync = require("browser-sync")

var MODE = yargs.argv.mode || null
var STAGE = yargs.argv.stage || "DEVELOPMENT"
var HOST = yargs.argv.host || "localhost"
var PORT = yargs.argv.port || 8080

var build = new Object()

rimraf("./builds/web", function() {
    Webpack({
        entry: {
            "index.html": "./source/index.html",
            "index.css": "./source/index.css",
            "index.js": "./source/index.js"
        },
        output: {
            filename: "[name]",
            path: "./builds/web",
        },
        resolve: {
            root: [
                path.resolve("./source"),
            ],
        },
        module: {
            preLoaders: [
                {
                    test: new RegExp("\.js$", "i"),
                    exclude: new RegExp("node_modules"),
                    loader: "eslint-loader"
                },
                {
                    test: new RegExp("\.json$", "i"),
                    exclude: new RegExp("node_modules"),
                    loader: "json-loader",
                },
            ],
            loaders: [
                {
                    test: new RegExp("\.js$", "i"),
                    exclude: new RegExp("node_modules"),
                    loader: "babel-loader",
                    query: {
                        presets: [
                            "es2015",
                            "react"
                        ]
                    }
                },
                {
                    test: new RegExp("\.css$", "i"),
                    loader: new WebpackExtractPlugin("name", "[name]").extract([
                        "css-loader?minimize"
                    ]),
                },
                {
                    test: new RegExp("\.html$", "i"),
                    loader: new WebpackExtractPlugin("name", "[name]").extract([
                        "html-loader?interpolate&minimize"
                    ]),
                },
                {
                    test: new RegExp("\.(tff|woff|eot)$", "i"),
                    loader: "url-loader",
                },
                {
                    test: new RegExp("\.(png|jpe?g|gif|svg)$", "i"),
                    loader: "url-loader",
                },
                {
                    test: new RegExp("\.(mp3|wav|ogg)$", "i"),
                    loader: "url-loader"
                },
            ],
        },
        plugins: [
            new WebpackProgressBarPlugin({
                width: "00000000".length,
                complete: chalk.green("O"),
                incomplete: chalk.red("0"),
                format: "[:bar] Building (:elapseds)",
                customSummary: function() {},
                summary: false,
            }),
            new WebpackDefinePlugin({
                STAGE: STAGE,
            }),
            new WebpackStatsPlugin("stats.json"),
            new WebpackExtractPlugin("name", "[name]"),
        ],
        watch: (
            MODE == "SERVER"
        ),
    }, function(error, results) {
        results = results.toJson()

        var time = results.time / 1000 + "s"
        var size = filesize(results.assets.reduce(function(size, asset) {
            return size + asset.size
        }, 0), {spacer: ""})

        print("Building (" + time + ")(" + size + ")")

        results.errors.forEach(function(error) {console.log(error.toString())})
        results.warnings.forEach(function(warning) {console.log(warning.toString())})

        if(MODE == "SERVER") {
            if(build.server == null) {
                build.server = BrowserSync({
                    server: "./builds/web",
                    logLevel: "silent",
                    notify: false,
                    host: HOST,
                    port: PORT
                })

                print("Listening on " + chalk.underline("http://" + "127.0.0.1" + ":" + PORT))
                print("Listening on " + chalk.underline("http://" + ip.v4() + ":" + PORT))
            } else if(build.server != null) {
                build.server.reload()
            }
        }
    })
})

function print(message) {
    var time = dateformat(new Date(), "hh:MM:TT")
    console.log("[" + chalk.green(time) + "]", message)
}
