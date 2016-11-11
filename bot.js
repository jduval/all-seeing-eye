'use strict';

const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');
const MongoClient = require('mongodb').MongoClient;

const mongoUrl = (/localhost/.test(process.env.MONGODB_URI))
                 ? `${process.env.MONGODB_URI}allSeeingEye`
                 : process.env.MONGODB_URI;

const twitterGetter = require('./applications/twitter').getUnfollowers;

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true});

MongoClient.connect(mongoUrl, (err, db) => {
  if (err) {
    console.error(err);
    return db.close();
  }

  const collection = db.collection('twitter');
  return collection.find({date: moment().format('YYYY-MM-DD')})
    .toArray((err, followers) => {
      if (err) {
        console.error(err);
        return db.close();
      }
      if (!followers.length)
        return db.close();

      if (!followers[0].unfollow.length)
        return db.close();

      twitterGetter(followers[0].unfollow, (err, unfollowers) => {
        if (err) {
          console.log(err);
          return db.close();
        }

        let message = `${unfollowers.length} new unfollowers !!`;
        unfollowers.forEach((unfollower) => {
          message += `\n${unfollower.name}: https://twitter.com/${unfollower.screen_name}`;
        });
        bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
      });
    });
});
