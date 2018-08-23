const nconf = require('nconf');
const Airtable = require('airtable');

Airtable.configure({
  apiKey: nconf.get('airtable:key'),
});

module.exports = (queue) => {
  // concurrency of 5
  queue.process('getAirtable', 5, (job, done) => {
    const base = new Airtable({
      apiKey: nconf.get('airtable:key'),
    }).base(job.data.base);

    base(job.data.sheet).select({}).eachPage((records, fetchNextPage) => {
      // This function (`page`) will get called for each page of records.


      records.forEach((record) => {
        // you can even create jobs from in here
        queue.create('updateGithub', {
          ...job.data,
          project: record.get('Github'),
          record: record.id,
        }).save();

        queue.create('updateNpm', {
          ...job.data,
          project: record.get('npm'),
          record: record.id,
        }).save();
      });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      fetchNextPage();
    }, done);
  });
};
