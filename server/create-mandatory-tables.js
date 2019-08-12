const server = require('./server');
const ds = server.dataSources.mysql;

const tables = [
  'Users',
  'AccessToken',
  'ACL',
  'RoleMapping',
  'Role'
];

if (ds.connected) {
  console.log('A')
  tables.forEach((model) => {
    ds.isActual(model, (err, actual) => {
      if (err) throw err;
      if (!actual) {
        ds.autoupdate(model, (err, result) => {
          if (err) throw err;
          console.log(`Loopback tables '${model}' created in ${ds.adapter.name}`);
        });
      }
    });
  });
} else {
  ds.once('connected', function() {
    tables.forEach((model) => {
      ds.isActual(model, (err, actual) => {
        if (err) throw err;
        if (!actual) {
          ds.autoupdate(model, (err, result) => {
            if (err) throw err;
            console.log(`Loopback tables '${model}' created in ${ds.adapter.name}`);
          });
        }
      });
    });
  });
}
