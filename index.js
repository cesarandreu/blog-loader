'use strict';
var config = require('./config'),
  co = require('co'),
  thunkify = require('thunkify'),
  path = require('path'),
  rethinkdb = require('rethinkdbdash-unstable')(config.db),
  glob = thunkify(require('glob')),
  fse = require('co-fs-plus'),
  gaze = thunkify(require('gaze')),
  fs = require('co-fs'),
  log4js = require('log4js');

// Logger config
log4js.loadAppender('file');
log4js.addAppender(log4js.appenders.file(config.logs), 'blog-fetcher');
var logger = log4js.getLogger('blog-fetcher');

// Inserts post in database
function* insertPost(post) {
  var dbPost;
  try {
    logger.info('START get post');
    dbPost = yield rethinkdb.table('posts').get(post.name).run();
  } catch (err) {
    logger.error('ERROR get post:\n', err);
    throw err;
  }

  try {
    let result;
    logger.info('START insert/replace post');
    if (dbPost && dbPost.name) {
      result = yield rethinkdb.table('posts').get(post.name).replace(post).run();
    } else {
      result = yield rethinkdb.table('posts').insert(post).run();
    }
    logger.info('RESULT insert/replace post:\n', result);
    return result;
  } catch (err) {
    logger.error('ERROR insert/replace post:\n', err);
    throw err;
  }
}

// Reads meta.json and prepares post object
function* preparePost(metaPath) {
  let post;
  try {
    logger.info('START prepare post:\n', metaPath);
    post = JSON.parse(yield fs.readFile(metaPath, 'utf8'));
    post.folder = path.dirname(metaPath);
    post.name = path.basename(post.folder);
    post.file = post.fileName ? yield fs.readFile(path.resolve(path.dirname(metaPath), post.fileName), 'utf8') : '';
    post.lastUpdate = rethinkdb.now();
    post.createdAt = post.createdAt ? rethinkdb.ISO8601(post.createdAt) : rethinkdb.now();
    return post;
  } catch (err) {
    logger.error('ERROR prepare post:\n', err);
    throw err;
  }
}

// Initializes loader by creating the database/table, folder, and loading all posts
function* loaderInitialize() {
  let list;

  try {
    logger.info('START create blog database');
    yield rethinkdb.dbCreate(config.db.db).run();
  } catch (err) {
    logger.warn('WARNING database creation failed:\n', err);
  }

  try {
    logger.info('START create posts table');
    yield rethinkdb.tableCreate('posts', {
      primaryKey: 'name'
    }).run();
  } catch (err) {
    logger.warn('WARNING table creation failed:\n', err);
  }

  try {
    logger.info('START mkdirp/glob');
    yield fse.mkdirp(config.path);
    list = yield glob('**/*.meta.json', {
      cwd: config.path
    });
  } catch (err) {
    logger.error('ERROR mkdirp/glob:\n', err);
    throw err;
  }

  for (let i = 0; i < list.length; i++) {
    try {
      logger.info('START process post:\n', list[i]);
      let post = yield preparePost(path.resolve(config.path, list[i]));
      yield insertPost(post);
    } catch (err) {
      logger.warn('WARNING process post:\n', err);
    }
  }
}

co(function* () {
  logger.info('Starting blog-loader');
  yield loaderInitialize();

  var watcher, folderWatcher;
  try {
    logger.info('START watcher');
    watcher = yield gaze('**/*.meta.json', {
      cwd: config.path
    });
    logger.info('START folderWatcher');
    folderWatcher = yield gaze('**', {
      cwd: config.path
    });
  } catch (err) {
    logger.error('ERROR watcher/folderWatcher:\n', err);
    throw err;
  }

  watcher.on('all', function(event, file) {
    if (event !== 'deleted' && file.indexOf('.meta.json') > -1) {
      co(function* (file) {
        logger.info('START watcher process post:\n', file);
        let post = yield preparePost(file);
        yield insertPost(post);
      })(file);
    }
  });
  folderWatcher.on('added', function(file) {
    logger.info('START folderWatcher:\n', file);
    watcher.add('**/*.meta.json');
  });

})();

