/**
 * Connect middleware for perfectapi JSON+REST server.  Creates a 
 * request.perfectapi.config property, containing the configuration from the request, and also 
 * request.perfectapi.commandName, containing the command name.  Also 
 * request.perfectapi.errors, containing validation errors.
 *
 * Examples:
 *
 *     connect()
 *       .use(express.bodyParser())
 *       .use(perfectapi.restify(rawConfig))
 *
 * @param {Object} rawConfig - the config
 * @return {Function}
 * @api public
 */

var cfg = require('./config.js');
var url = require('url');
var logger = require('winston').loggers.get('perfectapi');
var util = require('util');

exports.restify = function (rawConfig){
	return function restify(req, res, next) {
		logger.verbose('Matching request...');

		//console.log(req.body);
		//console.log(req.headers);
		
		var matchedCommandName = cfg.getMatchingCommandByRequestPath(rawConfig, url.parse(req.url).pathname);
		if (matchedCommandName)  {
			logger.verbose('Received command, parsing...');
			var command = cfg.getCommandByName(rawConfig, matchedCommandName);
			
			/* We support the following ways of getting the config data, either individually or in combination:
			 *   - req.body (POST) - should be perfectapi-compatible config in JSON
			 *   - req.query as single "config" param
			 *   - req.query as set of param + options
			*/
			
			var defaultConfig = cfg.getDefaultConfig(rawConfig, matchedCommandName);
			//get initial config direct from body (POST config):
			var config = cfg.merge(defaultConfig, req.body);		
			
			var query = url.parse(req.url, true).query;
			for (var qs in query) {
				if (qs == 'config') {
					//get config from "config" value
					config = cfg.merge(config, JSON.parse(query.config));	
				} else if ((command.parameter) && (qs == command.parameter.name)) {
					//parameter
					if (command.parameter.type && (command.parameter.type=='multi')) {
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
				} else if (isEnvironmentVariable(qs, command)) {
					//environment variable - should really be passed in header but we are forgiving
					config.environment = config.environment || {};
					config.environment[qs] = query[qs];
				} else {
					//options
					config.options = config.options || {};
					config.options[qs] = query[qs];
				}
			}
			
			/*
			 * Environment variables should be passed in headers 
			*/
			if (command.environment) {
				var environment = command.environment;
				for(var i=0;i<environment.length;i++) {
					var value = req.header(environment[i].parameter, null);
					if (value) 
						config.environment[environment[i].parameter] = value;
				}
			}
			
			req.perfectapi = {};
			req.perfectapi.commandName = matchedCommandName;
			req.perfectapi.config = config;
			req.perfectapi.errors = validateRequired(config, command);
      
			//logger.info(JSON.stringify(config, null, 2));
		} else {
			logger.verbose('Not an API request');
		};
		
		next();
	};
};

/* Validate required options, parameters, environment */
function validateRequired(config, commandSpec) {
  var errors = '';
  
  if (commandSpec.parameter 
  && commandSpec.parameter.required == "true"
  && (config[commandSpec.parameter.name] == '' || config[commandSpec.parameter.name] == []) ) {
    errors += 'Parameter ' + commandSpec.parameter.name + ' is required\n';
  }
  
  if (commandSpec.options) {
    for (var i=0;i<commandSpec.options.length;i++) {
      if (commandSpec.options[i].required
      && commandSpec.options[i].required == "true"
      && config.options[commandSpec.options[i].option] == '') {
        errors += 'Option ' + commandSpec.options[i].option + ' is required\n';
      }
    }
  }
  
  if (commandSpec.environment) {
    for (var i=0;i<commandSpec.environment.length;i++) {
      if (commandSpec.environment[i].required
      && commandSpec.environment[i].required == "true"
      && config.environment[commandSpec.environment[i].parameter] == '') {
        errors += 'Environment ' + commandSpec.environment[i].parameter + ' is required\n';
      }      
    }
  }
  
  if (errors != '') errors = errors.substring(0, errors.length-1);   //remove trailing newline
  return errors;
}

function isEnvironmentVariable(name, command) {
	if (!command.environment) return false;
	
	var environment = command.environment;
	for(var i=0;i<environment.length;i++) {
		if (environment[i].parameter == name)
			return true;
	}
	
	return false;
}










