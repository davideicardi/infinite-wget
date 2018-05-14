#!/usr/bin/env node

"use strict";

const ProgressLogger = require("progress-logger-js").ProgressLogger;
const progress = new ProgressLogger({
  label: "infinite-wget",
  logInterval: 1000
});

const fetch = require("node-fetch");

const meow = require('meow');

const cli = meow(`
	Usage
	  $ infinite-wget <url>

  Options
    --parallelism, -p  Parallel calls, default 1
    --sleep, -s  Sleep ms, default 1000

	Examples
	  $ infinite-wget http://httpbin.org/get -c 2
`,
{

	flags: {
    connections: {
			type: 'string',
      alias: 'c',
      default: '1'
		},
		sleep: {
			type: 'string',
      alias: 's',
      default: '0'
		}
	}
});

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

async function wget(wgetUrl) {
  try {
    const fetchResponse = await fetch(wgetUrl);
    if (fetchResponse.status !== 200) {
      throw new Error("Invalid response " + fetchResponse.status);
    }
  
    await fetchResponse.text();
 
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function runTask(wgetUrl, options) {
  while (true) {
    await progress.incrementPromise(wget(wgetUrl));

    if (options.sleep) {
      await sleep(options.sleep);
    }
  }
}

async function run(wgetUrl, options) {
  if (!wgetUrl) {
    throw new Error("url not provided");
  }

  options.sleep = parseInt(options.sleep, 10);
  options.connections = parseInt(options.connections, 10);

  const tasks = Array.from(Array(options.connections))
  .map(() => runTask(wgetUrl, options));
}

run(cli.input[0], cli.flags)
.catch(console.error.bind(console));

process.on('SIGINT', function() {
  progress.end();
  console.log(progress.errors);

  process.exit();
});
