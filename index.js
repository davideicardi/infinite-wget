#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const progress_logger_js_1 = require("progress-logger-js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const fs_1 = __importDefault(require("fs"));
const meow = require("meow");
const progress = new progress_logger_js_1.ProgressLogger({
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
            default: undefined
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
        setTimeout(() => resolve(), ms);
    });
}
function wget(wgetUrl, fetchOptions, logResponse) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const fetchResponse = yield node_fetch_1.default(wgetUrl, fetchOptions);
            if (!fetchResponse.ok) {
                throw new Error("Invalid response " + fetchResponse.status);
            }
            const response = yield fetchResponse.buffer();
            if (logResponse) {
                console.log(response.toString());
            }
        }
        catch (err) {
            console.error(err);
            throw err;
        }
    });
}
function runTask(wgetUrl, options) {
    return __awaiter(this, void 0, void 0, function* () {
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
            yield progress.incrementPromise(wget(wgetUrl, fetchOptions, options.logResponse));
            if (options.sleep > 0) {
                yield sleep(options.sleep);
            }
        }
    });
}
function run(wgetUrl, options) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const pBody = options.body && fs_1.default.readFileSync(options.body);
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
    });
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
