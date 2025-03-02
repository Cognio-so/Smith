import { createContext, useState, useContext, useEffect } from "react"
import { useNavigate } from "react-router-dom"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // Check auth status on mount and when user changes
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const res = await fetch("https://smith-backend-js.vercel.app/auth/check", {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
        })
        
        if (res.ok) {
          const data = await res.json()
          setUser(data)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Auth verification failed:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    verifyUser()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const res = await fetch("https://smith-backend-js.vercel.app/auth/check", {
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      })
      
      if (!res.ok) {
        throw new Error("Auth check failed")
      }

      const data = await res.json()
      setUser(data)
      
    } catch (error) {
      console.error("Auth check failed:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const res = await fetch("https://smith-backend-js.vercel.app/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message)
    }

    setUser(data)
    navigate("/dashboard") // Redirect to dashboard after login
    return data
  }

  const signup = async (name, email, password) => {
    const res = await fetch("https://smith-backend-js.vercel.app/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.message)
    }

    setUser(data)
    navigate("/dashboard") // Redirect to dashboard after signup
    return data
  }

  const logout = async () => {
    try {
      await fetch("https://smith-backend-js.vercel.app/auth/logout", {
        method: "POST",
        credentials: "include",
      })
      setUser(null)
      navigate("/login")
    } catch (error) {
      console.error("Logout failed:", error)
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