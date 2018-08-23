const rp = require('request-promise');
const nconf = require('nconf');
const Airtable = require('airtable');

const airtable = new Airtable({ apiKey: nconf.get('airtable:key') });

module.exports = (queue) => {
  queue.process('updateNpm', 5, async (job, done) => {
    if (!job.data.project || !job.data.project.length) {
      return done();
    }

    try {
      const response = await rp(`/last-month/${job.data.project}`, {
        baseUrl: 'https://api.npmjs.org/downloads/point/',
        json: true,
      });

      const base = airtable.base(job.data.base);

      await new Promise((resolve, reject) => {
        base(job.data.sheet).update(job.data.record, {
          'Npm Downloads': response.downloads,
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
