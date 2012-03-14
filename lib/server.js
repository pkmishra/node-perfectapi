var path = require('path');
var express = require('express');
var cfg = require('./config.js');
var middleware = require('./connect.js');
var url = require('url');
var fs = require('fs');
var logger = require('winston').loggers.get('perfectapi');
var responder = require('./responder.js');
var util = require('util');

var app;

exports.stop = function() {
  if (app) {
    app.close();
    app = null;
  }
}

exports.listen = function listen(config, serverCommandConfig, callbackCligen) {
	app = express.createServer();
	app.configure(function(){
		app.use(express.bodyParser());
		app.use(middleware.restify(config));
  });
  
  var commands = cfg.getCommands(config);	
	
  var csharpclient = (config.exports || 'api') + '.cs';
  logger.info('listening for c# client at /' + config.path + '/' + csharpclient);
	app.get('/' + config.path + '/' + csharpclient, function(req, res, next) {
		logger.verbose('Sending csharp client');

		var data = fs.readFileSync(path.resolve(__dirname, 'clients', 'csharp_template.cs'), 'utf8');
		var ejs = require('ejs');
    var options = {};
    options.apiName = config.exports || 'api';
    var url = 'http://' + req.headers.host + req.url;
    options.endPoint = url.replace(csharpclient, '');
    options.commandSpecs = commands;
    
		data = ejs.render(data, options);
    
    res.contentType('text/plain');
		res.send(data);
		res.end();
	}); 
  
	logger.info('listening for javascript client at /' + config.path + '/jquery.perfectapi.js');
	app.get('/' + config.path + '/jquery.perfectapi.js', function(req, res, next) {
		logger.verbose('Sending javascript');

		var data = fs.readFileSync(path.resolve(__dirname, 'clients', 'javascript_template.js'), 'utf8');
		data = data
			.replace(/perfectapi/g, config.exports || 'perfectapi')
			.replace(/localhost/g, req.headers.host)
			.replace('/rootapipath/', req.url.replace('jquery.perfectapi.js', ''))
		
		//todo: caching
		res.send(data);
		res.end();
	});
	
	logger.info('listening for test app on /' + config.path + '/testapp/');
	app.get('/' + config.path + '/testapp', function(req, res, next) {
		//special handling for the index file
		var testAppFolder = path.resolve(__dirname, '..', 'testapp');
		var fileToSend = path.resolve(testAppFolder, 'index.html');
		var data = fs.readFileSync(fileToSend, 'utf8');
		data = data.replace('//localhost:3000/jquery.perfectapi.js', '/' + config.path + '/jquery.perfectapi.js');
		
		res.end(data);
	});
	app.get('/' + config.path + '/testapp/:file(*)', function(req, res, next) {
		//serving css, js, etc
	  var file = req.params.file
		var testAppFolder = path.resolve(__dirname, '..', 'testapp');
		var fileToSend = path.resolve(testAppFolder, file);
		res.sendfile(fileToSend);
	});
	
	for (var i=0;i<commands.length;i++) {
		var commandSpec = commands[i];
		if (!commandSpec.preventUseOnServer) {
			listenForCommand(config, app, commandSpec, callbackCligen);
		}
	}

	var io = require('socket.io').listen(app);
	io.set('log level', 1);
	io.enable('browser client minification');
	io.enable('browser client etag');
	io.set('transports', ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling'])
	io.sockets.on('connection', function (socket) {
		logger.verbose('received websocket connection');
		socket.on('callbackPlease', function(uuid){
			//tell the responder about the socket and the uuid
			logger.verbose('received websocket callbackPlease reply for ' + uuid)
			responder.callbackPlease(socket, uuid);
		});
	});
	
	app.listen(serverCommandConfig.options.port);
	logger.info('Listening on port ' + serverCommandConfig.options.port);
	return app;
}

function listenForCommand(apiConfig, app, commandSpec, callbackCligen) {
  //make a copy of the config, as its command ordering gets corrupted later (unsolved bug)
  apiConfig = JSON.parse(JSON.stringify(apiConfig));
  
  var path = commandSpec.path;
  var verb = commandSpec.verb;
  var params = commandSpec.parameters;
  
	logger.verbose('listening for ' + verb + ' to ' + path);
	verb = 'all';  //just listen for anything, JSONP does not do POST.
	app[verb](path, function(req, res) {
		handleCommand(apiConfig, commandSpec, req, res, callbackCligen);
	});
  //also handle parameters sent via REST
  var pathExt = '';
  params.forEach(function(param) {
    if (param.type && param.type == 'multi') {
      //we do not support this for multivalued params
    } else 
      pathExt += '/' + param.name + '/:' + param.name;
  })
  if (pathExt != '') {
    logger.verbose('listening for ' + verb + ' to ' + path + pathExt)
    app[verb](path + pathExt, function(req, res) {
      handleCommand(apiConfig, commandSpec, req, res, callbackCligen);
    })
  }
}

function handleCommand(apiConfig, commandSpec, req, res, callbackCligen) {
	if (!req.perfectapi) {
		logger.warn('bad request');
		res.contentType('text/html');
		res.end('Recieved request to ' + req.path + ', but did not contain any config data');
		return;
	}
	var config = req.perfectapi.config;
	var commandName = req.perfectapi.commandName;
	
	logger.verbose('Received command ' + commandName);
	
  var callback = callbackCligen;
  if (req.perfectapi.errors != '') {
    //request failed validation - override the callbackCligen to just return an error
    callback = function(err, commandName, config, cb) { cb(req.perfectapi.errors, null); }
  }
	if (commandName == 'config') {
		//special case - send config to the client
    cfg.getCommands(apiConfig);   //force init of commands
		callback = function(err, commandName, config, cb) { cb(null, apiConfig); }
	}
  
  //At this point, we still have not done any custom command logic. The responder must do that, because
  //it has code to manage the client connection if the command takes a long time.
  responder.respond(callback, commandName, config, commandSpec, req, res);  
}
