# how to run this project
## example 1
1. in one terminal window, type `node server`
2. in another terminal window, type `node client`

## example2
1. start the standalone websocket server (pywebsocket3), which is cloned in a neighboring directory
2. open the index.html file and click "Run WebSocket" link

## example3
1. run the startup script: `sh startup.sh`
2. open the index.html file and enter your name, click "Log in" - BROKEN on local

## test.a
1. from the test.a directory, run `docker-compose up -d`

# notes
## example1
i'm worried this is using server-side javascript incorrectly - is this example making server-side code pretend to be a browser?

## example2
[this](https://github.com/GoogleChromeLabs/pywebsocket3.git) can be used as a standalone websocket server for testing.
clone it locally - see the obsidian notes

## example3
having a hard time getting this to work on local, already had to fix some typos in the code too

## test.a
taken from docker test which was a bare-bones expo from engineerman (youtube)
res.write was just not working for me for some reason, but res.createReadStream worked and is apparently better to use anyway