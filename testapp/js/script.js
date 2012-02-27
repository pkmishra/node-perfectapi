/* Author: Steven Campbell

  Its all jquery and html.  Why?  Because I expect to expose this in different languages, and
	more  languages can do this than any specific template language (jade, haml etc).
*/


function showServerDownMessageIfNothingHappens(elementIdToCheck) {
	setTimeout(function() {
		var check = $('#' + elementIdToCheck).hasClass('hasData');
		if (!check) {
			$("#serviceDown").show();
		}
	}, 4000);
}

$(function(){
	showServerDownMessageIfNothingHappens('command');

	$('#endpoint').val(_papi.endpoint);
	
	_papi.callApi('config', function(err, data) {
		console.log(data);
		if (err)  return;
    
		var hiddenConfig = $('#hiddenConfig');
		hiddenConfig.val(JSON.stringify(data));
		
		$('.apiName').text(data.exports || 'this API');
		var select = $('#command');
		select.addClass('hasData');
		
		var eligibleCommands = [];
		for (var i=0;i<data.signature.length;i++) {
			if (!data.signature[i].preventUseOnServer) eligibleCommands.push(data.signature[i]);
		}
		
		_papi.bindSelectList(select, eligibleCommands, 'name', function(command) {return command.name + ' - ' + command.synopsis});
		if (eligibleCommands.length > 0) {
			refreshForCommand(eligibleCommands[0])
		}
	});
	
	function refreshForCommand(command) {
		showCommand(command)
		showEnvironment(command);
		showParameters(command);
		showOptions(command);
		updateExamples(command);
	}
	
	function updateExamples(command, config) {
		updateRestExample(command, config);
		updateCurlExample(command, config);
		updateJavascriptExample(command, config);
		updateNodeExample(command, config);
    updateCSharpExample(command, config);
		prettyPrint();		//see http://google-code-prettify.googlecode.com/svn/trunk/README.html
	}
	
	function updateRestExample(commandSpec, config) {
		var href = document.location.protocol + '//' + document.location.host + commandSpec.path;
		if (config) {
			for (var i=0;i<commandSpec.parameters.length;i++) {
        var param = commandSpec.parameters[i];
        
				var paramVal = config[param.name];
				if (param.type && param.type == 'multi') {
					for (var i=0;i<paramVal.length;i++) {
						href += '&' + param.name + '=' + encodeURI(paramVal[i]);
					}
				} else {
					href += '/' + param.name + '/' + encodeURI(paramVal);
				}
			}
			
			if (config.environment) {
				//append environment to querystring
				for (var env in config.environment) {
					href += '&' + env + '=' + encodeURI(config.environment[env]);
				}
			}
			
			if (config.options) {
				//append options
				for (var opt in config.options) {
					href += '&' + opt + '=' + encodeURI(config.options[opt]);
				}
			}
		}		
		href = href.replace('&', '?');  //replace first ampersand
		
		var code = $('#restHREF');
		code.attr('href', href);
		code.text(href);
	}
	
	function updateCurlExample(commandSpec, config) {
		//curl -v -H "Content-Type: application/json" -d "{\"scripts\":[\"ubuntu11.10\", \"ubuntu11.10/juju\"]}" -X POST localhost:3000/apis/gen
		var href = document.location.protocol + '//' + document.location.host + commandSpec.path;
		var curl = '$ curl -v -H "Content-Type: application/json"';
		if (config) {
			curl += ' -d "' + JSON.stringify(config).replace(/"/g, '\\"') + '"'
		}
		if (commandSpec.verb && (commandSpec.verb == 'POST')) {
			curl += ' -X POST';
		} else {
			curl += ' -X GET';
		}
		curl += ' ' + href;
		
		var code = $('#curlCommand');
		code.text(curl);
	}
	
  function updateCSharpExample(commandSpec, config) {
    var href = document.location.protocol + '//' + document.location.host;
		var endPoint = href + commandSpec.path.replace('/' + commandSpec.name, '');
    var apiName = getApiName();
    endPoint += '/' + apiName + '.cs';
    
    $('#csharpdownload').text(endPoint);
    $('#csharpdownload').attr('href', endPoint);
    
    var code = 'using PerfectAPI.Client;\n\n';
    code += 'public static void Main(string[] args) {\n';
    code += '  var ' + apiName + ' = new ' + capitalize(apiName) + '();\n\n';
    code += '  var config = new ' + capitalize(apiName) + '.' + capitalize(commandSpec.name) + 'Config();\n';
    if (config) {
			for (var i=0;i<commandSpec.parameters.length;i++) {
        var param = commandSpec.parameters[i];
        
				var paramVal = config[param.name];
        code += '  config.' + capitalize(param.name) + ' = ';
				if (param.type && param.type == 'multi') {
          code += ' new string[] {';
          var sep = "";
					for (var i=0;i<paramVal.length;i++) {
						code += sep + '@"' + paramVal[i] + '"';
            sep = ', ';
					}
          code += '}\n';
				} else {
          code += '@"' + paramVal + '"\n';
				}
			}
			
			if (config.environment) {
				//append environment to querystring
				for (var env in config.environment) {
          code += '  config.Environment.' + capitalize(env) + ' = @"' + config.environment[env] + '";\n';
				}
			}
			
			if (config.options) {
				//append options
				for (var opt in config.options) {
          if (config.options[opt] === true || config.options[opt] === false) {
            code += '  config.Options.' + capitalize(opt) + ' = ' + config.options[opt] + ';\n';
          } else {
            code += '  config.Options.' + capitalize(opt) + ' = @"' + config.options[opt] + '";\n';
          }
				}
			}    
    }  
    code += '\n  var result = ' + apiName + '.' + capitalize(commandSpec.name) + '(config);\n';
    code += '  Console.WriteLine(result.RawResult);\n';
    code += '}';
    
    $('#csharpExampleCode').text(code);
  }
  
  function capitalize(string)
  {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
	function updateJavascriptExample(commandSpec, config) {
		var href = document.location.protocol + '//' + document.location.host;
		var endPoint = href + commandSpec.path.replace('/' + commandSpec.name, '');
		var include = '<script src="' + endPoint + '/jquery.perfectapi.js' + '" />';
		$('#javascriptExampleInclude').text(include);
		
		var code = 'var config = '
		if (config) {
			code += JSON.stringify(config, null, 2) + ';\n';
		} else {
			code += '{};\n';
		}
		
		code += getApiName() + '.callApi("' + commandSpec.name + '", config, function(err, results) {\n';
		code += '  if (err)  return;\n\n';
		code += '  //`results` is an object with the results of the call\n';
		code += '  ...\n';
		code += '});';

		
		$('#javascriptExampleCode').text(code);
	}
	
	function updateNodeExample(commandSpec, config) {
		var href = document.location.protocol + '//' + document.location.host;
		var endPoint = href + commandSpec.path.replace('/' + commandSpec.name, '');
		var code = "var perfectapi = require('perfectapi');\n";
		code += "perfectapi.proxy('" + endPoint + "', function(err, api) {\n";
		if (config) {
			code += '  var config = ' + JSON.stringify(config) + ';\n\n';
		} else {
			code += '  var config {};\n\n';
		}
		code += '  api.' + commandSpec.name + '(config, function(err, result) {\n';
		code += '    if (err) {\n';
		code += "      console.log('something went wrong: ' + err);\n";
		code += '    } else {\n';
		code += "      console.log('output = ' + JSON.stringify(result));\n";
		code += '    }\n';
		code += '  });\n';
		code += '});\n';
		
		$('#nodeExampleCode').text(code);
	}
	
	function showCommand(command) {
		var descSpan = $('#commandDescription');
		
		descSpan.text(command.description || command.synopsis || '');
	}
	
	function showEnvironment(command) {
		if (!command.environment) return;
				
		var envDiv = $('#environmentDiv');
		envDiv.hide();		//it was just for locating the right spot
		
		for (var i=0;i<command.environment.length;i++) {
			var env = command.environment[i];
			var lbl = '<label for="' + env.parameter + '">' + env.parameter.replace(/_/g, ' ') + '</label>';
			var div = '<div class="input">';
      var editable = (env.hasValue && !env.allowOverride) ? ' uneditable-input' : '';
      var editableMessage = (env.hasValue) ? 'Value set on server' : '';
			div += '<input type="text" class="large' + editable + '" name="' + env.parameter + '" id="' + env.parameter + '" placeholder="' + editableMessage + '"></input>'
			if (env.description) div += '<span class="help-inline">' + env.description + '</span>';
			div += '</div>';
			
			var clearFix = '<div class="clearfix dynamicCommandAdded">' + lbl + div + '</div>';
			envDiv.after(clearFix);
		}		
	}
	
	function showParameters(commandSpec) {
		var paramDiv = $('#parameterDiv');
		if (!commandSpec.parameters || commandSpec.parameters.length == 0) {
			paramDiv.hide();
			return;
		}
		
		paramDiv.show();
    for(var i=0;i<commandSpec.parameters.length;i++) {
      var param = commandSpec.parameters[i];
      
      showParameter(param, paramDiv);
    }
	}
  
  function showParameter(param, paramDiv) {
		var lbl = '<label for="' + param.name + '">' + param.name + '</label>';
		var div = '<div class="input">';
		div += '<input type="text" class="medium" name="' + param.name + '" id="' + param.name + '"></input>';
		var desc = param.description || '';
		var required = param.required && (param.required == true) ;
		div += '<span class="help-inline">' + (required ? '(required) - ' : '') + desc + '</span>';
		div += '</div>';
		
		var clearFix = '<div class="clearfix dynamicCommandAdded">' + lbl + div + '</div>';
		paramDiv.before(clearFix);  
  }
	
	function showOptions(commandSpec) {
		var optionsDiv = $('#optionsDiv');
		optionsDiv.hide();  //just used to locate an area
		var flagsDiv = $('#flagsDiv'); 
		flagsDiv.hide();    //default to hidden, may show later
		
		if (!commandSpec.options) return;
		
		for (var i=0;i<commandSpec.options.length;i++) {
			var opt = commandSpec.options[i];
			if (opt.option) 
				showOption(opt, optionsDiv)
			else 
				showFlag(opt, flagsDiv);
		}
	}
	
	function showOption(opt, optDiv){
		var lbl = '<label for="' + opt.option + '">' + opt.option + '</label>';
		var div = '<div class="input">';
		div += '<input type="text" class="medium" name="' + opt.option + '" id="' + opt.option + '"></input>';
		var desc = opt.description || '';
		var defaultVal = opt['default'];
		var required = opt.required && (opt.required == true) && !defaultVal;
		if (desc) div += '<span class="help-inline">' + (required ? '(required) - ' : '') + desc + (defaultVal ? ' (default=' + defaultVal + ')': '') + '</span>';
		div += '</div>';
		
		var clearFix = '<div class="clearfix dynamicCommandAdded">' + lbl + div + '</div>';
		optDiv.before(clearFix);
	}

	function showFlag(flag, flagsDiv) {
		flagsDiv.show();		//since there is at least one flag
		var flagsList = $('#flagsList');
		
		var liLabel = '<li class="dynamicCommandAdded"><label>';
		var checkit = (flag['default'] == 'true');
		liLabel += '<input type="checkbox" ' + (checkit ? 'checked="checked" ' : '') + 'name="' + flag.flag + '" id="' + flag.flag + '">';
		liLabel += '<span>' + flag.flag + ' - ' + flag.description + '</span>';
		liLabel += '</label></li>';
		
		flagsList.append(liLabel);
	}
	
	function getApiName() {
		var hiddenConfig = $('#hiddenConfig');
		var configString = hiddenConfig.val();
		if (configString) {
			var config = JSON.parse(configString);

			return config.exports;
		} else
			return "apiName";
	}
	
	function getCommandConfig(commandName) {
		var hiddenConfig = $('#hiddenConfig');
		var config = JSON.parse(hiddenConfig.val());
		console.log(config);
		
		var command;
		var commandName = $('#command').val();
		for (var i=0;i<config.signature.length;i++) {
			if (config.signature[i].name == commandName) command = config.signature[i];
		}
		
		if (!command) {
			console.log('Failed to find command ' + commandName);
			return;
		}
		
		return command;
	}
	
	$('#command').change(function() {
		$('#imageSuccess').hide();
		$('#result').text('');
		$('#config').text('');
		
		var commandName = $('#command').val();
		var command = getCommandConfig(commandName);
	
		$('.dynamicCommandAdded').remove();		//remove previously added dynamic html

		refreshForCommand(command)
	})
	
	$('#language').change(function() {
		$('.language-example').hide();
		
		switch ($('#language').val()) {
			case 'rest': $('#exampleRest').show();
				break;
			case 'curl': $('#exampleCurl').show();
				break;
			case 'javascript': $('#exampleJavascript').show();
				break;
			case 'node': $('#exampleNode').show();
				break;
      case 'csharp': $('#exampleCSharp').show();
        break;
		}
	})
	
	$('#btnCall').click(function() {
		$('#imageSuccess').hide();
		$('#result').text('');
		$('#config').text('');
		
		var commandName = $('#command').val();
		var cmdConfig = getCommandConfig(commandName);
		
		var config = {};
    for (var i=0;i<cmdConfig.parameters.length;i++) {
      var param = cmdConfig.parameters[i];
      var val =  $('#' + param.name).val();
      if (param.type === 'multi') {
        val = (val === '' ? [] : val.split(','));
        config[param.name] = val;
      } else
        config[param.name] = val;
    }
		
		if (cmdConfig.options) {
			config.options = {};
			var foundConfig = false;
			for(var i=0;i<cmdConfig.options.length;i++) {
				var opt = cmdConfig.options[i];
				
				if (opt.option) {
					var name = opt.option;
					
					var optVal = $('#' + name).val();
					if (optVal != '') {
						config.options[name] = optVal;
						foundConfig = true;
					}			
				} else {
					var name = opt.flag;
					var checkedBox = $('#' + name).is(':checked');
					if (checkedBox) {
						config.options[name] = true;
						foundConfig = true;
					}
				}
			}
			
			if (!foundConfig) delete config.options;
		}
		
		if (cmdConfig.environment) {
			config.environment = {};
			var foundEnvironment = false;
			for (var i=0;i<cmdConfig.environment.length;i++) {
				var env = cmdConfig.environment[i];
				
				var val = $('#' + env.parameter).val();
				if (val != '') {
					foundEnvironment = true;
					config.environment[env.parameter] = val;
				}
			}
			
			if (!foundEnvironment) delete config.environment;
		}
		
		//update examples and debug config
		$('#config').text(JSON.stringify(config, null, 4));
		updateExamples(getCommandConfig(commandName), config);
		
		//run the command
		$('.pleaseWait').show();
		_papi.callApi(commandName, config, function(err, result) {
			$('.pleaseWait').hide();
			if (err) return;
			
			$('#result').text(JSON.stringify(result, null, 4));
			$('#imageSuccess').show();
		});
		
		return false;
	});
	
});

