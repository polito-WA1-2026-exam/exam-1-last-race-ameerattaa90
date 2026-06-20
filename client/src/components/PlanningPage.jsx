import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../API.js";

function PlanningPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [planningData, setPlanningData] = useState(null);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState([]);
  const [timeLeft, setTimeLeft] = useState(90);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submittedRef = useRef(false);

  useEffect(() => {
    API.getPlanningData(gameId)
      .then((data) => {
        setPlanningData(data);
      })
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [gameId]);

  useEffect(() => {
    if (loading || submittedRef.current) {
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((oldTime) => Math.max(oldTime - 1, 0));
    }, 1000);

    return () => clearInterval(timerId);
  }, [loading]);

  useEffect(() => {
    if (timeLeft === 0 && !submittedRef.current && !loading) {
      handleSubmitRoute();
    }
  }, [timeLeft, loading]);

  const segmentById = useMemo(() => {
    const map = new Map();

    if (planningData) {
      for (const segment of planningData.network.segments) {
        map.set(segment.id, segment);
      }
    }

    return map;
  }, [planningData]);

  function handleSelectSegment(segmentId) {
    if (submittedRef.current) {
      return;
    }

    if (selectedSegmentIds.includes(segmentId)) {
      return;
    }

    setSelectedSegmentIds((oldRoute) => [...oldRoute, segmentId]);
  }

  function handleRemoveLastSegment() {
    if (submittedRef.current) {
      return;
    }

    setSelectedSegmentIds((oldRoute) => oldRoute.slice(0, -1));
  }

  function handleClearRoute() {
    if (submittedRef.current) {
      return;
    }

    setSelectedSegmentIds([]);
  }

  async function handleSubmitRoute() {
    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);
    setErrorMessage("");

    try {
      await API.submitRoute(gameId, selectedSegmentIds);
      navigate(`/games/${gameId}/result`);
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setErrorMessage(err.message);
    }
  }

  if (loading) {
    return (
      <main className="page-container">
        <section className="card">
          <p>Loading planning phase...</p>
        </section>
      </main>
    );
  }

  if (!planningData) {
    return (
      <main className="page-container">
        <section className="card">
          <h1>Planning Phase</h1>
          <p className="error-message">{errorMessage || "Unable to load game."}</p>
        </section>
      </main>
    );
  }

  const { game, network } = planningData;

  return (
    <main className="page-container">
      <section className="card">
        <div className="planning-header">
          <div>
            <h1>Planning Phase</h1>
            <p className="page-description">
              Select the segments in the order you want to travel. Each segment can be selected only once.
            </p>
          </div>

          <div className={timeLeft <= 15 ? "timer timer-warning" : "timer"}>
            {timeLeft}s
          </div>
        </div>

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
            <strong>Coins</strong>
            <span>{game.initial_coins}</span>
          </div>
        </div>

        <section className="planning-section">
          <h2>Stations</h2>
          <div className="station-chips">
            {network.stations.map((station) => (
              <span key={station.id} className="station-chip">
                {station.name}
              </span>
            ))}
          </div>
        </section>

        <section className="planning-section">
          <h2>Available Segments</h2>

          <div className="segment-list">
            {network.segments.map((segment) => {
              const alreadySelected = selectedSegmentIds.includes(segment.id);

              return (
                <button
                  key={segment.id}
                  className={alreadySelected ? "segment-button selected" : "segment-button"}
                  disabled={alreadySelected || submitting}
                  onClick={() => handleSelectSegment(segment.id)}
                >
                  {segment.station1_name} — {segment.station2_name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="planning-section">
          <h2>Your Route</h2>

          {selectedSegmentIds.length === 0 ? (
            <p>No segment selected yet.</p>
          ) : (
            <ol className="selected-route">
              {selectedSegmentIds.map((segmentId) => {
                const segment = segmentById.get(segmentId);

                return (
                  <li key={segmentId}>
                    {segment.station1_name} — {segment.station2_name}
                  </li>
                );
              })}
            </ol>
          )}

          <div className="button-row">
            <button
              className="secondary-button"
              onClick={handleRemoveLastSegment}
              disabled={selectedSegmentIds.length === 0 || submitting}
            >
              Remove Last
            </button>

            <button
              className="secondary-button"
              onClick={handleClearRoute}
              disabled={selectedSegmentIds.length === 0 || submitting}
            >
              Clear Route
            </button>

            <button
              className="primary-button"
              onClick={handleSubmitRoute}
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Route"}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

export default PlanningPage;