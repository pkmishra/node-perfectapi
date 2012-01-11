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
	prettyPrint();		//see http://google-code-prettify.googlecode.com/svn/trunk/README.html
	
	showServerDownMessageIfNothingHappens('command');

	$('#endpoint').val(_papi.endpoint);
	
	_papi.callApi('config', function(err, data) {
		console.log(data);
		if (err)  return;
		
		$('.apiName').text(data.exports || 'this API');
		var select = $('#command');
		select.addClass('hasData');
		
		var eligibleCommands = [];
		for (var i=0;i<data.signature.length;i++) {
			if (data.signature[i].name !== 'server') eligibleCommands.push(data.signature[i]);
		}
		
		_papi.bindSelectList(select, eligibleCommands, 'name', function(command) {return command.name + ' - ' + command.synopsis});
		if (eligibleCommands.length > 0) {
			showEnvironment(eligibleCommands[0]);
			showParameter(eligibleCommands[0]);
			showOptions(eligibleCommands[0]);
		}
		
		var hiddenConfig = $('#hiddenConfig');
		hiddenConfig.val(JSON.stringify(data));
	});
	
	function showEnvironment(command) {
		if (!command.environment) return;
				
		var envDiv = $('#environmentDiv');
		envDiv.hide();		//it was just for locating the right spot
		
		for (var i=0;i<command.environment.length;i++) {
			var env = command.environment[i];
			var lbl = '<label for="' + env.parameter + '">' + env.parameter.replace(/_/g, ' ') + '</label>';
			var div = '<div class="input">';
			div += '<input type="text" class="large" name="' + env.parameter + '" id="' + env.parameter + '"></input>'
			if (env.description) div += '<span class="help-inline">' + env.description + '</span>';
			div += '</div>';
			
			var clearFix = '<div class="clearfix dynamicCommandAdded">' + lbl + div + '</div>';
			envDiv.after(clearFix);
		}		
	}
	
	function showParameter(command) {
		var paramDiv = $('#parameterDiv');
		if (!command.parameter) {
			paramDiv.hide();
			return;
		}
		
		paramDiv.show();
		var param = command.parameter;
		$('#parameterLabel').text(param.name);
		var desc = param.description || '';
		if (param.required && (param.required == true)) desc = '(required) ' + desc;
		if (param.type && (param.type == 'multi')) desc = desc + ' - supports multiple values (separate with commas)';
		$('#parameterHelp').text(desc);
	}
	
	function showOptions(command) {
		var optionsDiv = $('#optionsDiv');
		optionsDiv.hide();  //just used to locate an area
		var flagsDiv = $('#flagsDiv'); 
		flagsDiv.hide();    //default to hidden, may show later
		
		if (!command.options) return;
		
		for (var i=0;i<command.options.length;i++) {
			var opt = command.options[i];
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
		optDiv.after(clearFix);
	}

	function showFlag(flag, flagsDiv) {
		flagsDiv.show();		//since there is at least one flag
		var flagsList = $('#flagsList');
		
		var liLabel = '<li class="dynamicCommandAdded"><label>';
		var checkit = (flag['default'] == 'true');
		liLabel += '<input type="checkbox" ' + (checkit ? 'checked="checked" ' : '') + 'name="' + flag.flag + '" id="' + flag.flag + '">';
		liLabel += '<span>' + flag.description + '</span>';
		liLabel += '</label></li>';
		
		flagsList.append(liLabel);
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

		showEnvironment(command);
		showParameter(command);
		showOptions(command);
	})
	
	$('#btnCall').click(function() {
		$('#imageSuccess').hide();
		$('#result').text('');
		$('#config').text('');
		
		var commandName = $('#command').val();
		var cmdConfig = getCommandConfig(commandName);
		
		var config = {};
		if (cmdConfig.parameter) {
			var val =  $('#parameter').val();
			if (cmdConfig.parameter.type === 'multi') {
				val = (val === '' ? [] : val.split(','));
				config[cmdConfig.parameter.name] = val;
			} else
				config[cmdConfig.parameter.name] = val;
		}
		
		config.options = {};
		if (cmdConfig.options) {
			for(var i=0;i<cmdConfig.options.length;i++) {
				var opt = cmdConfig.options[i];
				
				if (opt.option) {
					var name = opt.option;
					
					var optVal = $('#' + name).val();
					if (optVal != '') {
						config.options[name] = optVal;
					}			
				} else {
					var name = opt.flag;
					var checkedBox = $('#' + name).is(':checked');
					if (checkedBox)
						config.options[name] = true;
				}
			}
		}
		
		config.environment = {};
		if (cmdConfig.environment) {
			for (var i=0;i<cmdConfig.environment.length;i++) {
				var env = cmdConfig.environment[i];
				
				var val = $('#' + env.parameter).val();
				if (val != '')
					config.environment[env.parameter] = val;
			}
		}
		
		
		$('#config').text(JSON.stringify(config, null, 4));
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

