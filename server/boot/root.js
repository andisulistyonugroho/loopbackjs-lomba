'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  server.use(router);

  // allow only upload this files
  server.dataSources.spaces.connector.allowedContentTypes = ["image/jpg", "image/jpeg", "image/png", "image/gif"];
};
