var testapi = require('./testapi.js');
var util = require('util');
var request = require('request');

var config_etag = '';

describe('Basic caching', function() {
  var webworker = false;
  
  before(function() {
    var config = {options: {port: 3001, webworker: webworker} };
    testapi.server(config);
  })

  
  it('should set cache headers for the config', function(done) {
    request('http://localhost:3001/api/test/config', function (error, res, body) {
      res.statusCode.should.equal(200);
      res.headers.should.have.property('cache-control', 'must-revalidate, max-age=172800');
      res.headers.should.have.property('etag');
      
      config_etag = res.headers.etag;
      done();
    })
  })
  
  it('should send 304 result if requested again', function(done) {
    request({url: 'http://localhost:3001/api/test/config', headers: {'If-None-Match': config_etag} }, function (error, res, body) {
      
      
      res.statusCode.should.equal(304);
      
      done();
    })
  })
  
  
  after(function() {
    var config = {command: 'stop', options: {webworker:webworker} };
    testapi.server(config, function() {
      //should stop the server
    })  
  })
  
})