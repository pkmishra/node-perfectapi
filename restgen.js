var fs = require('fs');
var path = require('path');
var express = require('express');
var cfg = require('./config.js');

exports.parse = function(configPath, callback) {
	var commands = cfg.getCommands(configPath);
	
	var app = express.createServer();
	app.configure(function(){
		//app.use(express.methodOverride());
		app.use(express.bodyParser());
		//app.use(app.router);
	});
	
	/*
	app.get('/version', function(req, res, next){
		res.end(version);
	});
	*/
	
	for (var i=0;i<commands.length;i++) {
	
		setupListener(configPath, app, commands[i], callback);
	};
	
	app.listen(3000);
};

function setupListener(configPath, app, command, callback) {
	var name = command.name;
	var part = command.path;
	
	app.all(part, function(req, res, next) {
		if (req.accepts('application/json') && req.header('Content-Type')=='application/json') {
			//req.body should be a perfectapi-compatible config file, specified in
			//JSON format.
			//curl example:
			//curl -v -H "Content-Type: application/json" -d "{\"scripts\":[\"ubuntu11.10\", \"ubuntu11.10/juju\"]}" -X POST localhost:3000/apis/gen
			var defaultConfig = cfg.getDefaultConfig(configPath, name);
			var config = cfg.merge(defaultConfig, req.body);

			if (command.environment) {
				var environment = command.environment;
				for(var i=0;i<environment.length;i++) {
					var value = req.header(environment[i].parameter, null);
					if (value) config.environment[environment[i].parameter] = value;
				}
			}
		
			//res.end('Accepted request to ' + part);
			callback(null, name, config, function(err, result) {
				if (err) {
					console.log('error: ' + err);
					res.end(err);
				} else 
					res.end(result);
			});
		} else {
			res.end('Only accepting json requests right now (Content-Type=application/json)');
		}
	});
}

