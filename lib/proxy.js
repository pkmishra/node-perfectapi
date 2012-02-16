/*
 * PerfectAPI Node proxy generator - reads a configuration from a remote server, and
 * creates a proxy that can be used to natively call that API.
 *
*/

var cfg=require('./config.js');
var logger = require('winston').loggers.get('perfectapi');
var request = require('request');
var util = require('util');

exports.proxy = function(proxyUrl, callback) {
	logger.verbose('starting request for config');
	
  var href = proxyUrl + '/config';
  var reqOptions = {url: href, 
    method: 'GET',
    json: true,
    encoding: 'utf8',
    headers: {"Accepts":"*/*", "User-Agent":"PerfectAPI" },
    body: ''
  };
  
  request(reqOptions, function(err, res) {
    if (err) {
      logger.error('problem with request for config: ' + err.message + "\nfull error was: " + JSON.stringify(err) );
      //console.log('options were ' + JSON.stringify(httpOptions));
      return callback(err);    
    }
    
    var config = res.body;    
    var api = exportConfigAsFunctions(config, proxyUrl);
    logger.verbose("API: " + JSON.stringify(api));
    callback(null, api);
  })
};

function exportConfigAsFunctions(config, proxyUrl) {
	var commands = cfg.getCommands(config);
	var api = {};
	
	for (var i=0;i<commands.length;i++) {
		var cmd = commands[i];
		
		logger.verbose('Exposing proxy for ' + cmd.name);
		api[cmd.name] = exportCommandAsFunction(config, cmd, proxyUrl);
	}
	
	return api;
}

function exportCommandAsFunction(config, commandSpec, proxyUrl) {
	var fn = function(config, fncallback) {
		
		logger.verbose('proxy command ' + commandSpec.name + ' has been called');
    var href = proxyUrl + '/' + commandSpec.name;
    
    if (config && commandSpec.verb == 'GET') {
      //we have to url-encode the parameters and options

      commandSpec.parameters.forEach(function(param) {
        var paramVal = config[param.name];
        if (param.type && param.type == 'multi') {
          for (var i=0;i<paramVal.length;i++) {
            href += '&' + param.name + '=' + encodeURI(paramVal[i]);
          }
        } else {
          href += '&' + param.name + '=' + encodeURI(paramVal);
        }
      })
      
      if (config.options) {
        //append options
        for (var opt in config.options) {
          href += '&' + opt + '=' + encodeURI(config.options[opt]);
        }
      }

      href = href.replace('&', '?');  //replace first ampersand
    }
      
    var reqOptions = {url: href, 
      method: commandSpec.verb,
      json: true,
      encoding: 'utf8',
      headers: {"Accepts":"*/*", "User-Agent":"PerfectAPI" },
      body: config
    };

    if (config.environment) {
      //append environment to headers
      for (var env in config.environment) {
        reqOptions.headers[env] = config.environment[env]
      }
    }

    //console.log(reqOptions)
    request(reqOptions, function(err, res) {
      var result = res.body;
      
      var err = (result && result.err) ? result.err : null;   //ensure err passed back correctly.
      if (err && !util.isError(err)) err = new Error(err);
      fncallback(err, result);
    })
    
	};

	return fn;
}