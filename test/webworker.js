var perfectapi = require('../api.js');
var testapi = require('./testapi.js');
var util = require('util');

describe('Web Worker', function() {
  
  before(function(done) {
    var config = {options: {port: 3001, webworker: true} };
    testapi.server(config, function(err, result) {
      if (err) console.log(err);
      
      done();
    });
  })
  
  it('should get config ok', function(done) {
    perfectapi.proxy('http://localhost:3001/api/test', function(err, tester) {
      if (err) throw err;
      
      done();
    });  
  })
  
  it('should get an err if the command returns one', function(done) {
    perfectapi.proxy('http://localhost:3001/api/test', function(err, tester) {
      if (err) throw err;
      
      tester.throw({}, function(err, result) {
        
        util.isError(err).should.equal(true);
        done();
      })
    });
  });
  
  it('should get a result if one is given', function(done) {
    perfectapi.proxy('http://localhost:3001/api/test', function(err, tester) {
      if (err) throw err;
      
      tester.simpleget({}, function(err, result) {
        if (err) throw err;

        result.should.equal('This is a simple result');
        done();
      })
    });
  })
  
  it('should correctly correlate message ids over a range of requests', function(done) {
    var successCount = 0;
    var requestCount = 100;
    for(var i=0;i<requestCount;i++) {
      perfectapi.proxy('http://localhost:3001/api/test', function(err, tester) {
        if (err) throw err;
        tester.randomdelay({}, function(err, result) {
          if (err) throw err;

          result.should.equal('This is a simple result');

          successCount += 1;
          if (successCount == requestCount) {
            done();
          }
        })           
      });
    }    
  })
  
  after(function() {
    var config = {command: 'stop' };
    testapi.server(config, function() {
      //should stop the server
    })
  })
  
})