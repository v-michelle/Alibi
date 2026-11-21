import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase/client";
import { uploadAlibiPhotos } from "@/lib/supabase/storage";
import { useCreate } from "@/context/CreateContext";
import AlibiForm, { AlibiFormValues, FormPhoto } from "@/components/AlibiForm";
import { BrandActivityIndicator } from "@/components/Branding";
import {colors} from "@/lib/theme"

const BUCKET = "alibi-photos";

export default function EditAlibi() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { alibis, categories, isLoading, updateAlibi,deleteAlibi } = useCreate();

  const post = alibis.find((a) => String(a.id) === id);
  const [photos, setPhotos] = useState<FormPhoto[] | null>(null);
    const [deleting, setDeleting] = useState(false);
  // Load viewable URLs for the photos already saved on this post
  useEffect(() => {
    if (!post) return;
    const paths = post.image_paths ?? [];
    if (paths.length === 0) {
      setPhotos([]);
      return;
    }
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600)
      .then(({ data, error }) => {
        if (error) console.warn("Loading alibi photos failed:", error.message);
        // keep every path even if a URL failed, so saving never drops a photo by accident
        setPhotos(paths.map((path, i) => ({
          path,
          uri: data?.[i]?.signedUrl ?? data?.[i]?.signedURL ?? "",
        })));
      })
      .catch((error: unknown) => {
        console.error("Loading alibi photos failed:", error);
        setPhotos(paths.map((path) => ({ path, uri: "" })));
      });
  }, [post?.id]);

  if (!post) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
        {isLoading || deleting ? (
          <BrandActivityIndicator />
        ) : (
          <>
            <Text style={{ fontFamily: "ui-serif", color: colors.navy }}>This alibi couldn't be found.</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={{ color: colors.navy, fontWeight: "600" }}>Go back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  if (!photos) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.parchment  }}>
        <BrandActivityIndicator />
      </View>
    );
  }

  const handleSave = async (v: AlibiFormValues) => {
    // upload only the newly added photos, keeping the original order
    const newOnes = v.photos.filter((p) => !p.path);
    const uploaded = newOnes.length > 0 ? await uploadAlibiPhotos(newOnes) : [];
    let next = 0;
    const image_paths = v.photos.map((p) => p.path ?? uploaded[next++]);

    await updateAlibi(post.id, {
      title: v.title,
      description: v.description || null,
      occurred_at: v.date.toISOString(),
      image_paths,
      category_id: v.category?.id ?? null,
      person_ids: v.people.map((p) => p.id),
    });

    // clean up photos the user removed (after the update succeeded)
    const removed = (post.image_paths ?? []).filter((p) => !image_paths.includes(p));
    if (removed.length > 0) {
      await supabase.storage.from(BUCKET).remove(removed);
    }

    router.back();
  };
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAlibi(post.id);
      router.back();
    } catch (error) {
      setDeleting(false);
      throw error; // the form shows the error message
    }
  };


  return (
    <AlibiForm
      heading="Edit alibi"
      submitLabel="Save changes"
      onCancel={() => router.back()}
      onSubmit={handleSave}
      onDelete={handleDelete}
      initial={{
        title: post.title,
        description: post.description ?? "",
        date: new Date(post.occurred_at),
        photos,
        category: categories.find((c) => c.id === post.category_id) ?? null,
        people: (post.alibi_people ?? []).map((ap) => ap.people),
      }}
    />
  );
}