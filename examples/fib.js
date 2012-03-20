#!/usr/bin/env node

var perfectapi = require('../api.js');  
var path = require('path');

var configPath = path.resolve(__dirname, 'fib.json');
var parser = new perfectapi.Parser();

var worker = require('child_process').fork(__dirname + '/fibworker.js');
var callbacks = {};
var requestNum = 0;
worker.on('message', function(m) {
  var callback = callbacks[m.id];
  delete callbacks[m.id];
  
  callback(null, m.result);
})

var numWorkers = require('os').cpus().length;
var nextWorker = 0;
var workers = [];
for (var i=0;i<numWorkers;i++) {
  var worker = require('child_process').fork(__dirname + '/fibworker.js');
  workers.push(worker);
  
  worker.on('message', function(m) {
    var callback = callbacks[m.id];
    delete callbacks[m.id];
    
    callback(null, m.result);
  })
}
  
//handle the commands
parser.on('fib', function(config, callback) {
  var n = config.number;
  if (n<1 || n>40) {
    callback('n must be between 1 and 40');
  } else {
    callback(null, fibonacci(n))
  }
})

parser.on('randomfib', function(config, callback) {
  var n = Math.ceil(Math.random()*30)
  callback(null, fibonacci(n));
})

parser.on('randomfib2', function(config, callback) {
  requestNum += 1;
  callbacks[requestNum] = callback;  
  
  var n = Math.ceil(Math.random()*30)
  worker.send({n: n, id: requestNum});
})

parser.on('randomfib3', function(config, callback) {
  requestNum += 1;
  callbacks[requestNum] = callback;  
  
  var n = Math.ceil(Math.random()*30);
  
  //round robin workers
  var worker = workers[nextWorker];
  nextWorker += 1;
  if (nextWorker == workers.length) nextWorker = 0;
  
  worker.send({n: n, id: requestNum});
})

//expose the api
module.exports = parser.parse(configPath);

function fibonacci(n) {
  if (n < 2)
    return 1;
  else
    return fibonacci(n-2) + fibonacci(n-1);
}

