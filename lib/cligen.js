var fs = require('fs');
var path = require('path');
var program = require('./commander.js');
var util = require('util');
var events = require('events');
var cfg = require('./config.js');
var server = require('./server.js');

//I don't understand really, but following example from 
//  http://elegantcode.com/2011/02/21/taking-baby-steps-with-node-js-implementing-events/
function Parser() {
    if(false === (this instanceof Parser)) {
        return new Parser();
    }

    events.EventEmitter.call(this);
}
util.inherits(Parser, events.EventEmitter);

/*
  parses the command line and raises an event when a command is called:
    - @eventName = name of the command that was requested
	- @config = options & parameters that were passed in standard perfectAPI config format (includes defaults)
	- @callback = function to call once command has been completed
*/

Parser.prototype.parse = function(configPath) {
	var self = this;	
	var config = cfg.getConfigFromPath(configPath);
	var commands = cfg.getCommands(config);

	/*
	var packagePath = path.resolve(__dirname, '..', '..', 'package.json');
	var version = JSON.parse(fs.readFileSync(packagePath)).version; 
	program.version(version);
	*/
	
	for (var i=0;i<commands.length;i++) {
		var command = commands[i];
		var name = command.name;
		if (command.parameter) {
			var multi = (command.parameter.type=='multi') ? '..' : '';
			if (command.parameter.required) {
				name += ' <' + command.parameter.name + multi + '>';
			} else
				name += ' [' + command.parameter.name + multi + ']';
		} else {
			//name is sufficient
		}
		
		var cmd = program
			.command(name)
			.description(command.synopsis)
			.action(function() {
				//handle the command-line
				var options = arguments[arguments.length-1];
				var commandName = options.name;
				var args = [commandName, options];
				var parameters = [];
				for (var i=0;i<arguments.length-1;i++) 
					parameters.push(arguments[i]);
					
				args.push(parameters);
				var finalConfig = cfg.getDefaultConfig(config, commandName);
				var paramName = cfg.getCommandParameterName(config, commandName);
				if (paramName) 
					finalConfig[paramName] = parameters;
				finalConfig.options = cfg.merge(finalConfig.options, options);	//merge the parsed options into the standard perfectAPI options
				
				if (commandName=="server") {
					//special handling, we self-host the server and it intercepts the commands and emits them
					server.listen(config, finalConfig, function(err, newCommandName, newConfig, finalCallback) {
						if (err) { 
							//not sure what to do here
							console.log("Error: " + err);
						} else {
							self.emit(newCommandName, newConfig, finalCallback);
						}
					});
				} else if (commandName=="config") {
					//special handling, we return the config
					console.log(JSON.stringify(config));
				} else {
					//raise an event to let the actual code handle the command
					self.emit(commandName, finalConfig, function(err, result) {
						//caller's code can call us back to let us know the result so we can show it on the command-line
						if (err) {
							console.log("Error: " + err);
						} else {
							console.log(result);
						}
					});
				}
			});
		
		//setup commander.js options:
		var options = command.options;
		for (var j=0;j<options.length;j++) {
			var option = options[j];
			if (option.option) {
				var optionText = '-' + option.short + ', --' + option.long;
				if (option.required)
					optionText += ' <' + option.option + '>'
				else
					optionText += ' [' + option.option + ']';
				
				if (option.default) 
					cmd.option(optionText, option.description, option.default);
				else
					cmd.option(optionText, option.description);
			} else if (option.flag) {
				var optionText = '-' + option.short + ', --' + option.long;
				cmd.option(optionText, option.description);
			}
		}
	}

	program.parse(process.argv);
	
	return initNativeAPI(config, self);	
}

exports.Parser = Parser;

function initNativeAPI(config, emitter) {
	//expose functions for each command
	//function commandName(config, callback)
	var commands = cfg.getCommands(config);
	var api = {}
	
	for(var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		
		var commandFunction = getCommandFunction(config, cmd.name, emitter)
		
		api[cmd.name] = commandFunction;
	}
	
	return api;
};

function getCommandFunction(config, commandName, emitter) {
	var commandFunction = function(config, callback) {
		console.log('handling command ' + commandName);
		var finalConfig = cfg.getDefaultConfig(config, commandName);
		var paramName = cfg.getCommandParameterName(config, commandName);
		if (paramName) 
			finalConfig[paramName] = parameters;
		finalConfig.options = cfg.merge(finalConfig.options, config.options);	//merge the parsed options into the standard perfectAPI options
	
		emitter.emit(commandName, finalConfig, callback);
	}
	
	return commandFunction;
}


