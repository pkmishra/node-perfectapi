var fs = require('fs');
var path = require('path');
var logger = require('winston').loggers.get('perfectapi');
var util = require('util');

exports.getCommands = getCommands;

exports.getConfigFromPath = function(configPath) {
	var config = JSON.parse(fs.readFileSync(configPath)); 
	
	return config
};

function getCommands(rawConfig) {
	var commands = rawConfig.signature;
	
	//check if we already ran
	if (!commands) logger.error('Bad config ' + JSON.stringify(rawConfig));
	if (commands[commands.length-1].name == "config") return commands;
	
	//setup the PerfectAPI system commands
	commands.push(getServerCommand());
	commands.push(getConfigCommand());
	
	//set up REST path (endpoint)
	var restPath = rawConfig.path;
	if (!restPath || restPath=="") restPath = "/";
	if (restPath[0]!="/") restPath = "/" + restPath;
	if (restPath.length!=1 && restPath[restPath.length-1]!='/') restPath += '/';
	for (var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		cmd.path = restPath + cmd.name;
	}
	
	//setup global environment
	var env = rawConfig.environment;
	if (env) {
		for (var i=0;i<commands.length;i++) {
			var cmd = commands[i];
			if (cmd.environment) {
				//already has an environment specified.  Add to that
				cmd.environment = env.concat(cmd.environment);
			} else {
				cmd.environment = env;
			}
		}		
	}
	
	return commands;
}

function getServerCommand() {
	var cmd = {};
	cmd.name = "server";
	cmd.preventUseOnServer = true;		//prevent this from being used from a server
	cmd.synopsis = "Run this API as a PerfectAPI server";
	cmd.description = "Use this to run as a self-hosted server, capable of responding over the web to the various commands";
	cmd.options = [];
	var option = {};
	option.option = "port"; option.long="port"; option.short="p"; option.required=true; option.default=3000; 
	option.description = "Specifies the TCP port on which the API will listen";
	cmd.options.push(option);
	cmd.returns = [];
	
	return cmd;
}

function getConfigCommand() {
	var cmd = {};
	cmd.name = "config";
	cmd.synopsis = "Return the PerfectAPI config for this API";
	cmd.description = "Use this to get information on this API";
	cmd.options = [];
	cmd.verb = "GET";
	var returnCfg = {name: "config", description: "json config file"}
	cmd.returns = [];
	cmd.returns.push(returnCfg);
	
	return cmd;
}

function getCommandByName(config, commandName) {
	var commands = getCommands(config);
	for (var i=0;i<commands.length;i++) {
		if (commands[i].name == commandName) return commands[i];
	}
	
	return null;
}
exports.getCommandByName = getCommandByName;

exports.getMatchingCommandByRequestPath = function(config, requestPath) {
	var commands = getCommands(config);
	for(var i=0;i<commands.length;i++) {
		if (commands[i].path == requestPath) 
			return commands[i].name;
	}
	
	return null;
};

exports.getCommandParameterName = function(config, commandName) {

	var param = getCommandByName(config, commandName).parameter
	if (param) {
		return param.name;
	} else {
		return null;
	}
	
};

exports.getDefaultConfig = function(config, commandName) {
	var command = getCommandByName(config, commandName);
	
	var config = {};
	
	//environment
	var environment = {};
	if (command.environment) {
		for(var i=0;i<command.environment.length;i++) {
			var env = command.environment[i];
			environment[env.parameter] = '';
			
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
			config[command.parameter.name] = '';
	};
	
	//options
	var options = {};
	if (command.options) {
		for(var i=0;i<command.options.length;i++) {
			var option = command.options[i];
			
			if (option.option) {
				options[option.option] = option.default || '';
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
	for( var p in additionalConfig ) {
		if( defaultConfig.hasOwnProperty(p)) {
			if (typeof additionalConfig[p] === 'object' && !(util.isArray(additionalConfig[p]))) {
				//this is an object, recurse
				defaultConfig[p] = merge(defaultConfig[p], additionalConfig[p]);
			} else {
				//this is an array or otherwise simple property
				defaultConfig[p] = additionalConfig[p];
			}
		}
	};

	return defaultConfig;
}

exports.merge = merge;