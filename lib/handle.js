/*jslint node: true */

"use strict";

const jrpc = require('jayson');
const path = require('path');
const url = require('url');
const pbar = require('progress');
const byte = require('pretty-bytes');
const chalk = require('chalk');
const eyes = require('eyes');
const async = require('async');
const fs = require('fs');
const sprintf = require("sprintf-js").sprintf;
const rl = require('readline');
const nclear = require('clear');

let aria = jrpc.client.http("http://localhost:6800/jsonrpc");

exports.rmTask = (id) => {
    aria.request('aria2.remove',[id],(err,res)=>{
        if (err) {
            console.warn(err);
        } else {
            console.log(`removed task: ${res.result}`);
        }
    });
};

exports.addTask = (uri, opt) => {

    let report = (name,res,opt)=>{
        console.log(`added task: ${name}\ngid: ${res.result}\nodir: ${opt.dir}`);
    };

    if (uri.startsWith('magnet:') || url.parse(uri).protocol) {
        aria.request('aria2.addUri',[[uri],opt],(err,res)=>{
            report(uri,res,opt);
        });
        return;
    }

    if (path.extname(uri) == '.torrent') {
        fs.readFile(uri, (err, data)=>{
            if (err) {
                console.error(err);
                return;
            }

            let buf = new Buffer(data,'binary');
            let torrent = buf.toString('base64');

            aria.request('aria2.addTorrent',[torrent, [], opt],(err,res)=>{
                if (err) {
                    console.error(err);
                    return;
                }
                report(path.basename(uri),res,opt);
            });
        });
        return;
    }

    if (path.extname(uri) == '.metalink') {
        fs.readFile(uri, (err, data)=>{
            if (err) {
                console.error(err);
                return;
            }

            let buf = new Buffer(data,'binary');
            let meta = buf.toString('base64');

            aria.request('aria2.addMetalink',[meta, opt],(err,res)=>{
                if (err) {
                    console.error(err);
                    return;
                }
                report(path.basename(uri),res,opt);
            });
        });
        return;
    }
};

let printStat = (verbose) => {
    let aria = jrpc.client.http("http://localhost:6800/jsonrpc");

    async.series({
        global: (cb) => {
            aria.request('aria2.getGlobalStat', [], (err, res) => {
                if (err) {
                    cb(err,null);
                }
                cb(err, res.result);
            });
        },
        active: (cb) => {
            aria.request('aria2.tellActive', [], (err, res) => {
                if (err) {
                    cb(err,null);
                }
                cb(err, res.result);
            });
        },
        waiting: (cb) => {
            aria.request('aria2.tellWaiting', [0, 16], (err, res) => {
                if (err) {
                    cb(err,null);
                }
                cb(err, res.result);
            });
        },
        stopped: (cb) => {
            aria.request('aria2.tellStopped', [0, 16], (err, res) => {
                if (err) {
                    cb(err,null);
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
        console.log("\n"+chalk.bold("GLOBAL:"));
        console.log("⬇ "
                    +chalk.green(byte(parseInt(res.global.downloadSpeed))+"/s")
                    +"  ⬆ "
                    +chalk.cyan(byte(parseInt(res.global.uploadSpeed))+"/s")
                    +"  Active: "+chalk.green(res.global.numActive)
                    +"  Waiting: "+chalk.yellow(res.global.numWaiting)
                    +"  Stopped: "+chalk.red(res.global.numStoppedTotal));

        // Active
        console.log("\n"+chalk.bold("ACTIVE:"));

        for (let di of res.active) {
            if (!di.bitfield) {
                console.log(chalk.yellow('• ')+chalk.underline(di.gid)+" preparing");
                break;
            }
            //console.log(di);
            let bar = new pbar(':dot :gid  :size [ :arrow :per |:bar| :done ] [:speed]\n',{
                total:parseInt(di.totalLength),
                complete: ('='),
                incomplete:chalk.dim('-'),
                width:20,
                clear: true
            });

            let dot = chalk.green('•');
            let ind = "⬇";
            let speed = (byte(parseInt(di.downloadSpeed))+"/s");
            let complete = di.completedLength;
            let done =  byte(parseInt(di.completedLength));
            let per = parseInt(complete)/parseInt(di.totalLength)*100;

            if (di.completedLength == di.totalLength) {
                dot = chalk.cyan('•');
                ind = '⬆';
                speed = (byte(parseInt(di.uploadSpeed))+"/s");
                complete = di.uploadLength;
                done =  byte(parseInt(di.uploadLength));
                per = parseInt(complete)/parseInt(di.totalLength)*100;
            }

            bar.tick(complete,{
                per: sprintf('%2d%%',per),
                dot: dot,
                gid: (di.gid),
                arrow:ind,
                speed: speed,
                done: sprintf('%-9s',done),
                size: sprintf('%-9s',byte(parseInt(di.totalLength)))
            });

            if (!verbose) continue;

            for (let f of di.files) {
                let bar = new pbar('    :file :percent :size\n',{
                    total:parseInt(f.length),
                    width:10,
                    complete: '=',
                    incomplete: chalk.dim('-'),
                    clear: true
                });

                bar.tick(f.completedLength,{
                    file: path.basename(f.path),
                    size: byte(parseInt(f.length))
                });
            }
            console.log('');
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

let clear = ()=>{
    //rl.cursorTo(process.stdout,0,0);
    //rl.clearScreenDown(process.stdout);
    //process.stdout.write("\\033c");
    nclear(false);
};

exports.watch = (verbose) =>{
    clear();
    rl.clearScreenDown(process.stdout);
    rl.clearScreenDown(process.stdout);
    printStat(verbose);

    let timer = setInterval(()=>{
        clear();
        printStat(verbose);
    },1000);

    process.on('SIGINT',()=>{
        clearInterval(timer);
    });
};
