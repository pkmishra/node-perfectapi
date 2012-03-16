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

exports.listen = function listen(config, serverCommandConfig, callbackCligen) {
	app = express.createServer();
	app.configure(function(){
		app.use(express.bodyParser());
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
	
	app.listen(serverCommandConfig.options.port);
	logger.info('Listening on port ' + serverCommandConfig.options.port);
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
    config = cachedDefaultConfigs[matchedCommandName];
  } else {
    config = cfg.getDefaultConfig(apiConfig, matchedCommandName);
    cachedDefaultConfigs[matchedCommandName] = config;
  }
  
  if (req.headers['content-type'] == 'application/x-www-form-urlencoded') {
    parseQuery(req.body, config, commandSpec);
  } else {
    //default is application/json
    config = cfg.merge(config, req.body);
  }
  
  //also support querystring
  var query = url.parse(req.url, true).query;
  parseQuery(query, config, commandSpec);

  //and route params
  parseQuery(req.params, config, commandSpec);
  
  /*
   * Environment variables should be passed in headers 
  */
  if (commandSpec.environment) {
    var environment = commandSpec.environment;
    for(var i=0;i<environment.length;i++) {
      var value = req.header(environment[i].parameter, null);
      if (value) {
        config.environment[environment[i].parameter] = value;
      }
    }
  }
  
  /*
    Override environment variables with values found in current environment (server takes precedence).
    This behavior can be overriden by setting the allowOverride attribute on the environment variable.
    (the flag has no effect on the command-line-interface; it is only the server interface that behaves this way).
  */
  if (commandSpec.environment) {
    commandSpec.environment.forEach(function(env) {
      if (!env.allowOverride) {
        var serverValue = process.env[env.parameter]
        if (serverValue) {
          config.environment[env.parameter] = serverValue;
        }
      }
    })
  }
  
  var result = {};
  result.commandName = matchedCommandName;
  result.config = config;
  result.errors = validateRequired(config, commandSpec);
  
  return result;
}

function parseQuery(query, config, commandSpec) {
  for (var qs in query) {
    
    if (qs == 'config') {
      //get config from "config" value
      config = cfg.merge(config, JSON.parse(query.config));	
    } else {
    
      var paramSpec = getParameterSpec(qs, commandSpec);
      if (paramSpec) {
        if (paramSpec.type && (paramSpec.type=='multi')) {
          //an array
          if (util.isArray(query[qs])) {
            //?qs=123&qs=345  ==>  [123, 345]
            config[qs] = query[qs];
          } else {
            config[qs] = config[qs] || [];
            config[qs].push(query[qs]);
          }
        } else {
          config[qs] = query[qs];
        }
      } else {
        var envSpec= getEnvironmentSpec(qs, commandSpec);
        if (envSpec) {
          config.environment = config.environment || {};
          config.environment[qs] = query[qs]; 
        } else {
          //options
          config.options = config.options || {};
          
          if (commandSpec.options) {
            var val = query[qs];
            commandSpec.options.forEach(function(option) {
              if (option.flag && option.flag == qs) {
                //fix boolean flags - convert string values to boolean values
                val = (val === 'true' || val === true) ? true : false;
              }
            })
            config.options[qs] = val;      
          }
        }
      }
    }
  }
}

/* Validate required options, parameters, environment */
function validateRequired(config, commandSpec) {
  var errors = '';
  
  if (commandSpec.parameters) {
    commandSpec.parameters.forEach(function(param) {
      if (param.required == true
      && (config[param.name] == '' || config[param.name] == []) ) {
        errors += 'Parameter ' + param.name + ' is required\n';
      }
    })
  }
  
  if (commandSpec.options) {
    for (var i=0;i<commandSpec.options.length;i++) {
      if (commandSpec.options[i].required
      && commandSpec.options[i].required == true
      && config.options[commandSpec.options[i].option] == '') {
        errors += 'Option ' + commandSpec.options[i].option + ' is required\n';
      }
    }
  }
  
  if (commandSpec.environment) {
    for (var i=0;i<commandSpec.environment.length;i++) {
      if (commandSpec.environment[i].required
      && commandSpec.environment[i].required == true
      && config.environment[commandSpec.environment[i].parameter] == '') {
        errors += 'Environment ' + commandSpec.environment[i].parameter + ' is required\n';
      }      
    }
  }
  
  if (errors != '') errors = errors.substring(0, errors.length-1);   //remove trailing newline
  return errors;
}

function getParameterSpec(name, commandSpec) {
  if (!commandSpec.parameters) return null;
  
  for (var i=0;i<commandSpec.parameters.length;i++) {
    var param = commandSpec.parameters[i];
    if (param.name == name) return param;
  }
  
  return null;
}


function getEnvironmentSpec(name, commandSpec) {
	if (!commandSpec.environment) return null;
	
	var environment = commandSpec.environment;
	for(var i=0;i<environment.length;i++) {
		if (environment[i].parameter == name) return environment[i];
	}
	
	return null;
}
