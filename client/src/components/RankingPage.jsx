import { useEffect, useState } from "react";
import API from "../API.js";

function RankingPage() {
  const [ranking, setRanking] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.getRanking()
      .then((ranking) => {
        setRanking(ranking);
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="page-container">
        <p>Loading ranking...</p>
      </main>
    );
  }

  return (
    <main className="page-container">
      <section className="card">
        <h1>General Ranking</h1>
        <p className="page-description">
          Best score achieved by each registered player.
        </p>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {ranking.length === 0 ? (
          <p>No completed games yet.</p>
        ) : (
          <table className="ranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Email</th>
                <th>Best Score</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((row, index) => (
                <tr key={row.user_id}>
                  <td>{index + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.email}</td>
                  <td className="score-cell">{row.best_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}

export default RankingPage;