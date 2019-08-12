'use strict';
const app = require('./server');

var Role = app.models.Role;

Role.findOrCreate(
  {where: {name: 'superadmin'}},
  {name: 'superadmin'},
  (err, roleSuperadmin) => {
    if (err) throw err;
    console.log(`Role ${roleSuperadmin.name} created`);

    Role.findOrCreate(
      {where: {name: 'admin'}},
      {name: 'admin'},
      (err, roleAdmin) => {
        if (err) throw err;
        console.log(`Role ${roleAdmin.name} created`);

        Role.findOrCreate(
          {where: {name: 'jury'}},
          {name: 'jury'},
          (err, roleJury) => {
            if (err) throw err;
            console.log(`Role ${roleJury.name} created`);

            Role.findOrCreate(
              {where: {name: 'member'}},
              {name: 'member'},
              (err, roleMember) => {
                if (err) throw err;
                console.log(`Role ${roleMember.name} created`);
                process.exit(0);
              }
            );
          }
        );
      }
    );
  }
);
