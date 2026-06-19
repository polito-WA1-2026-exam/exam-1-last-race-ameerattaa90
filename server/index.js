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

/*-----------------------------------------------------------------------------*/
/*               HELPER FUNCTIONS TO CREATE A GAME                                                                */
/*-----------------------------------------------------------------------------*/


function buildAdjacencyList(stations, segments) {
  const adjacency = new Map();

  for (const station of stations) {
    adjacency.set(station.id, []);
  }

  for (const segment of segments) {
    adjacency.get(segment.station1_id).push(segment.station2_id);
    adjacency.get(segment.station2_id).push(segment.station1_id);
  }

  return adjacency;
}

function shortestDistance(startStationId, destinationStationId, adjacency) {
  const visited = new Set();
  const queue = [{ stationId: startStationId, distance: 0 }];

  visited.add(startStationId);

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.stationId === destinationStationId) {
      return current.distance;
    }

    const neighbors = adjacency.get(current.stationId) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({
          stationId: neighbor,
          distance: current.distance + 1,
        });
      }
    }
  }

  return Infinity;
}

async function selectRandomStartAndDestination() {
  const stations = await dao.getStations();
  const segments = await dao.getAllSegmentsWithLines();

  const adjacency = buildAdjacencyList(stations, segments);

  const validPairs = [];

  for (const start of stations) {
    for (const destination of stations) {
      if (start.id !== destination.id) {
        const distance = shortestDistance(start.id, destination.id, adjacency);

        if (distance >= 3 && distance !== Infinity) {
          validPairs.push({
            startStationId: start.id,
            destinationStationId: destination.id,
          });
        }
      }
    }
  }

  if (validPairs.length === 0) {
    throw new Error("No valid start/destination pairs found");
  }

  const randomIndex = Math.floor(Math.random() * validPairs.length);
  return validPairs[randomIndex];
}



function parsePositiveInteger(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function isPositiveIntegerArray(values) {
  return (
    Array.isArray(values) &&
    values.length > 0 &&
    values.every((value) => Number.isInteger(value) && value > 0)
  );
}

async function validateSubmittedRoute(game, submittedSegmentIds) {
  const repeatedSegments = new Set();

  for (const segmentId of submittedSegmentIds) {
    if (repeatedSegments.has(segmentId)) {
      return {
        valid: false,
        reason: "The same segment cannot be used more than once",
      };
    }

    repeatedSegments.add(segmentId);
  }

  const allSegments = await dao.getAllSegmentsWithLines();
  const segmentById = new Map();

  for (const segment of allSegments) {
    segmentById.set(segment.id, segment);
  }

  let currentStationId = game.start_station_id;
  let previousLineId = null;
  const orderedSteps = [];

  for (const segmentId of submittedSegmentIds) {
    const segment = segmentById.get(segmentId);

    if (!segment) {
      return {
        valid: false,
        reason: `Segment ${segmentId} does not exist`,
      };
    }

    const startsFromCurrentStation =
      segment.station1_id === currentStationId ||
      segment.station2_id === currentStationId;

    if (!startsFromCurrentStation) {
      return {
        valid: false,
        reason: "The selected segments are not connected in sequence",
      };
    }

    if (previousLineId !== null && previousLineId !== segment.line_id) {
      const isInterchange = await dao.isInterchangeStation(currentStationId);

      if (!isInterchange) {
        return {
          valid: false,
          reason: "Line changes are allowed only at interchange stations",
        };
      }
    }

    const nextStationId =
      segment.station1_id === currentStationId
        ? segment.station2_id
        : segment.station1_id;

    orderedSteps.push({
      fromStationId: currentStationId,
      toStationId: nextStationId,
      lineId: segment.line_id,
    });

    currentStationId = nextStationId;
    previousLineId = segment.line_id;
  }

  if (currentStationId !== game.destination_station_id) {
    return {
      valid: false,
      reason: "The route does not end at the assigned destination station",
    };
  }

  return {
    valid: true,
    orderedSteps,
  };
}

async function executeValidRoute(gameId, orderedSteps) {
  let coins = 20;

  for (let i = 0; i < orderedSteps.length; i++) {
    const step = orderedSteps[i];
    const event = await dao.getRandomEvent();

    coins += event.effect;

    await dao.saveGameStep(
      gameId,
      i + 1,
      step.fromStationId,
      step.toStationId,
      step.lineId,
      event.id,
      coins
    );
  }

  const finalScore = Math.max(0, coins);

  await dao.updateGameResult(gameId, finalScore, "completed");

  const savedSteps = await dao.getGameSteps(gameId);

  return {
    finalScore,
    steps: savedSteps,
  };
}

/*-------------------------------------------------------------------------------*/

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
/* GAME APIs                                                                  */
/* -------------------------------------------------------------------------- */

app.post("/api/games", isLoggedIn, async (req, res) => {
  try {
    const { startStationId, destinationStationId } =
      await selectRandomStartAndDestination();

    const gameId = await dao.createGame(
      req.user.id,
      startStationId,
      destinationStationId
    );

    const game = await dao.getGameById(gameId);

    res.status(201).json(game);
  } catch (err) {
    console.error("Error creating game:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/api/games/:id/planning", isLoggedIn, async (req, res) => {
  try {
    const gameId = parsePositiveInteger(req.params.id);

    if (!gameId) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const game = await dao.getGameById(gameId);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    if (game.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (game.status !== "planning") {
      return res.status(409).json({ error: "Game is not in planning phase" });
    }

    const planningNetwork = await dao.getPlanningNetwork();

    res.json({
      game: {
        id: game.id,
        start_station: {
          id: game.start_station_id,
          name: game.start_station_name,
        },
        destination_station: {
          id: game.destination_station_id,
          name: game.destination_station_name,
        },
        initial_coins: game.initial_coins,
        status: game.status,
      },
      network: planningNetwork,
    });
  } catch (err) {
    console.error("Error loading planning data:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/games/:id/route", isLoggedIn, async (req, res) => {
  try {
    const gameId = parsePositiveInteger(req.params.id);

    if (!gameId) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const game = await dao.getGameById(gameId);

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    if (game.user_id !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (game.status !== "planning") {
      return res.status(409).json({ error: "Game is not in planning phase" });
    }

    const submittedSegmentIds = req.body.segments;

    if (!isPositiveIntegerArray(submittedSegmentIds)) {
      return res.status(400).json({
        error: "The request body must contain a non-empty array of segment ids",
      });
    }

    const validation = await validateSubmittedRoute(game, submittedSegmentIds);

    if (!validation.valid) {
      await dao.updateGameResult(gameId, 0, "failed");

      return res.json({
        valid: false,
        reason: validation.reason,
        final_score: 0,
        status: "failed",
        steps: [],
      });
    }

    const execution = await executeValidRoute(gameId, validation.orderedSteps);
    const updatedGame = await dao.getGameById(gameId);

    res.json({
      valid: true,
      game: {
        id: updatedGame.id,
        status: updatedGame.status,
        final_score: updatedGame.final_score,
      },
      steps: execution.steps,
    });
  } catch (err) {
    console.error("Error submitting route:", err);
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