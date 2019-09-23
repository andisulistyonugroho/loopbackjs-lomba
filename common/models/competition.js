'use strict';

module.exports = function(Competition) {

  // Run native sql to get unscored contestant
  Competition.remoteMethod('unScoredUser', {
    accepts: [
      {
        arg: 'competitionId',
        type: 'number',
        description: 'competition ID',
        required: true,
      },
      {
        arg: 'jurorId',
        type: 'number',
        description: 'juror ID',
        required: true
      },
      {
        arg: 'limit',
        type: 'number',
        description: 'limit',
        required: true
      },
      {
        arg: 'skip',
        type: 'number',
        description: 'skip',
        required: true
      }
    ],
    returns: {arg: 'data', type: 'object'},
    description: 'API to get unscored contestant'
  })

  Competition.unScoredUser = function (competitionId, jurorId, limit, skip, cb) {
    const juryPanelModel = Competition.app.models.juryPanel
    juryPanelModel.findOne({
      fields: { id: true },
      where: { competitionId: competitionId, userId: jurorId }
    }, (err, result) => {
      if (err) return cb(err, null)

      if (result) {
        const juryPanelId = result.id
        const mySQL = Competition.app.datasources.mysql.connector
        const sql = `SELECT a.* FROM contestant a WHERE a.isSubmitted = 1
          AND a.isVerified = 1
          AND a.competitionId = ${competitionId}
          AND NOT EXISTS (SELECT 1 FROM contestantScore b WHERE
          b.contestantId = a.id AND b.juryPanelId = ${juryPanelId})
          ORDER BY a.submittedAt
          LIMIT ${limit} OFFSET ${skip}`

        mySQL.execute(sql, null, (err, data) => {
          if (err) return cb(err, null)

          return cb(null, data)
        })
      } else {
        return cb(null)
      }
    })
  }

  // Run native sql to get unscored contestant
  Competition.remoteMethod('unScoredUserCount', {
    accepts: [
      {
        arg: 'competitionId',
        type: 'number',
        description: 'competition ID',
        required: true
      },
      {
        arg: 'jurorId',
        type: 'number',
        description: 'juror ID',
        required: true
      }
    ],
    returns: {arg: 'count', type: 'number'},
    description: 'API to get unscored contestant'
  })

  Competition.unScoredUserCount = function (competitionId, jurorId, cb) {
    const juryPanelModel = Competition.app.models.juryPanel
    juryPanelModel.findOne({
      fields: { id: true },
      where: { competitionId: competitionId, userId: jurorId }
    }, (err, result) => {
      if (err) return cb(err, null)

      if (result) {
        const juryPanelId = result.id
        const mySQL = Competition.app.datasources.mysql.connector
        const sql = `SELECT COUNT(1) AS count FROM contestant a WHERE a.isSubmitted = 1
          AND a.isVerified = 1
          AND a.competitionId = ${competitionId}
          AND NOT EXISTS (SELECT 1 FROM contestantScore b WHERE
          b.contestantId = a.id AND b.juryPanelId = ${juryPanelId})
          ORDER BY a.submittedAt`

        mySQL.execute(sql, null, (err, data) => {
          if (err) return cb(err, null)

          return cb(null, data[0].count)
        })
      } else {
        return cb(null, 0)
      }
    })
  }

  // Run native to get top 20 of all jury
  Competition.remoteMethod('pleno', {
    accepts: [
      {
        arg: 'competitionId',
        type: 'number',
        description: 'competition ID',
        required: true
      }
    ],
    returns: {arg: 'data', type: 'object', root: true},
    description: 'API for pleno'
  })

  Competition.pleno = function (competitionId, cb) {
    const juryPanelModel = Competition.app.models.juryPanel
    juryPanelModel.count({competitionId: competitionId}, (err, count) => {
      if (err) return cb(err, null)

      if (count > 0) {

        const sql = `SELECT a.totalScore, ${count} AS hit, SUM(a.totalScore/${count}) AS grandScore,
          a.contestantId
          FROM contestantScore a WHERE
          EXISTS (SELECT 1 FROM contestant b WHERE b.isSubmitted = 1
          AND b.isVerified = 1
          AND a.contestantId = b.id AND b.competitionId = ${competitionId})
          GROUP BY a.contestantId
          ORDER BY totalScore DESC LIMIT 20`
        const mySQL = Competition.app.datasources.mysql.connector
        mySQL.execute(sql, null, (err, data) => {
          if (err) return cb(err, null)

          return cb(null, data)
        })
      } else {
        return cb(null, null)
      }
    })
  }
};
