/*jslint node: true */
"use strict";

const jrpc = require('jayson');
const path = require('path');
const url = require('url');
const byte = require('pretty-bytes');
const chalk = require('chalk');
const async = require('async');
const fs = require('fs');
const sprintf = require("sprintf-js").sprintf;
const vsprintf = require("sprintf-js").vsprintf;
const rl = require('readline');
const nclear = require('clear');

let aria = jrpc.client.http("http://localhost:6800/jsonrpc");

exports.rmTask = (id) => {
	aria.request('aria2.remove', [id], (err, res) => {
		if (err) {
			console.warn(err);
		} else {
			console.log(`removed task: ${res.result}`);
		}
	});
};

exports.addTask = (uri, opt) => {

	let report = (name, res, opt) => {
		console.log(`added task: ${name}\ngid: ${res.result}\nodir: ${opt.dir}`);
	};

	if (uri.startsWith('magnet:') || url.parse(uri).protocol) {
		aria.request('aria2.addUri', [[uri], opt], (err, res) => {
			report(uri, res, opt);
		});
		return;
	}

	if (path.extname(uri) == '.torrent') {
		fs.readFile(uri, (err, data) => {
			if (err) {
				console.error(err);
				return;
			}

			let buf = new Buffer(data, 'binary');
			let torrent = buf.toString('base64');

			aria.request('aria2.addTorrent', [torrent, [], opt], (err, res) => {
				if (err) {
					console.error(err);
					return;
				}
				report(path.basename(uri), res, opt);
			});
		});
		return;
	}

	if (path.extname(uri) == '.metalink') {
		fs.readFile(uri, (err, data) => {
			if (err) {
				console.error(err);
				return;
			}

			let buf = new Buffer(data, 'binary');
			let meta = buf.toString('base64');

			aria.request('aria2.addMetalink', [meta, opt], (err, res) => {
				if (err) {
					console.error(err);
					return;
				}
				report(path.basename(uri), res, opt);
			});
		});
		return;
	}
};

let puts = (str) => {
	str = str || "";
	process.stdout.write(str);
	process.stdout.clearLine(1);
	process.stdout.write("\n");
};

let putsn = (str) => {
	puts();
	puts(str);
};


function putsf(format) {
	let data = Array.prototype.slice.call(arguments, putsf.length);
	puts(vsprintf(format, data));
};

let pbar = (total, cur, width, symIncomp, symComp) => {
	if (typeof total === "string") {
		total = parseInt(total);
	}

	if (typeof cur === "string") {
		cur = parseInt(cur);
	}

	width = width || 20;
	symIncomp = chalk.dim('-');
	symComp = "=";

	let per = Math.floor(cur / total * 100);
	let curW = Math.floor(cur / total * width);

	let bar = "";
	for (let i = 0; i < width; i++) {
		if (i < curW) {
			bar += symComp;
		} else {
			bar += symIncomp;
		}
	}
	return bar;
};

let printStat = (verbose) => {
	let aria = jrpc.client.http("http://localhost:6800/jsonrpc");

	async.series({
		global: (cb) => {
			aria.request('aria2.getGlobalStat', [], (err, res) => {
				if (err) {
					cb(err, null);
				}
				cb(err, res.result);
			});
		},
		active: (cb) => {
			aria.request('aria2.tellActive', [], (err, res) => {
				if (err) {
					cb(err, null);
				}
				cb(err, res.result);
			});
		},
		waiting: (cb) => {
			aria.request('aria2.tellWaiting', [0, 16], (err, res) => {
				if (err) {
					cb(err, null);
				}
				cb(err, res.result);
			});
		},
		stopped: (cb) => {
			aria.request('aria2.tellStopped', [0, 16], (err, res) => {
				if (err) {
					cb(err, null);
				}
				cb(err, res.result);
			});
		}
	}, (err, res) => {
		if (err) {
			console.log(`error occurred: ${err}`);
			return;
		}

		// globalStat
		putsn(chalk.bold("GLOBAL:"));
		putsn("⬇ " +
			chalk.green(byte(parseInt(res.global.downloadSpeed)) + "/s") +
			"	 ⬆ " +
			chalk.cyan(byte(parseInt(res.global.uploadSpeed)) + "/s") +
			"	 Active: " + chalk.green(res.global.numActive) +
			"	 Waiting: " + chalk.yellow(res.global.numWaiting) +
			"	 Stopped: " + chalk.red(res.global.numStoppedTotal));

		// Active
		putsn(chalk.bold("ACTIVE:"));

		for (let di of res.active) {
			if (!di.bitfield) {
				console.log(chalk.yellow('• ') + chalk.underline(di.gid) + " preparing");
				break;
			}

			let dot = chalk.green('•');
			let ind = "⬇";
			let speed = (byte(parseInt(di.downloadSpeed)) + "/s");
			let complete = di.completedLength;
			let done = byte(parseInt(di.completedLength));
			let per = parseInt(complete) / parseInt(di.totalLength) * 100;

			if (di.completedLength == di.totalLength) {
				dot = chalk.cyan('•');
				ind = '⬆';
				speed = (byte(parseInt(di.uploadSpeed)) + "/s");
				complete = di.uploadLength;
				done = byte(parseInt(di.uploadLength));
				per = parseInt(complete) / parseInt(di.totalLength) * 100;
			}

			putsf(`${dot} ${di.gid} %s [ ${ind} %s |%s| %s] [${speed}]`,
				sprintf('%-9s', byte(parseInt(di.totalLength))),
				sprintf('%2d%%', per),
				pbar(di.totalLength, complete, 20),
				sprintf('%-9s', done));

			if (!verbose) continue;

			for (let f of di.files) {
				let per = sprintf('%d', parseInt(complete) / parseInt(di.totalLength) * 100);

				puts(`\t ${path.basename(f.path)} ${per} ${byte(parseInt(f.length))}`);
			}
			//puts();
		}

		/*
		// Waiting
		console.log("\n"+chalk.bold("WAITING:"));
		console.log(res.waiting.length);

		// Stopped
		console.log("\n"+chalk.bold("STOPPED:"));
		console.log(res.stopped.length);
		*/
	});
};

exports.status = printStat;

let clear = () => {
	nclear(false);
};

exports.watch = (verbose) => {
	clear();
	rl.clearScreenDown(process.stdout);
	rl.clearScreenDown(process.stdout);
	printStat(verbose);

	let timer = setInterval(() => {
		clear();
		printStat(verbose);
	}, 1000);

	process.on('SIGINT', () => {
		clearInterval(timer);
	});
};
