'use strict';

module.exports = function(Space) {
  Space.beforeRemote('upload', function(ctx, resource, next) {
    Space.dataSource.connector.getFilename = function(file, req, res){
      const origFilename = file.name
      const parts = origFilename.split('.')
      const extension = parts[parts.length-1]
      const newFilename = (new Date()).getTime()+'_'+parts[parts.length-2]+'.'+extension
      const spaceLocation = 'pmtools/'
      return spaceLocation + newFilename
    }
    next()
  })
};
