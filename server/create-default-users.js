'use strict';
const app = require('./server');

var User = app.models.Users;
var Role = app.models.Role;
var RoleMapping = app.models.RoleMapping;

User.findOrCreate(
  {where: {email: 'superadmin@sygmainnovation.com'}},
  {
    realm: 'superadmin',
    username: 'superadmin',
    email: 'superadmin@sygmainnovation.com',
    password: 'superadmin123',
    emailVerified: true,
  },
  (err, userSuperadmin) => {
    if (err) throw err;
    console.log(`User ${userSuperadmin.email} found / created`);

    RoleMapping.findOrCreate(
      {where: {principalId: userSuperadmin.id}},
      {
        principalType: RoleMapping.USER,
        principalId: userSuperadmin.id,
        roleId: 1,
      },
      (err, principal) => {
        if (err) throw err;
        console.log(`>> Role superadmin assigned to user ${userSuperadmin.email}`);

      }
    );
  }
);

User.findOrCreate(
  {where: {email: 'admin@sygmainnovation.com'}},
  {
    realm: 'admin',
    username: 'admin',
    email: 'admin@sygmainnovation.com',
    password: 'admin123',
    emailVerified: true,
  },
  (err, userAdmin) => {
    if (err) throw err;
    console.log(`User ${userAdmin.email} found / created`);

    RoleMapping.findOrCreate(
      {where: {principalId: userAdmin.id}},
      {
        principalType: RoleMapping.USER,
        principalId: userAdmin.id,
        roleId: 2,
      },
      (err, principal) => {
        if (err) throw err;
        console.log(`>> Role organizer assigned to user ${userAdmin.email}`);
        process.exit(0);
      }
    );
  }
);
