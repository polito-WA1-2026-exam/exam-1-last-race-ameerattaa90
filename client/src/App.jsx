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
    <main>
      <h1>Last Race</h1>

      <p>
        Plan a route through the underground network before time runs out.
      </p>

      {loggedIn ? (
        <p>You are logged in. Game pages will be added next.</p>
      ) : (
        <p>Please log in to play.</p>
      )}
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