import { supabase } from "@/lib/supabase/client";
import { createContext, useState, ReactNode, useContext,useEffect,useCallback } from "react";

export interface Category{
    id:number;
    name:string;
    group_name: string | null;
}
export interface Person{
  id:number;
  name:string;
}

export interface Alibi{
   id:string;
   created_at:string;
   title:string;
   description: string|null;
   occurred_at: string;
   image_paths?: string[];
   category_id:number|null;
   category?: {name:string}|null;
   alibi_people?: {people:Person}[];

}
export interface NewAlibi {
  title: string;
  description?: string;
  occurred_at: string;
  image_paths?: string[];
  category_id?: number | null;
  person_ids: number[];
}

interface CreateContextType {
  alibis:Alibi[];
  categories: Category[];
  people:Person[];
  isLoading: boolean;
  refresh:()=> Promise<void>;
  addAlibi:(newAlibi:NewAlibi)=>Promise<void>;
  addCategory:(name:string)=>Promise<Category>;
  addPerson:(name:string) => Promise<Person>;
}

const CreateContext = createContext<CreateContextType | undefined>(undefined);

export const CreateProvider = ({ children }: { children: ReactNode }) => {
    const [alibis, setAlibis] = useState<Alibi[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    const refresh= useCallback(async ()=>{
        setIsLoading(true);
        const{data: posts, error: postsError}= await supabase
            .from("alibi_posts")
            .select("*, category:categories(name), alibi_people(people(id,name))")
            .order("occurred_at",{ascending:false});
        const{data:categories,error:categoryError}= await supabase
            .from("categories")
          .select("id,name,group_name")
            .order("group_name")
            .order("name");
        const{ data: ppl, error:pplError}= await supabase
          .from("people")
          .select("id, name")
          .order("name");
        if(postsError) console.error("Loading alibis failed: ", postsError.message);
        if(categoryError) console.error("Loading categories failed: ", categoryError.message);
        if(pplError) console.error("Loading people failed:", pplError.message);
        setAlibis((posts as unknown as Alibi[])??[]);
        setCategories(categories??[]);
        setPeople(ppl ?? []);
        setIsLoading(false);
    },[]);

    useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        refresh();
      } else {
        setAlibis([]);
        setCategories([]);
        setPeople([]);
        setIsLoading(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const addAlibi = async (newAlibi: NewAlibi) => {
    const { person_ids, ...post } = newAlibi;
    const { data, error } = await supabase
      .from("alibi_posts")
      .insert(post)
      .select("id")
      .single();
    if (error) throw error;

    if (person_ids.length > 0) {
      const { error: peopleError } = await supabase
        .from("alibi_people")
        .insert(person_ids.map((person_id) => ({ alibi_id: data.id, person_id })));
      if (peopleError) throw peopleError;
    }

    await refresh(); // so the home page shows the new post
  };

  const addCategory = async (name: string): Promise<Category> => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("You need to be logged in to add a category.");

    const { data,error } = await supabase
      .from("categories")
      .insert({ name: name.trim(), user_id: user.id })
      .select("id, name, group_name")
      .single();

    if (error) throw error;
    await refresh();
    return data;
  };
  const addPerson = async(name:string) => {
    const {data,error} = await supabase
      .from("people")
      .insert({name:name.trim()})
      .select("id, name")
      .single()
    if(error) throw error;
    setPeople((prev)=>[...prev,data].sort((a,b)=> a.name.localeCompare(b.name)));
    return data;
  }
  
    return (
    <CreateContext.Provider value={{ alibis,categories,people,refresh, isLoading,addAlibi ,addCategory,addPerson}}>
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

