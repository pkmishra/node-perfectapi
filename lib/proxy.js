/*
 * PerfectAPI Node proxy generator - reads a configuration from a remote server, and
 * creates a proxy that can be used to natively call that API.
 *
*/

var http=require('https');
var cfg=require('./config.js');
var url=require('url');

var api = {};
exports.api = api;

exports.proxy = function(proxyUrl) {
	var parsedUrl = url.parse(proxyUrl);
	api.ready = false;
	
	var httpOptions = {
		hostname: parsedUrl.hostname,
		port: parsedUrl.port || 80,
		path: parsedUrl.pathname + "/config",
		headers: {'Content-Type': 'application/json', "Accepts":"*/*", "User-Agent":"PerfectAPI"},
		agent: false
	};
	
	httpOptions = {
		host: "localhost",
		port: 3000,
		method: 'GET',
		path: "apis/config",
		//headers: {'Content-Type': 'application/json', "Accepts":"*/*", "User-Agent":"PerfectAPI"},
		agent: false
	}
	
	console.log('starting request for config');
	var req = http.request(httpOptions, function(res) {
		//expect a JSON response with raw config in it (pretty much the json file).
		console.log('requesting config');
		var configString = "";
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('got some data');
			configString += chunk;
		});
		res.on('end', function() {
			console.log('receieved config');
			//we have final config string
			var config = JSON.parse(configString);
			
			//what to do with it?  Read it, and export its endpoints as functions
			exportConfigAsFunctions(config, proxyUrl);
			api.ready = true;
		});
	});
	
	req.on('error', function(e) {
		console.log('problem with request for config: ' + e.message + '.  \nOptions were ' + JSON.stringify(httpOptions) + "\nfull error was: " + JSON.stringify(e) );
	});
	
	req.end();
	
	return api;		//may not be ready - check api.ready property to determine
};

/*
	We're aiming for usage like this:

	var gen = require('perfectapi').proxy('http://www.perfectapi.com/amigen/api/');

	var config = {   
			"root": "./node_modules/amigen/scripts"
		,   "baseAMI": "ami-a562a9cc"
		,   "scripts": ["ubuntu11.10/AWS_API_tools", "ubuntu11.10/nodejs-latest"]
		};

	gen.getImageUsingConfig(config, function(err, amiId) {
		if (err) {
			console.log(err);
		} else {
			console.log('ok, done - amiId = ' + amiId);
		}
	});
*/


function exportConfigAsFunctions(config, proxyUrl) {
	var commands = cfg.getCommands(config);
	
	for (var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		
		exportCommandAsFunction(config, cmd, proxyUrl);
	}
}

function exportCommandAsFunction(config, command, proxyUrl) {
	var fn = function(config, fncallback) {
			
		var parsedUrl = url.parse(proxyUrl);
		var reqOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || 80,
			path: parsedUrl.pathname + "/" + command.name,
			headers: {'Content-Type': 'application/json' }
		};
		var req = http.request(reqOptions, function(res) {
			var result = "";
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				result += chunk;
			});
			res.on('end', function() {
				//we have final result
				var result = JSON.parse(configString);
				
				fncallback(null, result);
			});
		});
		
		req.on('error', function(e) {
			fncallback(e);
		});
	};

	api[command.name] = fn;
	//exports[command.name] = fn;		//not sure if this will work
}