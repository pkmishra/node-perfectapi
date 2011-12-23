var fs = require('fs');
var path = require('path');

exports.getCommands = getCommands;

function getCommands(configPath) {
	var perfectapiJson = JSON.parse(fs.readFileSync(configPath)); 
	var commands = perfectapiJson.signature;

	return commands;
}

function getCommandByName(configPath, commandName) {
	var commands = getCommands(configPath);
	for (var i=0;i<commands.length;i++) {
		if (commands[i].name == commandName) return commands[i];
	}
	
	return null;
}
exports.getCommandByName = getCommandByName;

exports.getMatchingCommandByRequestPath = function(configPath, requestPath) {
	var commands = getCommands(configPath);
	for(var i=0;i<commands.length;i++) {
		if (commands[i].path == requestPath) 
			return commands[i].name;
	}
	
	return null;
};

exports.getCommandParameterName = function(configPath, commandName) {

	return getCommandByName(configPath, commandName).parameter.name;
};

exports.getDefaultConfig = function(configPath, commandName) {
	var command = getCommandByName(configPath, commandName);
	
	var config = {};
	
	//environment
	var environment = {};
	if (command.environment) {
		for(var i=0;i<command.environment.length;i++) {
			var env = command.environment[i];
			environment[env.parameter] = "";
			
			//preset it to a default based on current environment
			if (process.env[env.parameter])
				environment[env.parameter] = process.env[env.parameter];
		};
	};
	config.environment = environment;
	
	//parameter
	if (command.parameter) {
		if (command.parameter.type && command.parameter.type=='multi')
			config[command.parameter.name] = [];
		else
			config[command.parameter.name] = "";
	};
	
	//options
	var options = {};
	if (command.options) {
		for(var i=0;i<command.options.length;i++) {
			var option = command.options[i];
			
			if (option.option) {
				options[option.option] = option.default || "";
			} else {
				options[option.flag] = option.default || false;
			}
		}
	};
	config.options = options;
	
	//console.log(JSON.stringify(config));
	
	return config;
}

//http://stackoverflow.com/questions/7997342/merge-json-objects-without-new-keys
function merge(defaultConfig, additionalConfig) {
    for( var p in additionalConfig )
        if( defaultConfig.hasOwnProperty(p) ) 
            defaultConfig[p] = (typeof additionalConfig[p] === 'object' && !(p.length)) ? merge(defaultConfig[p], additionalConfig[p]) : additionalConfig[p];
		
    return defaultConfig;
}

exports.merge = merge;