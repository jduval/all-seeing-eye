'use strict';

const async = require('async');
const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;
const Twit = require('twit');

const mongoUrl = (/localhost/.test(process.env.MONGODB_URI))
                 ? `${process.env.MONGODB_URI}allSeeingEye`
                 : process.env.MONGODB_URI;

const T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

module.exports = {
  getAndCheckFollowers: () => {
    T.get('followers/ids', { screen_name: 'jduvtw' }, (err, followers) => {
      if (err)
        return console.error(err);
      MongoClient.connect(mongoUrl, (err, db) => {
        if (err) {
          console.error(err);
          return db.close();
        }

        const collection = db.collection('twitter');
        collection.find({date: moment().add(-1, 'days').format('YYYY-MM-DD')})
          .toArray((err, yesterdayFollowers) => {
            if (err) {
              console.error(err);
              return db.close();
            }

            if (!yesterdayFollowers.length) {
              const document = {
                date: moment().format('YYYY-MM-DD'),
                followers: followers.ids,
                new: [],
                unfollow: [],
              };
              return collection.insertOne(document, (err) => {
                if (err) {
                  console.error(err);
                  return db.close();
                }
                return db.close();
              });
            }

            const newFollowers = followers.ids.filter((followers) =>
              yesterdayFollowers[0].followers.filter((yesterdayFollowers) =>
                followers === yesterdayFollowers).length === 0);

            const unFollowers = yesterdayFollowers[0].followers.filter((yesterdayFollowers) =>
              followers.ids.filter((followers) =>
                yesterdayFollowers === followers).length === 0);

            const document = {
              date: moment().format('YYYY-MM-DD'),
              followers: followers.ids,
              new: newFollowers,
              unfollow: unFollowers,
            };
            collection.insertOne(document, (err) => {
              if (err) {
                console.error(err);
                return db.close();
              }
              db.close();
            });
          });
      });
    });
  },

  getUnfollowers: (ids, cbk) => {
    const unfollowers = [];
    return async.each(ids, (id, cbkEach) => {
      T.get('users/show', { user_id: id })
      .catch((err) => cbkEach(err))
      .then((user) => {
        unfollowers.push({
          name: user.data.name,
          profile_image_url_https: user.data.profile_image_url_https,
          screen_name: user.data.screen_name,
        });
        return cbkEach(null);
      });
    }, (err) => {
      if (err)
        return cbk(err);
      return cbk(null, unfollowers);
    });
  },
};
