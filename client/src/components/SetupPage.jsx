import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../API.js";

function SetupPage() {
  const navigate = useNavigate();

  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [startingGame, setStartingGame] = useState(false);

  useEffect(() => {
    API.getFullNetwork()
      .then((data) => {
        setNetwork(data);
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleStartGame() {
    setStartingGame(true);
    setErrorMessage("");

    try {
      const game = await API.createGame();
      navigate(`/games/${game.id}/planning`);
    } catch (err) {
      setErrorMessage(err.message);
      setStartingGame(false);
    }
  }

  if (loading) {
    return (
      <main className="page-container">
        <section className="card">
          <p>Loading network...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="card">
        <h1>Setup Phase</h1>

        <p className="page-description">
          Study the full underground network. When you are ready, start the game.
          In the planning phase, the line map will no longer be visible.
        </p>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {network && (
          <div className="network-lines">
            {network.lines.map((line) => (
              <section key={line.id} className="line-card">
                <h2>{line.name}</h2>

                <ol className="station-list">
                  {line.stations.map((station) => (
                    <li key={`${line.id}-${station.id}`}>
                      {station.name}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}

        <button
          className="primary-button"
          onClick={handleStartGame}
          disabled={startingGame}
        >
          {startingGame ? "Starting..." : "Start Game"}
        </button>
      </section>
    </main>
  );
}

export default SetupPage;