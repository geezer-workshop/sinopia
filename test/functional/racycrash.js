var assert = require('assert')

module.exports = function() {
  var server = process.server
  var express = process.express

  describe('Racy', function() {
    var on_tarball

    before(function() {
      express.get('/testexp-racycrash', function(_, res) {
        res.send({
          "name": "testexp-racycrash",
          "versions": {
            "0.1.0": {
              "name": "testexp_tags",
              "version": "0.1.0",
              "dist": {
                "shasum": "fake",
                "tarball": "http://localhost:55550/testexp-racycrash/-/test.tar.gz"
              }
            }
          }
        })
      })

      express.get('/testexp-racycrash/-/test.tar.gz', function(_, res) {
        on_tarball(res)
      })
    })

    it('should not crash on error if client disconnects', function(_cb) {
      on_tarball = function(res) {
        res.header('content-length', 1e6)
        res.write('test test test\n')
        setTimeout(function() {
          res.write('test test test\n')
          res.socket.destroy()
          cb()
        }, 200)
      }

      server.request({uri:'/testexp-racycrash/-/test.tar.gz'}, function(err, res, body) {
        assert.equal(err, null)
        assert.equal(body, 'test test test\n')
      })

      function cb() {
        // test for NOT crashing
        server.request({uri:'/testexp-racycrash'}, function(err, res, body) {
          assert.equal(err, null)
          assert.equal(res.statusCode, 200)
          _cb()
        })
      }
    })

    it('should not store tarball', function(cb) {
      on_tarball = function(res) {
        res.socket.destroy()
      }

      server.request({uri:'/testexp-racycrash/-/test.tar.gz'}, function(err, res, body) {
        assert.equal(err, null)
        assert.equal(body.error, 'internal server error')
        cb()
      })
    })
  })
}

