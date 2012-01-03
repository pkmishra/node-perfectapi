/*
 * PerfectAPI Node proxy generator - reads a configuration from a remote server, and
 * creates a proxy that can be used to natively call that API.
 *
*/

var http=require('https');
var cfg=require('./config.js');

exports.proxy = function(hostname, apiPath, port) {
	
	var httpOptions = {
		hostname: hostname,
		port: port || 80,
		path: (apiPath || "") + "/config",
		headers: {'Content-Type': 'application/json' },
		agent: false
	};
	
	var req = http.get(httpOptions, function(res) {
		//expect a JSON response
		var configString = "";
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			configString += chunk;
		});
		res.on('end', function() {
			//we have final config string
			var config = JSON.parse(configString);
			
			
		});
	});
	
	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	});
};