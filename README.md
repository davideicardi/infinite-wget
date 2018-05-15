# infinite-wget

A stupid HTTP performance test client that perform infinite GET on a given url (until CTRL+C is pressed...).

    > infinite-wget http://httpbin.org/get
    infinite-wget started at 2018-05-15T08:08:46.839Z
    infinite-wget ... 4 (3.90/sec)
    infinite-wget ... 9 (4.86/sec)
    infinite-wget ... 14 (4.88/sec)
    infinite-wget completed (17 success, 0 errors) in 3.8 seconds (4.5/sec)

## Installation

    npm i infinite-wget -g

## Usage

    infinite-wget http://httpbin.org/get

See available options using

    infinite-wget --help
