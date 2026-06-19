// imports
import express from "express";
import cors from "cors";
import * as dao from "./dao.js";

import session from "express-session";
import passport from "passport";
import LocalStrategy from "passport-local";
import crypto from "node:crypto";



// init express
const app = express();
const port = 3001;

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

// middleware
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


app.use(
  session({
    secret: "last-race-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());


passport.use(
  new LocalStrategy.Strategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await dao.getUserByEmail(email);

        if (!user) {
          return done(null, false, { message: "Invalid email or password" });
        }

        const passwordOk = verifyPassword(password, user.salt, user.hash);

        if (!passwordOk) {
          return done(null, false, { message: "Invalid email or password" });
        }

        return done(null, {
          id: user.id,
          email: user.email,
          name: user.name,
        });
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await dao.getUserById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ error: "Not authenticated" });
}



// test API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

//sessions APIs

app.post("/api/sessions", passport.authenticate("local"), (req, res) => {
  res.json(req.user);
});

app.get("/api/sessions/current", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
});

app.delete("/api/sessions/current", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }

    res.status(204).end();
  });
});



// full network API: used in setup phase
app.get("/api/network/full", isLoggedIn , async (req, res) => {
  try {
    const network = await dao.getFullNetwork();
    res.json(network);
  } catch (err) {
    console.error("Error loading full network:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// planning network API: hides line information
app.get("/api/network/planning", isLoggedIn , async (req, res) => {
  try {
    const network = await dao.getPlanningNetwork();
    res.json(network);
  } catch (err) {
    console.error("Error loading planning network:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ranking API
app.get("/api/ranking", isLoggedIn , async (req, res) => {
  try {
    const ranking = await dao.getRanking();
    res.json(ranking);
  } catch (err) {
    console.error("Error loading ranking:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});