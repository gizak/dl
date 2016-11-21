#!/usr/bin/env node

"use strict";

const handle = require('./lib/handle');
const prog = require('commander');
const jrpc = require('jayson');
const exec = require('child_process').exec;
const byte = require('pretty-bytes');
const chalk = require('chalk');
const path = require('path');
const eyes = require('eyes');

let port = 6800;
let aria = jrpc.client.http("http://localhost:" + port + "/jsonrpc");

prog
	.version(require('./package.json').version)
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
	handle.addTask(uri,{dir:prog.dir});
}

if (prog.args) {
	for (let uri of prog.args) {
		add(uri);
	}
}

if (prog.add) {
	add(prog.add);
}

if (prog.deamon) {
	handle.initDeamon()
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
