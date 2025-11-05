import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { SignupFormData } from "../types/userTypes";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUpNewUser: (formData: SignupFormData) => Promise<{ success: boolean; data?: any; error?: string }>;
  signInUser: (credentials: {
    email: string;
    password: string;
  }) => Promise<{ success: boolean; data?: any; error?: string }>;
  signOut: () => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthResponse = {
  success: boolean;
  data?: any;
  error?: string;
};

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Sign up
  const signUpNewUser = async (formData: SignupFormData): Promise<AuthResponse> => {
    try {
      // Step 1: Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: formData.password,
      });

      if (authError) {
        console.error("Auth error:", authError, formData.email, formData.password);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: "No user data returned from signup" };
      }

      // Step 2: Complete the user profile
      const { error: profileError } = await supabase.rpc('complete_user_profile', {
        p_user_id: authData.user.id,
        p_user_type: formData.userType,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_student_number: formData.studentNumber || null,
        p_year_level: formData.yearLevel || null,
        p_program: formData.program || null,
        p_department: formData.department || null,
        p_employee_id: formData.employeeId || null,
        p_position: formData.position || null
      });

      if (profileError) {
        console.error("Profile error:", profileError.message);
        return { success: false, error: "Failed to create user profile" };
      }

      return { success: true, data: authData };
    } catch (err) {
      const error = err as Error;
      console.error("Unexpected error during sign up:", error.message);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  };

  // Log in
  const signInUser = async ({
    email,
    password
  }: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        console.error("Sign-in error:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      const error = err as Error;
      console.error("Unexpected error during sign-in:", error.message);
      return {
        success: false,
        error: "An unexpected error occurred. Please try again.",
      };
    }
  };

  // Sign out
  const signOut = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (err) {
      const error = err as Error;
      console.error("Error signing out:", error.message);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signUpNewUser,
        signInUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthContextProvider");
  }
  return context;
};