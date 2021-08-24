#!/usr/bin/env node
import { ProgressLogger } from "progress-logger-js";
import fetch from "node-fetch";
import fs from "fs";
import meow from "meow";
const progress = new ProgressLogger({
    label: "infinite-wget",
    logInterval: 1000
});
const cli = meow(`
	Usage
	  $ infinite-wget <url>

  Options
    --parallelism, -p  Parallel calls, default 1
    --sleep, -s  Sleep ms, default 0
    --method, -m  HTTP method, default GET
    --logResponse, -l Log HTTP response, default false
    --body, -b Body to send, default to no body
    --header, -h Headers in form "key=value", default to no headers

	Examples
	  $ infinite-wget http://httpbin.org/get -p 2
	  $ infinite-wget http://httpbin.org/post -l -m POST -b ./my-body.txt
`, {
    importMeta: import.meta,
    flags: {
        parallelism: {
            type: 'string',
            alias: 'p',
            default: '1'
        },
        sleep: {
            type: 'string',
            alias: 's',
            default: '0'
        },
        method: {
            type: 'string',
            alias: 'm',
            default: 'GET'
        },
        logResponse: {
            type: 'boolean',
            alias: 'l',
            default: false
        },
        body: {
            type: 'string',
            alias: 'b',
            isRequired: false
        },
        header: {
            type: 'string',
            alias: 'h',
            default: ''
        }
    }
});
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(""), ms);
    });
}
async function wget(wgetUrl, fetchOptions, logResponse) {
    try {
        const fetchResponse = await fetch(wgetUrl, fetchOptions);
        if (!fetchResponse.ok) {
            throw new Error("Invalid response " + fetchResponse.status);
        }
        const response = await fetchResponse.buffer();
        if (logResponse) {
            console.log(response.toString());
        }
    }
    catch (err) {
        console.error(err);
        throw err;
    }
}
async function runTask(wgetUrl, options) {
    const headers = {};
    for (const h of options.headers) {
        const hK = h.split("=")[0];
        const hv = h.split("=")[1] || "";
        headers[hK] = hv;
    }
    const fetchOptions = {
        method: options.method,
        body: options.body,
        headers
    };
    while (true) {
        await progress.incrementPromise(wget(wgetUrl, fetchOptions, options.logResponse));
        if (options.sleep > 0) {
            await sleep(options.sleep);
        }
    }
}
async function run(wgetUrl, options) {
    if (!wgetUrl) {
        throw new Error("url not provided");
    }
    const pSleep = parseInt(options.sleep, 10);
    if (isNaN(pSleep)) {
        throw new Error("Invalid sleep parameter");
    }
    const pParallelism = parseInt(options.parallelism, 10);
    if (isNaN(pParallelism)) {
        throw new Error("Invalid parallelism parameter");
    }
    const pBody = options.body && fs.readFileSync(options.body);
    let pHeaders = [];
    if (Array.isArray(options.header)) {
        pHeaders = options.header;
    }
    else if (options.header) {
        pHeaders = [options.header];
    }
    const optionsParser = {
        sleep: pSleep,
        parallelism: pParallelism,
        method: options.method,
        logResponse: options.logResponse,
        body: pBody,
        headers: pHeaders
    };
    const tasks = Array.from(Array(optionsParser.parallelism))
        .map(() => runTask(wgetUrl, optionsParser));
    return tasks;
}
run(cli.input[0], cli.flags)
    .catch(console.error.bind(console));
process.on('SIGINT', function () {
    progress.end();
    for (const err of progress.stats().errors) {
        console.log(err);
    }
    process.exit();
});
