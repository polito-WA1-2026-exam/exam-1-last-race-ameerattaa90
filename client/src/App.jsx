import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useUser } from "./contexts/UserContext.jsx";
import LoginForm from "./components/LoginForm.jsx";
import RankingPage from "./components/RankingPage.jsx";
import SetupPage from "./components/SetupPage.jsx";
import PlanningPage from "./components/PlanningPage.jsx";
import ResultPage from "./components/ResultPage.jsx";

function HomePage() {
  const { loggedIn } = useUser();

  return (
    <main className="page-container">
      <section className="card">
        <h1>Last Race</h1>

        <p className="page-description">
          Last Race is a single-player metro route planning game. The goal is to
          reach the assigned destination station by building a valid route before
          the timer expires.
        </p>

        <section className="instructions-list">
          <h2>Game instructions</h2>

          <ol>
            <li>After login, open the setup phase and study the full metro network.</li>
            <li>When you start a game, the server assigns a start station and a destination station.</li>
            <li>During planning, you have 90 seconds to select metro segments and build your route.</li>
            <li>Each segment can be selected only once.</li>
            <li>The route must start from the assigned start station and end at the assigned destination.</li>
            <li>If the route is invalid or incomplete, the final score is 0.</li>
            <li>If the route is valid, random events are applied during execution and modify your coins.</li>
            <li>The final score is the remaining number of coins. Negative scores are shown as 0.</li>
          </ol>
        </section>

        {loggedIn ? (
          <div className="button-row">
            <a className="primary-button link-button" href="/setup">
              Start from Setup
            </a>
            <a className="secondary-button link-button" href="/ranking">
              View Ranking
            </a>
          </div>
        ) : (
          <p className="page-description">
            Please log in to play. Anonymous users can only read the instructions.
          </p>
        )}
      </section>
    </main>
  );
}


function ProtectedRoute(props) {
  const { loggedIn, checkingAuth } = useUser();

  if (checkingAuth) {
    return <p>Loading...</p>;
  }

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return props.children;
}

function NavigationBar() {
  const { user, loggedIn, logout } = useUser();

  async function handleLogout() {
    await logout();
  }

  return (
    <nav>
      <Link to="/">Home</Link>{" | "}

      {loggedIn ? (
        <>
          <Link to="/setup">Setup</Link>{" | "}
          <Link to="/ranking">Ranking</Link>{" | "}
          <span>{user.name}</span>{" "}
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </nav>
  );
}

function RankingPlaceholder() {
  return (
    <main>
      <h1>Ranking</h1>
      <p>Ranking page will be implemented next.</p>
    </main>
  );
}

function App() {
  return (
    <>
      <NavigationBar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginForm />} />

       <Route
         path="/ranking"
         element={
         <ProtectedRoute>
         <RankingPage />
        </ProtectedRoute>
         }
       />

            <Route
              path="/setup"
             element={
           <ProtectedRoute>
            <SetupPage />
          </ProtectedRoute>
            }
           />

              <Route
               path="/games/:gameId/planning"
               element={
             <ProtectedRoute>
             <PlanningPage />
             </ProtectedRoute>          
              }
             />

             <Route
             path="/games/:gameId/result"
             element={
            <ProtectedRoute>
            <ResultPage />
           </ProtectedRoute>
            }
            />

      </Routes>
    </>
  );
}

export default App;