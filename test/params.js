var testapi = require('./testapi.js');
var util = require('util');
var request = require('request');


describe('Passing of parameters', function() {
  
  before(function() {
    var config = {options: {port: 3001} };
    testapi.server(config);
  })

  
  it('should accept parameters in REST style', function(done) {
    request('http://localhost:3001/api/test/multipleParams/param1/param1value/param2/param2value', function (error, res, body) {
      res.statusCode.should.equal(200);
      
      var result = JSON.parse(res.body);
      result.should.have.property('param1', 'param1value');
      result.should.have.property('param2', 'param2value');
      
      done();
    })
  })
  
  it('should accept parameters in the querystring', function(done) {
    request('http://localhost:3001/api/test/multipleParams?param1=param1value&param2=param2value', function (error, res, body) {
      res.statusCode.should.equal(200);
      
      var result = JSON.parse(res.body);
      result.should.have.property('param1', 'param1value');
      result.should.have.property('param2', 'param2value');
      
      done();
    })
  })
  
  it('should accept parameters in the querystring as a single config', function(done) {
    var config = {param1: "param1value", param2: "param2value"};
    var configInUrl = encodeURI(JSON.stringify(config));
    request('http://localhost:3001/api/test/multipleParams?config=' + configInUrl, function (error, res, body) {
      res.statusCode.should.equal(200);
      
      var result = JSON.parse(res.body);
      result.should.have.property('param1', 'param1value');
      result.should.have.property('param2', 'param2value');
      
      done();
    })
  })
  
  it('should accept config in the body of a POST x-www-form-urlencoded', function(done) {
    var config = {param1: "param1value", param2: "param2value"};
    request({method: 'POST', url: 'http://localhost:3001/api/test/multipleParamsPosted', form: config}, function (error, res, body) {
      res.statusCode.should.equal(200);
      
      var result = JSON.parse(res.body);
      result.should.have.property('param1', 'param1value');
      result.should.have.property('param2', 'param2value');
      
      done();
    })
  })
  
  it('should accept config in the body of a POST as single config param', function(done) {
    var config = {param1: "param1value", param2: "param2value"};
    request({method: 'POST', url: 'http://localhost:3001/api/test/multipleParamsPosted', json: config}, function (error, res, body) {
      res.statusCode.should.equal(200);
      
      var result = res.body;
      result.should.have.property('param1', 'param1value');
      result.should.have.property('param2', 'param2value');
      
      done();
    })
  })
  
  after(function() {
    var config = {command: 'stop' };
    testapi.server(config, function() {
      //should stop the server
    })  
  })
  
})