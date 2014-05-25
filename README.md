# blog-loader

### What is this?

App that watched the `~/blog` folder and loads the posts into RethinkDB.

### Commands

* `npm start` - runs app in production mode
* `npm run dev` - runs app in development mode

### Environment Variables 

* `LOG_DIR` - directory where logs will be saved, defaults to `HOME`
* `LOG_FILE` - filename for log files, defaults to `blog-loader.log`
* `BLOG_DIR` - directory where blog folder is expected to be found, defaults to `HOME`
* `BLOG_FOLDER` - folder inside of `BLOG_DIR` containing blog files, defaults to `./blog`
* `NODE_ENV` - if it's `development` the db will be `blog_development`, otherwise it'll be `blog`
