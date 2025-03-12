import { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

const API_URL = 'https://smith-backend-psi.vercel.app';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWithCredentials = async (endpoint, options = {}) => {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      ...options
    };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, defaultOptions);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const verifyUser = async () => {
      try {
        // Check for token in URL (Google redirect fallback)
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const error = urlParams.get('error');

        if (error === 'auth_failed') {
          console.error('Google authentication failed');
          setUser(null);
          setLoading(false);
          return;
        }

        if (token) {
          // Set cookie manually if received via URL
          document.cookie = `jwt=${token}; path=/; max-age=${30 * 24 * 60 * 60}; ${process.env.NODE_ENV === "production" ? 'secure; samesite=none' : 'samesite=lax'}`;
          // Clear URL params to prevent reuse
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const response = await fetchWithCredentials('/auth/check-auth');
        const data = await response.json();
        setUser(data);
      } catch (error) {
        console.error("Auth verification failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetchWithCredentials('/auth/check-auth');
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await fetchWithCredentials('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      setUser(data);
      navigate("/dashboard");
      return data;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const signup = async (name, email, password) => {
    try {
      const response = await fetchWithCredentials('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await response.json();
      setUser(data);
      navigate("/dashboard");
      return data;
    } catch (error) {
      throw new Error(error.message || 'Signup failed');
    }
  };

  const logout = async () => {
    try {
      await fetchWithCredentials('/auth/logout', { method: 'POST' });
      setUser(null);
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  const signInWithGoogle = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        checkAuthStatus,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};