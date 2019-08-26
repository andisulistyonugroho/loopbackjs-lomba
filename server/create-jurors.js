'use strict';
const app = require('./server');

var User = app.models.Users;
var RoleMapping = app.models.RoleMapping;
var JuryPanel = app.models.juryPanel;

const jurors = [
  {
    email: 'jury@sygmainnovation.com',
    username: 'jury1',
    password: 'jurysuper123',
    competitionId: [1,2,3]
  },
  {
    email: 'jury2@sygmainnovation.com',
    username: 'jury2',
    password: 'jurysuper122',
    competitionId: [1,2,3]
  },
  {
    email: 'jury3@sygmainnovation.com',
    username: 'jury3',
    password: 'jurysuper133',
    competitionId: [1,2,3]
  }
]

creatingJuror(0)

function creatingJuror (index) {
  if (index < jurors.length) {
    console.log(jurors[index])
    const theJury = jurors[index]
    User.findOrCreate(
      {where: {email: theJury.email}},
      {
        realm: 'jury',
        username: theJury.username,
        email: theJury.email,
        password: theJury.password,
        emailVerified: true,
      },
      (err, jury) => {
        if (err) throw err;
        console.log(`User ${jury.email} found / created`);

        RoleMapping.findOrCreate(
          { where: { principalId: jury.id } },
          {
            principalType: RoleMapping.USER,
            principalId: jury.id,
            roleId: 3,
          },
          (err, principal) => {
            if (err) throw err;
            console.log(`>> Role jury assigned to user ${jury.email}`);
            creatingJuryPanel(jury.id, index, 0)
          }
        );
      }
    )
  } else {
    process.exit()
  }

  function creatingJuryPanel (juryId, index, competitionIndex) {
    if (competitionIndex < jurors[index].competitionId.length) {
      const theCompetitionId = jurors[index].competitionId[competitionIndex]
      JuryPanel.findOrCreate(
        { where: { userId: juryId, competitionId: theCompetitionId } },
        {
          userId: juryId,
          competitionId: theCompetitionId
        },
        (err, result) => {
          if (err) throw err;
          competitionIndex++
          creatingJuryPanel(juryId, index, competitionIndex)
        }
      )
    } else {
      index++
      creatingJuror(index)
    }
  }

}
