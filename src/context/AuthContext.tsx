import { supabase } from "@/lib/supabase/client";
import { createContext, useState, ReactNode, useContext,useEffect } from "react";

export interface User{
    id: string;
    name: string;
    email: string;
    username: string;
    profileImage?: string;
    onboardingCompleted?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };
    const checkSession = async () => {
        setIsLoading(true);
        try{
            const{
                data: {session},
            } = await supabase.auth.getSession();
            if(session?.user){
                const profile = await fetchUserProfile(session.user.id);
                setUser(profile);
            }else{
                setUser(null);
            }
        }catch(error){
            console.error("Error checking session:", error);
            setUser(null);
        }finally{
            setIsLoading(false);
        }
    };

    const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const authUser = await supabase.auth.getUser();
      if (!authUser.data.user) {
        console.error("No auth user found");
        return null;
      }

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        return null;
      }

      if (!data) {
        return {
          id: userId,
          name: "",
          username: "",
          email: authUser.data.user.email || "",
          onboardingCompleted: false,
        };
      }

      const profileData = data as Record<string, any>;
      const onboardingStatus =
        profileData.onboarding_completed ??
        profileData.onboarding_complete ??
        false;

      return {
        id: profileData.id,
        name: profileData.name ?? "",
        username: profileData.username ?? "",
        email: authUser.data.user.email || "",
        profileImage: profileData.profile_image_url,
        onboardingCompleted: data.onboarding_completed,
      };
    } catch (error) {
      console.error("Error in fetchUserProfile:", error);
      return null;
    }
  };
    


    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        if (data.user) {
            const profile = await fetchUserProfile(data.user.id);
            setUser(profile ?? {
              id: data.user.id,
              name: "",
              username: "",
              email: data.user.email ?? "",
              onboardingCompleted: false,
            });
        }
    };

    const signUp = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            
        });

        if (error) throw error;
        if (!data.user) {
            throw new Error("No user returned from Supabase signup.");
        }

        const profile = await fetchUserProfile(data.user.id);
        setUser(profile ?? {
          id: data.user.id,
          name: "",
          username: "",
          email: data.user.email ?? "",
          onboardingCompleted: false,
        });
    };

    const updateUser = async (userData: Partial<User>) => {
        if (!user) return;
        try{
            const updateData: Record<string, any> = {
                id: user.id,
            };
            if(userData.name !== undefined) updateData.name = userData.name;
            if(userData.username !== undefined) updateData.username = userData.username;
            if(userData.profileImage !== undefined) updateData.profile_image_url = userData.profileImage;
            if(userData.onboardingCompleted !== undefined) {
                updateData.onboarding_completed = userData.onboardingCompleted;
            }

            const { error, data } = await supabase
                .from("profiles")
                .update(updateData)
                .eq("id", user.id)
                .select()
                .single();

            if(error) throw error;
            if(data){
                console.log(data);
                const profile = await fetchUserProfile(user.id);
                setUser(profile);
            }
        }
            catch(error){
                console.error("Error updating user:", error);
                throw error;
            }
        };
    return (
    <AuthContext.Provider value={{ user, signUp, updateUser, isLoading, signIn, signOut }}>
        {children}
     </AuthContext.Provider>
    );
};


export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};