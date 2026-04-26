import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check local storage for persistent login on mount
    const token = localStorage.getItem("edgeiq_token");
    const storedUser = localStorage.getItem("edgeiq_user");
    
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      // Extract username from email or use email as username
      const username = email.split("@")[0];
      const response = await authAPI.login(username, password);
      
      if (response.success) {
        setIsAuthenticated(true);
        setUser(response.user);
        return response;
      } else {
        setError(response.error || "Login failed");
        return response;
      }
    } catch (err) {
      setError(err.message || "An error occurred");
      console.error("Login error:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, username) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await authAPI.register(email, password, username);
      
      if (response.success) {
        setIsAuthenticated(true);
        setUser(response.user);
        return response;
      } else {
        setError(response.error || "Registration failed");
        return response;
      }
    } catch (err) {
      setError(err.message || "An error occurred");
      console.error("Registration error:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await authAPI.logout();
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && localStorage.getItem("edgeiq_token")) {
    return null; // Or a loading spinner
  }

  return (
    <AuthContext.Provider 
      value={{ 
        isAuthenticated, 
        user,
        login, 
        register,
        logout,
        loading,
        error 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
