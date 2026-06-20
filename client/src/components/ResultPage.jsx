import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../API.js";

function ResultPage() {
  const { gameId } = useParams();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    API.getGameResult(gameId)
      .then((data) => {
        setResult(data);
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [gameId]);

  if (loading) {
    return (
      <main className="page-container">
        <section className="card">
          <p>Loading result...</p>
        </section>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="page-container">
        <section className="card">
          <h1>Game Result</h1>
          <p className="error-message">{errorMessage || "Unable to load result."}</p>
          <Link to="/setup">Start a new game</Link>
        </section>
      </main>
    );
  }

  const { game, steps } = result;

  return (
    <main className="page-container">
      <section className="card">
        <h1>Game Result</h1>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className="game-info-grid">
          <div className="info-box">
            <strong>Start</strong>
            <span>{game.start_station.name}</span>
          </div>

          <div className="info-box">
            <strong>Destination</strong>
            <span>{game.destination_station.name}</span>
          </div>

          <div className="info-box">
            <strong>Final Score</strong>
            <span>{game.final_score}</span>
          </div>
        </div>

        <p className="page-description">
          Status: <strong>{game.status}</strong>
        </p>

        {steps.length === 0 ? (
          <p>
            The submitted route was invalid or incomplete, so the execution phase
            was skipped and the final score is 0.
          </p>
        ) : (
          <section className="planning-section">
            <h2>Execution Steps</h2>

            <table className="ranking-table">
              <thead>
                <tr>
                  <th>Step</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Line</th>
                  <th>Event</th>
                  <th>Effect</th>
                  <th>Coins</th>
                </tr>
              </thead>

              <tbody>
                {steps.map((step) => (
                  <tr key={step.id}>
                    <td>{step.step_order}</td>
                    <td>{step.from_station_name}</td>
                    <td>{step.to_station_name}</td>
                    <td>{step.line_name}</td>
                    <td>{step.event_description}</td>
                    <td>{step.event_effect}</td>
                    <td className="score-cell">{step.coins_after_step}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <div className="button-row">
          <Link className="primary-button link-button" to="/setup">
            Start New Game
          </Link>

          <Link className="secondary-button link-button" to="/ranking">
            View Ranking
          </Link>
        </div>
      </section>
    </main>
  );
}

export default ResultPage;