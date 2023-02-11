const path = require('path');
const cron = require('cron');

const sequelize = require('./util/database');
const User = require('./models/user');
const UserDetails = require('./models/user-details');
const UserDailyMeals = require('./models/user-daily-meals');

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const mainRoutes = require('./routes/main');

const options = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '1357900',
  database: 'fthub',
};

const sessionStore = new MySQLStore(options);
app.use(
  session({
    key: 'my secret',
    secret: 'my secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
  })
);

app.set('view engine', 'ejs');
app.set('views', 'views');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  if (!req.session.user) return next();
  else {
    User.findByPk(req.session.user.id)
      .then(user => {
        req.user = user;
        next();
      })
      .catch(err => console.log(err));
  }
});

app.use(mainRoutes);

User.hasOne(UserDetails);
User.hasOne(UserDailyMeals);

UserDetails.belongsTo(User);
UserDailyMeals.belongsTo(User);

// ВНИМАНИЕ! РАБОТИ НА ВСЕКИ 24 ЧАСА, НО ПРИ РЕСТАРТ НА СЪРВЪРА СЕ РЕСЕТВА И БАЗАТА!
const job = new cron.CronJob('0 0 0 * * *', () =>
  sequelize.query(
    'UPDATE `user-daily-meals` SET mealsYesterday = mealsToday, mealsToday = null'
  )
);

job.start();

sequelize
  //.sync({ force: true })
  .sync()
  .then(
    app.listen(8080, '0.0.0.0', () => {
      console.log('Server running at http://localhost:8080');
    })
  )
  .catch(err => {
    console.log(err);
  });
