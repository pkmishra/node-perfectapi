/**
 * Connect middleware for perfectapi JSON+REST server.  Creates a 
 * request.perfectapi.config property, containing the configuration from the request, and also 
 * request.perfectapi.commandName, containing the command name.
 *
 * Examples:
 *
 *     connect()
 *       .use(express.bodyParser())
 *       .use(perfectapi.restify(pathToPerfectapiDotJson))
 *
 * @param {Object} rawConfig - the config
 * @return {Function}
 * @api public
 */

var cfg = require('./config.js');
var url = require('url');

exports.restify = function (rawConfig){
	return function restify(req, res, next) {
		console.log('Matching request...');

		//console.log(req.body);
		//console.log(req.headers);
		
		var matchedCommandName = cfg.getMatchingCommandByRequestPath(rawConfig, url.parse(req.url).pathname);
		if (matchedCommandName 
		&& (req.accepts('application/json') || req.accepts('application/javascript')))  {
			
			console.log('Received command, parsing...');
			//req.body should be a perfectapi-compatible config file, specified in
			//JSON format. This requires the 
			//curl example:
			//curl -v -H "Content-Type: application/json" -d "{\"scripts\":[\"ubuntu11.10\", \"ubuntu11.10/juju\"]}" -X POST localhost:3000/apis/gen
			var defaultConfig = cfg.getDefaultConfig(rawConfig, matchedCommandName);
			var config = cfg.merge(defaultConfig, req.body);
			
			var query = url.parse(req.url, true).query;
			if (query.callback) {
				//this is a JSONP request (JSONP does not do POST, so we use querystring)
				query = JSON.parse(query.config);
				//console.log(query)
				
				config = cfg.merge(config, query);
			}
			var command = cfg.getCommandByName(rawConfig, matchedCommandName);
			
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
			//console.log(req);
			//console.log(req.perfectapi);
		} else {
			console.log('Not an API request');
		};
		
		//console.log('RESTIFIED was called.  Not used though - ' + matchedCommandName);
		next();
	};
};


