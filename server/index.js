// imports
import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import passportLocal from "passport-local";
import crypto from "node:crypto";
import * as dao from "./dao.js";

const LocalStrategy = passportLocal.Strategy;

// init express
const app = express();
const port = 3001;

/* -------------------------------------------------------------------------- */
/* MIDDLEWARE                                                                 */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* PASSPORT CONFIGURATION                                                     */
/* -------------------------------------------------------------------------- */

function verifyPassword(password, salt, storedHash) {
  const computedHash = crypto.scryptSync(password, salt, 32).toString("hex");

  const computedBuffer = Buffer.from(computedHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (computedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(computedBuffer, storedBuffer);
}

passport.use(
  new LocalStrategy(
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

/* -------------------------------------------------------------------------- */
/* AUTHORIZATION MIDDLEWARE                                                   */
/* -------------------------------------------------------------------------- */

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ error: "Not authenticated" });
}

/* -------------------------------------------------------------------------- */
/* BASIC TEST API                                                             */
/* -------------------------------------------------------------------------- */

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

/* -------------------------------------------------------------------------- */
/* SESSION APIs                                                               */
/* -------------------------------------------------------------------------- */

app.post("/api/sessions", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      return res.status(401).json({
        error: info?.message || "Invalid email or password",
      });
    }

    req.login(user, (err) => {
      if (err) {
        return next(err);
      }

      return res.json(req.user);
    });
  })(req, res, next);
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

/* -------------------------------------------------------------------------- */
/* NETWORK APIs                                                               */
/* -------------------------------------------------------------------------- */

// Full network for setup phase.
// Protected because anonymous users must not see the network map.
app.get("/api/network/full", isLoggedIn, async (req, res) => {
  try {
    const network = await dao.getFullNetwork();
    res.json(network);
  } catch (err) {
    console.error("Error loading full network:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Planning network.
// Protected because it is part of the game.
app.get("/api/network/planning", isLoggedIn, async (req, res) => {
  try {
    const network = await dao.getPlanningNetwork();
    res.json(network);
  } catch (err) {
    console.error("Error loading planning network:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* RANKING API                                                                */
/* -------------------------------------------------------------------------- */

app.get("/api/ranking", isLoggedIn, async (req, res) => {
  try {
    const ranking = await dao.getRanking();
    res.json(ranking);
  } catch (err) {
    console.error("Error loading ranking:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* -------------------------------------------------------------------------- */
/* SERVER START                                                               */
/* -------------------------------------------------------------------------- */

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});