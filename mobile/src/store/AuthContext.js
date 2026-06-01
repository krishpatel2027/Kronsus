import React, { createContext, useState, useEffect } from 'react';
import { storeTokens, removeTokens, getAccessToken } from '../services/api';

export const AuthContext = createContext({
  token: null,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const stored = await getAccessToken();
        if (stored) setToken(stored);
      } catch (e) {
        console.error('Failed to load token', e);
      }
    };
    loadToken();
  }, []);

  const signIn = async (access, refresh) => {
    await storeTokens({ access, refresh });
    setToken(access);
  };

  const signOut = async () => {
    await removeTokens();
    setToken(null);
  };

  const signUp = async (access, refresh) => {
    await signIn(access, refresh);
  };

  return (
    <AuthContext.Provider value={{ token, signIn, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
};
