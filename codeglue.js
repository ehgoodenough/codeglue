#! /usr/bin/env node

var yargs = require("yargs")

console.log("Hello World!", process.cwd(), yargs.argv.stage)
