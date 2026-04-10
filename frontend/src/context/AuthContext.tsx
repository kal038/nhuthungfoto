import { supabase } from '@/lib/supabase'
import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'

//first define the context shape
//then create context obj
//define provider component that contains states and methods, return a jsx that wraps children within context provider
//create a custom useAuth() hook that consumes the context and throws an error if used outside of the provider

type AuthContextShape = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextShape | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    //supabase client like to return error field instead of throwing error
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    setSession(data.session)
    setUser(data.user)
    return { error: null }
  }

  const signUp = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error }
    setSession(data.session)
    setUser(data.user)
    return { error: null }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) return { error }
    setSession(null)
    setUser(null)
    return { error: null }
  }

  useEffect(() => {
    const getInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession() //getSession() checks browser
      if (error) return { error }
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
      return { error: null }
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
