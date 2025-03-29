import { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_BACKEND_URL

export const AuthProvider = ({ children }) => {
  // Initialize user from sessionStorage if available
  const [user, setUser] = useState(() => {
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(!sessionStorage.getItem('user'));
  const navigate = useNavigate();

  const fetchWithCredentials = async (endpoint, options = {}) => {
    // Get token from localStorage as fallback
    const token = localStorage.getItem('jwt_token');
    
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Add Authorization header as fallback if token exists
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      ...options
    };

    console.log(`Making request to: ${API_URL}${endpoint}`);
    console.log('Request options:', defaultOptions);
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, defaultOptions);
      
      // Log cookie information (for debugging only, remove in production)
      console.log('Cookies sent with request:', document.cookie);
      
      if (!response.ok) {
        const data = await response.text();
        console.error('Response error:', response.status, data);
        if (response.status === 401) {
          console.log('Unauthorized - clearing user state');
          setUser(null);
          localStorage.removeItem('jwt_token');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let ignoreRedirects = false;
    
    const verifyUser = async () => {
      try {
        // Check if we're returning from Google auth
        const urlParams = new URLSearchParams(window.location.search);
        const googleAuth = urlParams.get('auth') === 'google';
        const googleAuthInProgress = sessionStorage.getItem('googleAuthInProgress');
        
        if (googleAuth) {
          ignoreRedirects = true;
          // Clear the Google auth in progress flag
          sessionStorage.removeItem('googleAuthInProgress');
          
          // Immediately clear URL parameters to prevent refresh issues
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // If we have URL user data, use it immediately
          const urlUser = urlParams.get('user');
          if (urlUser) {
            try {
              const userData = JSON.parse(decodeURIComponent(urlUser));
              if (isMounted) {
                setUser(userData);
                setLoading(false);
                sessionStorage.setItem('user', JSON.stringify(userData));
              }
              return; // Skip further verification
            } catch (e) {
              console.error("Error parsing user data from URL", e);
            }
          }
        }
        
        const error = urlParams.get('error');
        if (error === 'auth_failed') {
          console.error('Google authentication failed');
          if (isMounted) setUser(null);
          if (isMounted) setLoading(false);
          navigate('/login');
          return;
        }

        const response = await fetchWithCredentials('/auth/check-auth');
        const data = await response.json();
        
        
        if (isMounted) {
          setUser(data);
          setLoading(false);
          
          // IMPORTANT: Store user in sessionStorage as a backup
          sessionStorage.setItem('user', JSON.stringify(data));
        }
        
        // Only handle redirects if not ignoring them
        if (!ignoreRedirects && !googleAuth) {
          const intendedPath = localStorage.getItem('intendedPath');
          if (intendedPath) {
            localStorage.removeItem('intendedPath');
            navigate(intendedPath);
          }
        }
      } catch (error) {
        console.error("Auth verification failed:", error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
          // Clear backup user data
          sessionStorage.removeItem('user');
        }
        
        // Only redirect if not ignoring redirects and not on non-auth paths
        const nonAuthPaths = ['/login', '/signup', '/'];
        if (!ignoreRedirects && !nonAuthPaths.includes(window.location.pathname)) {
          navigate('/login');
        }
      }
    };

    verifyUser();
    
    return () => {
      isMounted = false;
    };
  }, [navigate]);

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
      // Store token in localStorage if returned by backend
      if (data.token) {
        localStorage.setItem('jwt_token', data.token);
      }
      
      setUser({
        ...data,
        profilePicture: data.profilePicture
      });
      navigate("/dashboard");
      return data;
    } catch (error) {
      console.error('Login error:', error);
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
    try {
      // Store current path before redirect
      const currentPath = window.location.pathname;
      localStorage.setItem('intendedPath', currentPath === '/login' ? '/dashboard' : currentPath);
      
      // Set auth flow flag
      sessionStorage.setItem('googleAuthInProgress', 'true');      
      // Add timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      const googleAuthUrl = `${API_URL}/auth/google?t=${timestamp}`;
      
      // Use window.location.href for consistent behavior across platforms
      window.location.href = googleAuthUrl;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw new Error('Failed to initiate Google sign-in');
    }
  };

  // Add this function to handle Google auth callback
  const handleGoogleAuthCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('auth');
    const userInfo = urlParams.get('user');
    const token = urlParams.get('token'); // Get token from URL params

    if (authType === 'google' && userInfo) {
      try {
        const userData = JSON.parse(decodeURIComponent(userInfo));
        setUser(userData);
        
        // Store token if available
        if (token) {
          localStorage.setItem('jwt_token', token);
        }
        
        // Clean up URL
        window.history.replaceState({}, document.title, '/dashboard');
        
        // Clear auth flow flag
        sessionStorage.removeItem('googleAuthInProgress');
        
        return true;
      } catch (error) {
        console.error('Error handling Google auth callback:', error);
        return false;
      }
    }
    return false;
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
        handleGoogleAuthCallback,
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