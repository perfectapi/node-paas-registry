var registry = require('../bin/registry.js');
var redis = require('redis');

describe('Service Registry', function() {
  var REDIS_HOST = 'redis.perfectapi.com';    //set to your own server
  var REDIS_DB_INDEX = '0';     
  
  describe('registerInstance', function() {
    it('lets start with a clean db', function(done) {
      flushDb(REDIS_HOST, REDIS_DB_INDEX, function() {
        done();
      });
    })
    it('should work without error', function(done) {
      var config = {name: "test 1", options: {path: "/api/v1", file: "asdasdasdasdbase64"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} }
      registry.registerInstance(config, function(err, result) {
        if (err) throw err;
        
        done();
      })      
    })
  })
  
  describe('getServiceInfo', function() {
    it('should show the instance we just registered', function(done) {
      var config = {name: "test 1", environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX}};
      registry.getServiceInfo(config, function(err, result) {
        if (err) throw err;
        
        result.should.be.an.instanceof(Array);
        result.length.should.equal(1);
        
        var instance = result[0];
        instance.name.should.equal('test 1');
        instance.path.should.equal('/api/v1');
        instance.should.have.property('zipFile', 'asdasdasdasdbase64');
        
        done();
      })
    });    
    it('should return multiple instances if multiple are registered', function(done) {
      var config = {name: "test 1", options: {path: "/api/v1", file: "asdasdasdasdbase64"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} };
      registry.registerInstance(config, function(err, result) {
        if (err) throw err;
        
        config = {name: "test 1", environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX}};
        registry.getServiceInfo(config, function(err, result) {
          if (err) throw err;
          
          result.length.should.equal(2);
          
          done();
        })
      });
    })
  })
  
  describe('unregisterInstance', function() {
    it('should decrement the service instance count by 1', function(done) {
      var config = {name: "test 1", options: {path: "/api/v1", file: "asdasdasdasdbase64"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} };
      registry.unregisterInstance(config, function(err, result) {
        if (err) throw err;
        
        config = {name: "test 1", environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX}};
        registry.getServiceInfo(config, function(err, result) {
          if (err) throw err;
          
          result.length.should.equal(1);
          
          done();
        })
      })
    })
    it('should do nothing when there are no matches', function(done) {
      var config = {name: "test 1", options: {path: "/api/v1", file: "asdasdasdasdbase64"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} };
      registry.unregisterInstance(config, function(err, result) {
        if (err) throw err;
        //none left now.
        
        registry.unregisterInstance(config, function(err, result) {
          if (err) throw err;
          
          //still none left, but no error
          done();
        });
      });
    })
  })
  
  describe('listServices', function() {
    it('should be empty to start', function(done) {
      var config = {environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} };
      registry.listServices(config, function(err, result) {
        result.length.should.equal(0);
        
        done();
      })
    })
    it('should show 1 name when 1 instance', function(done) {
      var config = {name: "test 1", options: {path: "/api/v1", file: "asdasdasdasdbase64"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} }
      registry.registerInstance(config, function(err, result) {
        if (err) throw err;
        
        registry.listServices(config, function(err, result) {
          result.length.should.equal(1);
          result[0].should.equal('test 1');
          
          done();
        })
      })      
    })
    it('should show 1 name when 2 instances of same service', function(done) {
      var config = {name: "test 1", options: {path: "/api/v1", file: "asdasdasdasdbase64"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} }
      registry.registerInstance(config, function(err, result) {
        if (err) throw err;
        
        registry.listServices(config, function(err, result) {
          result.length.should.equal(1);
          result[0].should.equal('test 1');
          
          done();
        })
      })      
    })
    it('should show 2 names when a new service instance has a new name', function(done) {
      var config = {name: "test 2", options: {path: "/api/v1", file: "asdasdasdasdbase64"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} }
      registry.registerInstance(config, function(err, result) {
        if (err) throw err;
        
        registry.listServices(config, function(err, result) {
          result.length.should.equal(2);
          
          done();
        })
      })       
    })
  })
  
  describe('listUnclaimedInstances', function() {
    it('should show all 3 currently unclaimed instances', function() {
      var config = {environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} };
      registry.listUnclaimedInstances(config, function(err, result) {
      
        result.should.have.property('length', 3);
        result[0].should.have.property('name');
      })
    })
    it('should decrease count after 1 is claimed', function() {
      var config = {name: "test 1", options: {path: "/api/v1", host: "sam", port: "4002"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} }
      registry.claimInstance(config, function(err, result) {
        if (err) throw err;
        
        config = {environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} };
        registry.listUnclaimedInstances(config, function(err, result) {
        
          result.should.have.property('length', 2);
        })
      })
    })
    it('should give an error if there is nothing available to claim', function(done) {
      var config = {name: "test non-existent", options: {path: "/api/v1", host: "sam", port: "4003"}, environment: {REDIS_HOST:REDIS_HOST, REDIS_DB_INDEX:REDIS_DB_INDEX} }
      registry.claimInstance(config, function(err, result) {
        err.should.be.an.instanceof(Error);
        done();
      })
    })
  })
  
})

function flushDb(host, db_index, callback) {
  var db = redis.createClient(6379, host);
  db.select(db_index, function() {
    db.flushdb();  
    db.quit(callback);
    //console.log('flushed db')
  });
}

