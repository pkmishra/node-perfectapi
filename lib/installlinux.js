var path=require('path');
var fs = require('fs');
var logger = require('winston').loggers.get('perfectapi');
var exec = require('child_process').exec;

exports.install = function(config) {

	/* substitutions that should occur before running:
	 *
	 *  node_modules/amigen/ - root path of module, where files are currently
	 *  /lib/amigen/bin/amigen.js - final path of bin file
	 *  amigen - name of service
	*/

	var runningModule = getRunningModule();		//this is what we want the service to execute (after we copy it)
	var runningPath = path.dirname(runningModule);
	var rootPath = getPathToPackageJson(runningPath);
	if (rootPath == '') return console.log('Failed to find package path, started looking in ' + runningPath);
	var relativeBin = runningPath.replace(rootPath, '');
	var binName = runningModule.replace(runningPath, '');
	
	console.log(runningPath);
	console.log(rootPath);
	console.log(relativeBin);
	console.log(binName);
	
	//read template and replace stuff
	var installScript = path.resolve(__dirname, 'installer', 'install_template.sh');
	var installScriptContent = fs.readFileSync(installScript, 'utf8');
	installScriptContent = installScriptContent
		.replace(/node_modules\/amigen\//g, rootPath + '/')
		.replace(/\/lib\/amigen\/bin\/amigen.js/g, '/lib/' + config.name + relativeBin + binName)
		.replace(/amigen/g, config.name);
	
	
	var newInstallScript = path.resolve(__dirname, 'installer', 'install.sh');
	fs.writeFileSync(newInstallScript, installScriptContent, 'utf8');
	fs.chmodSync(newInstallScript, '755');
	
	//do the install 
	var installer = exec('sudo ' + newInstallScript, function (err, stdout, stderr) {	
		if (err) {
			console.log('exec error: ' + err);
			return;
		}
		
		if (stderr) {
			console.log('error running bash script: ' + stderr);
			return;
		}
		
		console.log('Successfully installed ' + config.name);
		console.log('Use start, stop, restart commands to control, e.g. restart ' + config.name);
	});
	
};

exports.uninstall = function(config) {
	//read template and replace stuff
	var uninstallScript = path.resolve(__dirname, 'installer', 'uninstall_template.sh');
	var uninstallScriptContent = fs.readFileSync(uninstallScript, 'utf8');
	uninstallScriptContent = uninstallScriptContent
		.replace(/amigen/g, config.name);
		
	var newunInstallScript = path.resolve(__dirname, 'installer', 'uninstall.sh');
	fs.writeFileSync(newunInstallScript, uninstallScriptContent, 'utf8');
	fs.chmodSync(newunInstallScript, '755');
	
	//do the uninstall
	var uninstaller = exec('sudo ' + newunInstallScript, function (err, stdout, stderr) {	
		if (err) {
			console.log('exec error: ' + err);
			return;
		}
		
		if (stderr) {
			console.log('error running bash script: ' + stderr);
			return;
		}
		
		console.log('Successfully uninstalled ' + config.name);
	});
};

function getRunningModule() {
	var currentModule = module;
	while (currentModule.parent)
		currentModule = currentModule.parent;
		
	return currentModule.filename;
}

function getPathToPackageJson(runningPath) {
	var currentPath = runningPath;
	while (!path.existsSync(path.resolve(currentPath, 'package.json'))) {
		var newPath = path.resolve(currentPath, '..');
		if (newPath == currentPath) {
			return '';   //something balked
		} else {
			currentPath = newPath;  //continue looking
		}
	}
	
	return currentPath;
}