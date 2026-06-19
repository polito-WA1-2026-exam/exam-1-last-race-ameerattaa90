// imports
import express from "express";
import cors from "cors";
import * as dao from "./dao.js";

// init express
const app = express();
const port = 3001;

// middleware
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// test API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// full network API: used in setup phase
app.get("/api/network/full", async (req, res) => {
  try {
    const network = await dao.getFullNetwork();
    res.json(network);
  } catch (err) {
    console.error("Error loading full network:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// planning network API: hides line information
app.get("/api/network/planning", async (req, res) => {
  try {
    const network = await dao.getPlanningNetwork();
    res.json(network);
  } catch (err) {
    console.error("Error loading planning network:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ranking API
app.get("/api/ranking", async (req, res) => {
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