var winston = require('winston');

if (typeof process.env['NODE_ENV'] == 'undefined' 
  || process.env['NODE_ENV'] == '' 
  || process.env['NODE_ENV'] == 'development') {
  winston.loggers.add('perfectapi', {
    console: {
      level: 'info',
      colorize: 'true'
    }
  });
} else {
  winston.loggers.add('perfectapi', {
    console: {
      level: 'warn',
      colorize: 'true'
    }
  });
}

var logger = winston.loggers.get('perfectapi');

var server = require('./server.js');
var messageId = 0;
var messageStack = {};  

process.on('message', function(m) {
  //this occurs when the web server is running as a child process.
  
  if (m.message == 'start') {
    logger.verbose('received start message')

    //start the web server
    var callbackCligen = function(err, commandName, config, resultFunction) {
      //max Number in javascript is 9,007,199,254,740,992.  At 10,000 requests per second, that is 28,561 years until we get an overflow
      messageId += 1;
      messageStack[messageId] = resultFunction;
      
      //tell the parent process to run the command
      process.send({id: messageId, err: err, commandName: commandName, config: config});
    }
    
    server.listen(m.rawConfig, m.serverConfig, callbackCligen) 
  } else if (m.message == 'stop') {
    //stop the web server
    logger.verbose('received stop message')
    server.stop();
    
  } else if (m.message == 'result') {
    //the parent process is sending us back the results from the command
    var resultFunction = messageStack[m.id];
    delete messageStack[m.id];
    
    resultFunction(m.err, m.result);
  }
})