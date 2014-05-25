'use strict';

var path = require('path');
module.exports = {
  logs: path.resolve(process.env.LOG_DIR||process.env.HOME, (process.env.LOG_FILE||'blog-loader.log')),
  path: path.resolve((process.env.BLOG_DIR||process.env.HOME), (process.env.BLOG_FOLDER||'blog')),
  db: {
    host: 'localhost',
    port: 28015,
    db: process.env.NODE_ENV === 'development' ? 'blog_development' : 'blog'
  }
};
