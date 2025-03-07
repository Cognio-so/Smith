import { createContext, useState, useContext, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const AuthContext = createContext()

const API_URL = 'https://smith-backend-psi.vercel.app'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Updated fetch configuration
  const fetchWithCredentials = async (endpoint, options = {}) => {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      ...options
    }

    try {
      const response = await fetch(`${API_URL}${endpoint}`, defaultOptions)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Network error' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      return response
    } catch (error) {
      console.error('Fetch error:', error)
      throw error
    }
  }

  // Check auth status on mount and when user changes
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const response = await fetchWithCredentials('/auth/check')
        const data = await response.json()
        setUser(data)
      } catch (error) {
        console.error("Auth verification failed:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    verifyUser()
    
    // Check for Google auth redirect
    const checkGoogleAuthRedirect = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      
      if (error === 'auth_failed') {
        console.error('Google authentication failed');
      }
    }
    
    checkGoogleAuthRedirect();
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetchWithCredentials('/auth/check')
      const data = await response.json()
      setUser(data)
    } catch (error) {
      console.error("Auth check failed:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await fetchWithCredentials('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      
      const data = await response.json()
      setUser(data)
      navigate("/dashboard")
      return data
    } catch (error) {
      throw new Error(error.message || 'Login failed')
    }
  }

  const signup = async (name, email, password) => {
    try {
      const response = await fetchWithCredentials('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      })
      
      const data = await response.json()
      setUser(data)
      navigate("/dashboard")
      return data
    } catch (error) {
      throw new Error(error.message || 'Signup failed')
    }
  }

  const logout = async () => {
    try {
      await fetchWithCredentials('/auth/logout', { method: 'POST' })
      setUser(null)
      navigate("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }
  
  // Google Sign-In Method (this is correct)
  const signInWithGoogle = () => {
    try {
        // Store the current URL to redirect back after login
        sessionStorage.setItem('redirectUrl', window.location.pathname);
        
        const googleAuthUrl = new URL('/auth/google', API_URL).toString();
        window.location.href = googleAuthUrl;
    } catch (error) {
        console.error('Google sign-in error:', error);
        // Handle the error appropriately in your UI
    }
  }

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
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
} 