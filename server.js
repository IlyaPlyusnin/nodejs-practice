const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const promiseMysql = require("promise-mysql");
const bcrypt = require("bcrypt");
const port = process.env.PORT || 3000;
const saltRounds = 12;

let app = express();

//Authentication packages
let session = require("express-session");
let MySQLStore = require("express-mysql-session")(session);
let passport = require("passport");
let LocalStrategy = require("passport-local").Strategy;

let options = {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "root",
  database: "users"
};

let sessionStore = new MySQLStore(options);

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

app.set("view engine", "hbs");
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: "somethsijgnfg",
    resave: false,
    saveUninitialized: false,
    store: sessionStore
    //cookie: { secure: true }
  })
);

app.use(passport.initialize());
app.use(passport.session());

let con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "users"
});

let promise = promiseMysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "users"
});

con.connect(err => {
  if (err) {
    throw err;
  } else {
    console.log("Connected!");
  }
});

passport.use(
  new LocalStrategy(function(username, password, done) {
    con.query(
      "select user_id, password from users where username = ?",
      [username],
      (err, results) => {
        if (err) {
          done(err);
        }
        if (results.length === 0) {
          done(null, false);
        } else {
          console.log("Password is:", results[0].password);
          const hash = results[0].password;
          bcrypt.compare(password, hash, (err, res) => {
            if (err) {
              throw err;
            }
            if (res === true) {
              return done(null, { user_id: results[0].user_id });
            } else {
              return done(null, false);
            }
          });
        }
      }
    );
  })
);

app.get("/", (req, res) => {
  res.render("index.hbs");
});

app.get("/home", (req, res) => {
  if (req.isAuthenticated()) {
    promise
      .query(
        `select * from users inner join balance on users.user_id = balance.user_id where users.user_id = '${
          req.user.user_id
        }'`
      )
      .then(result => {
        res.render("home.hbs", {
          user: result[0].username,
          activated: result[0].activated,
          owe: result[0].owe,
          sum: result[0].sum
        });
      });
  } else {
    res.redirect("/login");
  }
});

app.post("/home", (req, res) => {
  if (req.isAuthenticated()) {
    if (req.body.activated === "true") {
      promise.query(
        `update users set activated = '1' where user_id = ${req.user.user_id}`
      );
    }
    res.redirect("/home");
  }
});

app.post("/charges", (req, res) => {
  if (req.isAuthenticated()) {
    let owe = 0;
    let sum = 0;
    let swipes = [];

    for (let i = 0; i < 31; i++) {
      let charge = `day${i}Charge`;
      let payment = `day${i}Payment`;
      if (
        req.body[charge] &&
        Number.isFinite(Number(req.body[charge])) &&
        Number(req.body[charge]) !== 0
      ) {
        swipes.push(i);
      }

      if (
        req.body[payment] &&
        Number.isFinite(Number(req.body[payment])) &&
        Number(req.body[payment]) !== 0
      ) {
        swipes.push(i);
      }
    }

    let convert = array => {
      let newArray = [];
      for (let i = 0; i < array.length; i++) {
        if (i + 1 < array.length) {
          let num = array[i + 1] - array[i];
          newArray.push(num);
        } else if (i === array.length - 1) {
          let num = 30 - array[i];
          newArray.push(num);
        }
      }
      return newArray;
    };

    let newSwipes = convert(swipes);

    console.log("newSwipes are:", newSwipes);

    let nextNum = array => {
      return array.shift();
    };

    for (let i = 0; i < 31; i++) {
      let charge = `day${i}Charge`;
      let payment = `day${i}Payment`;
      if (
        req.body[charge] &&
        Number.isFinite(Number(req.body[charge])) &&
        Number(req.body[charge]) !== 0
      ) {
        owe += Number(req.body[charge]);
        let mult = nextNum(newSwipes);
        if (!mult) {
          mult = 1;
        }
        console.log(`owe is ${owe} and mult is ${mult}`);
        sum += ((owe * 0.35) / 365) * mult;
      }

      if (
        req.body[payment] &&
        Number.isFinite(Number(req.body[payment])) &&
        Number(req.body[payment]) !== 0
      ) {
        owe -= Number(req.body[payment]);
        let mult = nextNum(newSwipes);
        if (!mult) {
          mult = 1;
        }
        console.log(`owe is ${owe} and mult is ${mult}`);
        sum += ((owe * 0.35) / 365) * mult;
      }
    }
    sum += owe;

    let sql = `update balance set owe = '1', sum = '${sum}' where user_id = '${
      req.user.user_id
    }'`;
    promise
      .query(sql)
      .then(() => {
        res.redirect("/home");
      })
      .catch(err => {
        throw err;
      });
  }
});

app.get("/login", (req, res) => {
  res.render("login.hbs");
});

app.get("/logout", (req, res) => {
  req.logout();
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/login"
  })
);

app.post("/register", (req, res) => {
  //Perform some validation
  let errors = [];
  let username = req.body.username;
  let password = req.body.password;
  let fullname = req.body.fullname;
  let passwordMatch = req.body.passwordMatch;

  if (fullname.length === 0) {
    errors.push("Fulname is empty!");
  } else if (fullname.length < 4) {
    errors.push("Full name should be at least 4 characters long");
  }

  if (username.length === 0) {
    error.push("Username is empty");
  } else if (username.lenth < 4) {
    error.push("Username should be at least 4 characters long");
  }

  if (password.length === 0) {
    errors.push("Password cannot be empty");
  } else if (password.length < 4) {
    errors.push("Password should be at least 4 characters long");
  }
  if (password !== passwordMatch) {
    errors.push("Passwords did not match");
  }

  let sql = "select username from users where username = ?";
  let inserts = [username];
  sql = mysql.format(sql, inserts);

  promise.query(sql).then(result => {
    if (result.length > 0) {
      errors.push("Username taken");
    }
    if (errors.length > 0) {
      res.render("index.hbs", {
        errors
      });
    } else {
      console.log("");
      let sql =
        "insert into users (fullname, username, password) values (?,?,?)";
      bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
          throw err;
        } else {
          let inserts = [fullname, username, hash];
          sql = mysql.format(sql, inserts);
          con.query(sql, err => {
            if (err) {
              throw err;
            }
            console.log("Information was inserted successfully");

            con.query("select last_insert_id() as user_id", (err, results) => {
              if (err) {
                throw err;
              } else {
                let user_id = results[0];
                console.log("user_id", user_id);
                let newSql =
                  "insert into balance (user_id,owe,sum) values (?,?,?)";
                let owe = 0;
                let sum = 0;
                let myInserts = [results[0].user_id, owe, sum];
                newSql = mysql.format(newSql, myInserts);
                promise.query(newSql).then(() => {
                  req.login(user_id, err => {
                    if (err) {
                      throw err;
                    }
                    res.redirect("/home");
                  });
                });
              }
            });
          });
        }
      });
    }
  });
});

passport.serializeUser(function(user_id, done) {
  done(null, user_id);
});

passport.deserializeUser(function(user_id, done) {
  done(null, user_id);
});

app.listen(port);
