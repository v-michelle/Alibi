import { useState } from "react";
import { router } from "expo-router";
import { uploadAlibiPhotos } from "@/lib/supabase/storage";
import { useCreate } from "@/context/CreateContext";
import AlibiForm from "@/components/AlibiForm";

export default function Create() {
  const { addAlibi } = useCreate();
  const [formKey, setFormKey] = useState(0);

 return (
  //from alibiForm
    <AlibiForm
      key={formKey}
      heading="New alibi"
      subheading="Fill in the details for your new alibi."
      submitLabel="Add a new alibi"
      onSubmit={async (v) => {
        const image_paths = await uploadAlibiPhotos(v.photos);
        await addAlibi({
          title: v.title,
          description: v.description || undefined,
          occurred_at: v.date.toISOString(),
          image_paths,
          category_id: v.category?.id ?? null,
          person_ids: v.people.map((p) => p.id),
        });
        setFormKey((k) => k + 1); // resets the form for next post.
        router.back();
      }}
    />
  );
}
