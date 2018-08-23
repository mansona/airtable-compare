const rp = require('request-promise');
const nconf = require('nconf');
const Airtable = require('airtable');
const moment = require('moment');

const airtable = new Airtable({ apiKey: nconf.get('airtable:key') });

module.exports = (queue) => {
  queue.process('updateGithub', 5, async (job, done) => {
    try {
      const response = await rp(`/repos/${job.data.project}`, {
        baseUrl: 'https://api.github.com',
        headers: {
          'User-Agent': 'airtable-compare',
          Authorization: `token ${nconf.get('github:token')}`,
        },
        json: true,
      });

      const base = airtable.base(job.data.base);

      const issues = await rp(`/repos/${job.data.project}/issues`, {
        baseUrl: 'https://api.github.com',
        qs: {
          since: moment().subtract(6, 'months').format('YYYY-MM-DD'),
          state: 'all',
        },
        headers: {
          'User-Agent': 'airtable-compare',
        },
        json: true,
      });

      await new Promise((resolve, reject) => {
        base(job.data.sheet).update(job.data.record, {
          Stars: response.stargazers_count,
          Forks: response.forks_count,
          'PRs (6 Months)': issues.filter(issue => issue.pull_request).length,
          'Issues (6 Months)': issues.filter(issue => !issue.pull_request).length,
          'Open issues (incl PRs)': issues.filter(issue => issue.state === 'open').length,
        }, (err) => {
          if (err) { return reject(err); }

          return resolve();
        });
      });

      // console.log(issues.length);
    } catch (e) {
      return done(e);
    }

    return done();
  });
};
