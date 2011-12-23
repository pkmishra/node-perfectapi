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
 * @param {String} jsonConfigPath - the path to he perfectapi.json file
 * @return {Function}
 * @api public
 */

var cfg = require('./config.js');

exports.restify = function (jsonConfigPath){
	return function restify(req, res, next) {
		var matchedCommandName = cfg.getMatchingCommandByRequestPath(jsonConfigPath, req.url);
		if (matchedCommandName && req.accepts('application/json') && req.header('Content-Type')=='application/json') {
			//req.body should be a perfectapi-compatible config file, specified in
			//JSON format. This requires the 
			//curl example:
			//curl -v -H "Content-Type: application/json" -d "{\"scripts\":[\"ubuntu11.10\", \"ubuntu11.10/juju\"]}" -X POST localhost:3000/apis/gen
			var defaultConfig = cfg.getDefaultConfig(jsonConfigPath, matchedCommandName);
			var config = cfg.merge(defaultConfig, req.body);
			var command = cfg.getCommandByName(jsonConfigPath, matchedCommandName);
			
			if (command.environment) {
				var environment = command.environment;
				for(var i=0;i<environment.length;i++) {
					var value = req.header(environment[i].parameter, null);
					if (value) 
						config.environment[environment[i].parameter] = value;
				}
			}
			
			req.url = "/" + matchedCommandName;	//override
			req.perfectapi = {};
			req.perfectapi.commandName = matchedCommandName;
			req.perfectapi.config = config;
			console.log(req);
		};
		
		//console.log('RESTIFIED was called.  Not used though - ' + matchedCommandName);
		next();
	};
};