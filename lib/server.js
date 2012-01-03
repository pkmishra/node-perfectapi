var path = require('path');
var express = require('express');
var cfg = require('./config.js');
var middleware = require('./connect.js');

exports.listen = function listen(config, serverCommandConfig, callback) {
	var app = express.createServer();
	app.configure(function(){
		app.use(express.bodyParser());
		app.use(middleware.restify(config));
	});
	
	var commands = cfg.getCommands(config);
	for (var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		//console.log('found command ' + cmd.name + ' in position ' + i);
		if (cmd.name!="server") {
			//we could easily do the "server" command, but it would be inadvisable to allow it
			listenForCommand(app, cmd.path, cmd.verb);
		}
	}
	
	app.listen(serverCommandConfig.options.port);
	console.log('Listening on port ' + serverCommandConfig.options.port);
}

function listenForCommand(app, path, verb) {
	console.log('listening for ' + verb + ' to ' + path);
	app[verb.toLowerCase()](path, function(req, res) {
		if (!req.perfectapi) {
			//console.log('bad request');
			res.contentType('text/html');
			res.end('Recieved request to ' + path + ', but was not in correct format - needs Content-Type=application/json');
			return;
		}
		var config = req.perfectapi.config;
		var commandName = req.perfectapi.commandName;
		
		console.log('Received command ' + commandName);
		
		if (commandName == 'config') {
			//special case - send config to the client
			res.contentType('application/json');
			res.end(JSON.stringify(config));
		} else {
			//a little complex here...callbacks within callbacks...oh well.  At this point, we are still in our code.
			//the callback here will cause an event to be emitted, and inside the caller's event handler code, they must
			//callback our own callback in order to send results to the browser
			callback(null, commandName, config, function(err, result) {
				//the caller's event handler must callback before we send a result to the browser
				if (err) {
					res.end('An error occurred: ' + err, 500);
				} else {
					res.contentType('application/json');
					res.end(JSON.stringify(result));
				}
			});
		}
	});
}