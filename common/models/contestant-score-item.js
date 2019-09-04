'use strict';
const app = require('../../server/server')

module.exports = function(Contestantscoreitem) {

  // deactivate all scoring before creating new one
  Contestantscoreitem.beforeRemote('create', function(context, result, next) {
    Contestantscoreitem.updateAll({
      contestantId: context.req.body.contestantId,
      juryPanelId: context.req.body.juryPanelId,
      competitionScoreCriteriaId: context.req.body.competitionScoreCriteriaId
    }, {
      isActive: 0,
      deactivatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    }, (err, result) => {
      if (err) {
        console.log('ERR BEFORE CREATE SCORE: ', err)
        next()
      } else {
        next()
      }
    })
  });

  // Save total score to contestant score table
  Contestantscoreitem.afterRemote('create', function(context, result , next) {
    const ContestantScoreModel = app.models.contestantScore
    ContestantScoreModel.upsertWithWhere({
      contestantId: context.req.body.contestantId,
      juryPanelId: context.req.body.juryPanelId
    }, {
      contestantId: context.req.body.contestantId,
      juryPanelId: context.req.body.juryPanelId,
      totalScore: context.req.body.totalScore,
      isFinal: true
    }, (err, result) => {
      if (err) {
        console.log('ERR AFTER CREATE SCORE: ', err)
        next()
      } else {
        next()
      }
    })
  })

};
