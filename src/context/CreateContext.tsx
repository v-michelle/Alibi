import { supabase } from "@/lib/supabase/client";
import { createContext, useState, ReactNode, useContext,useEffect,useCallback } from "react";

export interface Category{
    id:number;
    name:string;
    group_name: string | null;
}

export interface Alibi{
   id:string;
   title:string;
   date:Date;
   postImage?: string;
   people?: string[];
   category_id:number|null;
   category?: {name:string}|null;

}
export interface NewAlibi {
  title: string;
  description?: string;
  occurred_at: string;
  image_paths?: string[];
  people?: string[];
  category_id?: number | null;
}

interface CreateContextType {
  alibis:Alibi[];
  categories: Category[];
  isLoading: boolean;
  refresh:()=> Promise<void>;
  addAlibi:(newAlibi:NewAlibi)=>Promise<void>;
  addCategory:(name:string)=>Promise<void>;
}

const CreateContext = createContext<CreateContextType | undefined>(undefined);

export const CreateProvider = ({ children }: { children: ReactNode }) => {
    const [alibis, setAlibis] = useState<Alibi[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    const refresh= useCallback(async ()=>{
        setIsLoading(true);
        const{data: posts, error: postsError}= await supabase
            .from("ailibi_posts")
            .select("*,categories(name)")
            .order("occured_at",{ascending:false});
        const{data:categories,error:categoryError}= await supabase
            .from("categories")
          .select("id,name,group_name")
            .order("group_name")
            .order("name");
        if(postsError) console.error("Loading alibis failed: ", postsError.message);
        if(categoryError) console.error("Loading categories failed: ", categoryError.message);
        setAlibis((posts as unknown as Alibi[])??[]);
        setCategories(categories??[]);
        setIsLoading(false);
    },[]);

    useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        refresh();
      } else {
        setAlibis([]);
        setCategories([]);
        setIsLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  

    const addAlibi = async (newAlibi: NewAlibi) => {
    const { error } = await supabase.from("alibi_posts").insert(newAlibi);
    if (error) throw error;
    await refresh(); // so the home page shows the new post
  };

  const addCategory = async (name: string) => {
    const { error } = await supabase
      .from("categories")
      .insert({ name: name.trim() });
    if (error) throw error;
    await refresh();
  };
  
  
    return (
    <CreateContext.Provider value={{ alibis,categories,refresh, isLoading,addAlibi ,addCategory}}>
        {children}
     </CreateContext.Provider>
    );
};


export const useCreate = () => {
    const context = useContext(CreateContext);
    if (context === undefined) {
        throw new Error("useCreate must be used within an CreateProvider");
    }
    return context;
};

