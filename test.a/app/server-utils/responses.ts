import os from 'os';
import fs from 'fs';
import http from 'http';

export function getHostname(req: http.IncomingMessage, res: http.ServerResponse) {
    // console.log(`Getting hostname for req: ${req.method} ${req.url}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'plaintext');
    res.end(os.hostname());
}

export function getUptime(req: http.IncomingMessage, res: http.ServerResponse) {

    let uptime = 0;
    try {
        // Read the contents of the /proc/1/stat file
        // This file contains status information for the initial process (PID 1) in the container
        const statData = fs.readFileSync('/proc/1/stat', 'utf8');

        // The data is a space-separated string. Field 22 (index 21) is the start time in jiffies (clock ticks)
        const statFields = statData.split(' ');
        const startTimeJiffies = parseInt(statFields[21] ?? "0", 10);

        // Get the current system uptime of the *container's* environment in seconds
        // This is the first value in /proc/uptime
        const uptimeData = fs.readFileSync('/proc/uptime', 'utf8');
        const uptimeFields = uptimeData.split(' ');
        const containerSystemUptimeSeconds = parseFloat(uptimeFields[0] ?? "0");

        // On Linux, the system uptime returned by os.uptime() is the same as the first value in /proc/uptime within the container
        // Alternatively, you can use require('os').uptime()
        // const containerSystemUptimeSeconds = require('os').uptime();


        // The container uptime is the current system uptime minus the PID 1 start time (in seconds)
        // Jiffies are typically 1/100th of a second on most systems, hence the division by 100
        const HZ = 100; // Common value for clock ticks per second (jiffies)
        const containerUptimeSeconds = containerSystemUptimeSeconds - (startTimeJiffies / HZ);

        // return Math.floor(containerUptimeSeconds);
        uptime = Math.floor(containerUptimeSeconds);

    } catch (error) {
        console.error("Error reading /proc files:", error);
        // return null; // Return null in case of an error (e.g., file not found, permission issues)
        res.writeHead(500, { 'content-type': 'application/json' }); // application/json
        res.end(JSON.stringify({ err: error }));
    }

    // uptime = os.uptime(); // gets uptime of the underlying host os, linux kernel, etc.
    let uptimeStr = '';
    if (uptime > 3600) uptimeStr += `${Math.floor(uptime / 3600)}h `;
    if (uptime > 60) uptimeStr += `${Math.floor((uptime % 3600) / 60)}m `;
    uptimeStr += `${Math.floor((uptime % 60))}s`;
    res.writeHead(200, { 'content-type': 'plaintext' }); // application/json
    res.end(uptimeStr);
}

function getActiveServices(req: http.IncomingMessage, res: http.ServerResponse) {
    // TODO implement... use built-in docker DNS to ref containers on same bridge network via service name? 
    const serviceServerNames = ['app', 'websock', 'play', 'pywss', 'nginx'];
    for (const service of serviceServerNames) {
        try {
            fetch(`http://${service}`)
        } catch (err) {

        }
    }
}

export function getNotFound(req: http.IncomingMessage, res: http.ServerResponse) {
    console.log(`Path not found for req: ${req.method} ${req.url}`);
    // console.debug(`${req.statusCode} ${req.statusMessage}`);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    // res.end('<h1>hi from ' + os.hostname() + '\'s getNotFound page...</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
    // + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
    res.end(JSON.stringify({ err: 'Not Found' }));
}
