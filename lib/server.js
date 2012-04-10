var path = require('path');
var express = require('express');
var cfg = require('./config.js');
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

exports.listen = function listen(config, serverCommandConfig, callbackCligen, serverHandle, done) {
	app = express.createServer();
	app.configure(function(){
		app.use(express.bodyParser());
  });
  
  var commands = cfg.getCommands(config);	
	
  var csharpclient = (config.exports || 'api') + '.cs';
  logger.verbose('listening for c# client at /' + config.path + '/' + csharpclient);
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
  
	logger.verbose('listening for javascript client at /' + config.path + '/jquery.perfectapi.js');
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
	
	logger.verbose('listening for test app on /' + config.path + '/testapp/');
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
	
  if (serverHandle) {
    app.listen(serverHandle);
  } else {
    app.listen(serverCommandConfig.options.port);
  }
	
	logger.verbose('Listening on port ' + serverCommandConfig.options.port);
  
  if (done) done();
  
	return app;
}

function listenForCommand(apiConfig, app, commandSpec, callbackCligen) {
  //make a copy of the config, as its command ordering gets corrupted later (unsolved bug)
  apiConfig = JSON.parse(JSON.stringify(apiConfig));
  
  var path = commandSpec.path;
  
  var verb = commandSpec.verb.toLowerCase();
	logger.verbose('listening for ' + verb + ' to ' + path);
  if (verb != 'get') {
    //handle non-gets
    app[verb](path, function(req, res) {
      handleCommand(apiConfig, commandSpec, req, res, callbackCligen);
    });  
  }
	verb = 'get';  //always listen for GET, because JSONP does not do POST.
	app[verb](path, function(req, res) {
		handleCommand(apiConfig, commandSpec, req, res, callbackCligen);
	});

  //also handle parameters sent via REST
  var params = commandSpec.parameters;
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
  var parsed = parseCommand(apiConfig, commandSpec, req);
  
	var config = parsed.config;
	var commandName = parsed.commandName;
	
	logger.verbose('Received command ' + commandName);
	
  var callback = callbackCligen; 
  if (parsed.errors != '') {
    //request failed validation - override the callbackCligen to just return an error
    callback = function(err, commandName, config, cb) { cb(parsed.errors, null); }
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

var cachedDefaultConfigs = {};
function parseCommand(apiConfig, commandSpec, req) {
  logger.verbose('Received command, parsing...');
  
  var matchedCommandName = commandSpec.name;
  
  /* We support the following ways of getting the config data, either individually or in combination:
   *   - req.body (POST) - should be perfectapi-compatible config in JSON - application/json (default)
   *   - req.body (POST) - as set of name values (form post style) - application/x-www-form-urlencoded 
   *   - req.query as single "config" param
   *   - req.query as set of param + options
   *   - req.path, when parameters (not options) are specified as part of the path we are listening on
  */
  
  var config;
  if (cachedDefaultConfigs.hasOwnProperty(matchedCommandName)) {
    //use cached value if possible
    config = JSON.parse(cachedDefaultConfigs[matchedCommandName]);
  } else {
    config = cfg.getDefaultConfig(apiConfig, matchedCommandName);
    cachedDefaultConfigs[matchedCommandName] = JSON.stringify(config);  //store as a string because otherwise the cache will remember params between calls
  }
  
  if (req.headers['content-type'] != 'application/x-www-form-urlencoded') {
    //default is application/json
    config = cfg.merge(config, req.body);
  }

  var errors = '';
  
  //handle special case
  var configAsSingleParam = req.param('config');
  if (configAsSingleParam) {
    config = cfg.merge(config, JSON.parse(configAsSingleParam))
  }
  
  //parse parameters
  if (commandSpec.parameters) {
    for (var i=0;i<commandSpec.parameters.length;i++) {
      var param = commandSpec.parameters[i];
      var name = param.name;
      var data = req.param(name);
      
      if (data) {
        if (param.type && (param.type=='multi')) {
          //an array
          if (util.isArray(data)) {
            //?qs=123&qs=345  ==>  [123, 345]
            config[name] = data;
          } else {
            config[name] = config[name] || [];
            config[name].push(data);
          }
        } else {
          config[name] = data;
        }
      } 
      
      //do required validations
      if (param.required == true
      && (config[name] == '' || config[name] == []) ) {
        errors += 'Parameter ' + name + ' is required\n';
      }
    }
  }
  
  //parse options
  config.options = config.options || {};
  var options = commandSpec.options;
  if (options) {
    var optionsAsSingleParam = req.param('options')
    if (optionsAsSingleParam) {
      cfg.merge(config.options, optionsAsSingleParam)
    }
    
    for (var i=0;i<commandSpec.options.length;i++) {
      var option = commandSpec.options[i];
      var data, name;
      
      if (option.flag) {
        //fix boolean flags - convert string values to boolean values
        name = option.flag;
        data = req.param(name);
        data = (data === 'true' || data === true) ? true : false;
      } else {
        name = option.option;
        data = req.param(name);
      }
      
      if (data) {
        config.options[name] = data;
      }
          
      //do required validations
      if (option.required
      && !config.options[name]) {
        errors += 'Option ' + name + ' is required\n';
      }
    }
  }
  
  //parse environment
  config.environment = config.environment || {};
  var environment = commandSpec.environment;
  if (environment) {
    for(var i=0;i<environment.length;i++) {
      var env = environment[i];
      var name = env.parameter;
      var envData = process.env[name];
      var data;
      
      if (env.allowOverride || !envData) {
        data = req.header(name, null)
        if (!data) {
          data = req.param(name);
        }
        if (!data) {
          data = envData;
        }
      } else {
        data = envData;
      }
      
      if (data) {
        config.environment[name] = data; 
      } 
      
      //do required validations
      if (env.required
      && config.environment[name] == '') {
        errors += 'Environment ' + commandSpec.environment[i].parameter + ' is required\n';
      }    
    }  
  }
  
  var result = {};
  result.commandName = matchedCommandName;
  result.config = config;
  if (errors != '') errors = errors.substring(0, errors.length-1);   //remove trailing newline
  result.errors = errors;
  
  return result;
}

