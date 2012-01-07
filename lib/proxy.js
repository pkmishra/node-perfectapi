/*
 * PerfectAPI Node proxy generator - reads a configuration from a remote server, and
 * creates a proxy that can be used to natively call that API.
 *
*/

var http=require('http');
var cfg=require('./config.js');
var url=require('url');
var logger = require('winston').loggers.get('perfectapi');

exports.proxy = function(proxyUrl, callback) {
	var parsedUrl = url.parse(proxyUrl);
	
	var httpOptions = {
		hostname: parsedUrl.hostname,
		port: parsedUrl.port || 80,
		path: parsedUrl.pathname + "/config",
		headers: {'Content-Type': 'application/json', "Accepts":"*/*", "User-Agent":"PerfectAPI"},
		agent: false
	};
	
	logger.verbose('starting request for config');
	
	req = http.request(httpOptions, function(res) {
		//expect a JSON response with raw config in it (pretty much the json file).
		logger.verbose('requesting config');
		var configString = "";
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			logger.silly('got some data');
			configString += chunk;
		});
		res.on('end', function() {
			logger.verbose('receieved config: ' + configString);
			//we have final config string
			var config = JSON.parse(configString);
			
			//what to do with it?  Read it, and export its endpoints as functions
			var api = exportConfigAsFunctions(config, proxyUrl);
			logger.verbose("API: " + JSON.stringify(api));
			callback(null, api);
		});
	});
	
	
	req.on('error', function(e) {
		logger.error('problem with request for config: ' + e.message + "\nfull error was: " + JSON.stringify(e) );
		//console.log('options were ' + JSON.stringify(httpOptions));
		callback(e);
	});
	
	req.end();
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
	var api = {};
	
	for (var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		
		logger.verbose('Exposing proxy for ' + cmd.name);
		api[cmd.name] = exportCommandAsFunction(config, cmd, proxyUrl);
	}
	
	return api;
}

function exportCommandAsFunction(config, command, proxyUrl) {
	var fn = function(config, fncallback) {
		
		logger.verbose('proxy command ' + command.name + ' has been called');
		var parsedUrl = url.parse(proxyUrl);
		var reqOptions = {
			hostname: parsedUrl.hostname,
			port: parsedUrl.port || 80,
			path: parsedUrl.pathname + "/" + command.name,
			method: command.verb,
			headers: {'Content-Type': 'application/json' }
		};
		logger.verbose('calling proxy at ' + reqOptions.hostname + ":" + reqOptions.port + ' using ' + reqOptions.method);
		logger.verbose('proxy path will be ' + reqOptions.path);
		
		var req = http.request(reqOptions, function(res) {
			var resultString = "";
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				resultString += chunk;
			});
			res.on('end', function() {
				//we have final result
				console.log('Result look like this: ' + resultString);
				var result = JSON.parse(resultString);
				
				fncallback(null, result);
			});
		});
		
		req.on('error', function(e) {
			fncallback(e);
		});
		
		req.write(JSON.stringify(config));
		req.end();
	};

	return fn;
}