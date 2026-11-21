import { supabase } from "@/lib/supabase/client";
import { createContext, useState, ReactNode, useContext,useEffect,useCallback } from "react";

export interface Category{
    id:number;
    name:string;
    group_name: string | null;
    user_id: string | null;
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
  description?: string |null;
  occurred_at: string;
  image_paths?: string[];
  category_id?: number | null;
  person_ids?: number[];
}

interface CreateContextType {
  alibis:Alibi[];
  categories: Category[];
  people:Person[];
  isLoading: boolean;
  refresh:()=> Promise<void>;
  addAlibi:(newAlibi:NewAlibi)=>Promise<void>;
  addCategory:(name:string)=>Promise<Category>;
  updateCategory:(id:number,name:string)=>Promise<void>;
  addPerson:(name:string) => Promise<Person>;
  updatePerson:(id:number,name:string)=>Promise<void>;
  updateAlibi: (id: string, changes: NewAlibi) => Promise<void>;
  deleteAlibi: (id:string) => Promise<void>;
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
          .select("id,name,group_name,user_id")
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
    const { person_ids = [], ...post } = newAlibi;
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

  const updateAlibi = async (id: string, {person_ids = [], ...changes}: NewAlibi) => {
    const{error} = await supabase.from("alibi_posts").update(changes).eq("id",id);
    if(error) throw error;

    const current = alibis.find((a) => a.id === id)?.alibi_people?.map((ap) => ap.people.id) ?? [];
    const toRemove = current.filter ((pid) => !person_ids.includes(pid));
    const toAdd = person_ids.filter((pid) => !current.includes(pid));

    if(toRemove.length>0){
      const{error : delError} = await supabase
        .from("alibi_people").delete().eq("alibi_id",id).in("person_id", toRemove);
        if(delError) throw delError;
    }
    if(toAdd.length>0){
      const {error:addError}= await supabase
        .from("alibi_people").insert(toAdd.map((person_ids)=> ({alibi_id:id,person_ids})));
      if(addError) throw addError;
    }
    await refresh();
  };

const deleteAlibi = async (id: string) => {
  const paths = alibis.find((a) => a.id === id)?.image_paths ?? [];

  // the alibi_people rows delete themselves (on delete cascade)
  const { error } = await supabase.from("alibi_posts").delete().eq("id", id);
  if (error) throw error;

  // remove the photos from storage too
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("alibi-photos").remove(paths);
    if (storageError) console.warn("Deleting photos failed:", storageError.message);
  }

  setAlibis((prev) => prev.filter((a) => a.id !== id));
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
      .select("id, name, group_name, user_id")
      .single();

    if (error) throw error;
    await refresh();
    return data;
  };
  const updateCategory = async (id: number, name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("Category name cannot be empty.");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error("You need to be logged in to edit a category.");

    const { data, error } = await supabase
      .from("categories")
      .update({ name: normalizedName })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, group_name, user_id")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Only categories you created can be edited.");

    setCategories((prev) =>
      prev
        .map((category) => (category.id === id ? data : category))
        .sort(
          (a, b) =>
            (a.group_name ?? "").localeCompare(b.group_name ?? "") ||
            a.name.localeCompare(b.name),
        ),
    );
    setAlibis((prev) =>
      prev.map((alibi) =>
        alibi.category_id === id
          ? {
              ...alibi,
              category: alibi.category
                ? { ...alibi.category, name: normalizedName }
                : { name: normalizedName },
            }
          : alibi,
      ),
    );
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

  const updatePerson = async (id: number, name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("Person name cannot be empty.");

    const { data, error } = await supabase
      .from("people")
      .update({ name: normalizedName })
      .eq("id", id)
      .select("id, name")
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This person could not be found or edited.");

    setPeople((prev) =>
      prev
        .map((person) => (person.id === id ? data : person))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    setAlibis((prev) =>
      prev.map((alibi) => ({
        ...alibi,
        alibi_people: alibi.alibi_people?.map(({ people: person }) => ({
          people: person.id === id ? { ...person, name: normalizedName } : person,
        })),
      })),
    );
  };
  
    return (
    <CreateContext.Provider value={{ alibis,categories,people,refresh, isLoading,addAlibi ,addCategory,updateCategory,addPerson,updatePerson, updateAlibi, deleteAlibi}}>
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

