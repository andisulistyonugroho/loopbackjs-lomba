const server = require('../server');
const ds = server.dataSources.mysql;

const tables = [
  'UserProfiles',
  'event',
  'competition',
  'contestantType',
  'mapCompetitionContestantType',
  'contestant',
  'contestantFile',
  'province',
  'city',
  'district'
];

if (ds.connected) {
  tables.forEach((model) => {
    ds.isActual(model, (err, actual) => {
      if (err) throw err;
      if (!actual) {
        ds.autoupdate(model, (err, result) => {
          if (err) throw err;
          console.log(`Loopback tables '${model}' updated in ${ds.adapter.name}`);
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
            console.log(`Loopback tables '${model}' updated in ${ds.adapter.name}`);
          });
        }
      });
    });
  });
}
