var path = require('path');
var express = require('express');
var cfg = require('./config.js');

exports.listen = function listen(configPath, serverCommandConfig, callback) {
	var app = express.createServer();

	app.configure(function(){
		app.use(express.bodyParser());
		app.use(perfectapi.restify(configPath));
	});
	
	var commands = cfg.getCommands(configPath);
	for (var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		if (cmd.name!="server") {
			//we could easily do the "server" command, but it would be inadvisable to allow it
			app[cmd.verb](cmd.path, function(req, res) {
				var config = req.perfectapi.config;
				var commandName = req.perfectapi.commandName;
				
				//a little complex here...callbacks within callbacks...oh well.  At this point, we are still in our code.
				//the callback here will cause an event to be emitted, and inside the caller's event handler code, they must
				//callback our own callback in order to send results to the browser
				callback(null, commandName, config, function(err, result) {
					//the caller's event handler must callback before we send a result to the browser
					if (err) {
						res.end('An error occurred: ' + err, 500);
					} else {
						res.contentType('application/json');
						res.end(result);
					}
				});
			});
		}
	}
	
	app.listen(serverCommandConfig.options.port);
}