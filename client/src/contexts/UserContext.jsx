import { createContext, useContext, useEffect, useState } from "react";
import API from "../API.js";

const UserContext = createContext();

function UserProvider(props) {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    API.getCurrentUser()
      .then((user) => {
        setUser(user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  async function login(credentials) {
    const user = await API.logIn(credentials);
    setUser(user);
    return user;
  }

  async function logout() {
    await API.logOut();
    setUser(null);
  }

  const value = {
    user,
    loggedIn: user !== null,
    checkingAuth,
    login,
    logout,
  };

  return (
    <UserContext.Provider value={value}>
      {props.children}
    </UserContext.Provider>
  );
}

function useUser() {
  return useContext(UserContext);
}

export { UserProvider, useUser };