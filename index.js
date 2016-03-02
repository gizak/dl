#!/usr/bin/env node --harmony

"use strict";

const handle = require('./lib/handle');
const prog = require('commander');
const jrpc = require('jayson');
const exec = require('child_process').exec;
const pbar = require('progress');
const byte = require('pretty-bytes');
const chalk = require('chalk');
const path = require('path');
const eyes = require('eyes');

let port = 6800;
let aria = jrpc.client.http("http://localhost:" + port + "/jsonrpc");

prog
    .version('0.0.1')
    .usage('[options] [uri...]')
    .option('-a, --add <uri>', 'Add <uri> as a download task')
    .option('-r, --rm <id>', 'Remove a task by <id>')
    .option('-d, --dir <dir>', 'Specify <dir> for download tasks', "./")
    .option('-l, --list', 'List all tasks')
    .option('-D, --deamon', 'Start aria2 deamon')
    .option('-v, --verbose', 'Verbose output')
    .option('-w, --watch', 'Watch status of tasks')
    .parse(process.argv);

if (!process.argv.slice(2).length) {
    prog.help();
}

prog.dir = path.resolve(prog.dir);

function add(uri) {
    let opt = {};

    opt.dir = prog.dir;

    handle.addTask(uri,opt);
}

if (prog.add) {
    add(prog.add);
}

if (prog.deamon) {
    exec('aria2c --enable-rpc --daemon --quiet --rpc-listen-all', (err) => {
        if (err !== null) {
            console.log(`can not initialize aria2: $(err)`);
        }
    });

}

if (prog.rm) {
    handle.rmTask(prog.rm);
}

if (prog.list) {
    handle.status(prog.verbose);
}

if (prog.watch) {
    handle.watch(prog.verbose);
}