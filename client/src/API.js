const SERVER_URL = "http://localhost:3001/api";

async function getJson(httpResponse) {
  const json = await httpResponse.json().catch(() => null);

  if (!httpResponse.ok) {
    const error = json?.error || "Unknown API error";
    throw new Error(error);
  }

  return json;
}

/* -------------------------------------------------------------------------- */
/* AUTHENTICATION                                                             */
/* -------------------------------------------------------------------------- */

async function logIn(credentials) {
  const response = await fetch(`${SERVER_URL}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  return getJson(response);
}

async function getCurrentUser() {
  const response = await fetch(`${SERVER_URL}/sessions/current`, {
    credentials: "include",
  });

  return getJson(response);
}

async function logOut() {
  const response = await fetch(`${SERVER_URL}/sessions/current`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Logout failed");
  }
}

/* -------------------------------------------------------------------------- */
/* NETWORK                                                                    */
/* -------------------------------------------------------------------------- */

async function getFullNetwork() {
  const response = await fetch(`${SERVER_URL}/network/full`, {
    credentials: "include",
  });

  return getJson(response);
}

async function getPlanningData(gameId) {
  const response = await fetch(`${SERVER_URL}/games/${gameId}/planning`, {
    credentials: "include",
  });

  return getJson(response);
}

/* -------------------------------------------------------------------------- */
/* GAME                                                                       */
/* -------------------------------------------------------------------------- */

async function createGame() {
  const response = await fetch(`${SERVER_URL}/games`, {
    method: "POST",
    credentials: "include",
  });

  return getJson(response);
}

async function submitRoute(gameId, segmentIds) {
  const response = await fetch(`${SERVER_URL}/games/${gameId}/route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ segments: segmentIds }),
  });

  return getJson(response);
}

async function getGameResult(gameId) {
  const response = await fetch(`${SERVER_URL}/games/${gameId}/result`, {
    credentials: "include",
  });

  return getJson(response);
}

/* -------------------------------------------------------------------------- */
/* RANKING                                                                    */
/* -------------------------------------------------------------------------- */

async function getRanking() {
  const response = await fetch(`${SERVER_URL}/ranking`, {
    credentials: "include",
  });

  return getJson(response);
}

const API = {
  logIn,
  getCurrentUser,
  logOut,
  getFullNetwork,
  createGame,
  getPlanningData,
  submitRoute,
  getGameResult,
  getRanking,
};

export default API;