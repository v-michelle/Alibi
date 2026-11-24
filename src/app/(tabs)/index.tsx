import { useEffect, useRef, useState, useMemo } from "react";
import { Text, View, StyleSheet, TouchableOpacity, FlatList, ScrollView, Modal, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase/client";
import { useCreate, Alibi } from "@/context/CreateContext";
import { colors } from "@/lib/theme"
import { BrandActivityIndicator, BrandLogo } from "@/components/Branding";
import DateTimePicker from "@react-native-community/datetimepicker"

const BUCKET = "alibi-photos"; 
const EMPTY_PHOTO_PATHS: string[] = [];

// Turns stored file paths into temporary viewable URLs
function usePhotoUrls(paths: string[]) {
  const [urlState, setUrlState] = useState<{ paths: string[]; urls: string[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (paths.length === 0) return;

    supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          console.warn("Loading photos failed:", error?.message);
          return;
        }
        const signedUrls = data
          .filter(
            (d): d is { error: null; path: string; signedURL: string; signedUrl: string } =>
              !d.error && !!(d.signedUrl ?? d.signedURL),
          )
          .map((d) => d.signedUrl ?? d.signedURL)
          .filter((url): url is string => !!url);

        setUrlState({ paths, urls: signedUrls });
      });
    return () => {
      cancelled = true;
    };
  }, [paths]);

  return urlState?.paths === paths ? urlState.urls : [];
}

function PostCard({ post }: { post: Alibi }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = width - 40; 
  const photoHeight = cardWidth * 0.75;

  const paths = post.image_paths ?? EMPTY_PHOTO_PATHS;
  const photoUrls = usePhotoUrls(paths);
  const [page, setPage] = useState(0);

  const when = new Date(post.occurred_at);
  const dateText = when.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeText = when.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const names = (post.alibi_people ?? []).map((ap) => ap.people.name).join(", ");

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth));
  };

  return (
    <View style={styles.card}>
      {paths.length > 0 && (
        <View style={{ width: cardWidth, height: photoHeight }}>
          {photoUrls.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
            >
              {photoUrls.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{ width: cardWidth, height: photoHeight }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.photoPlaceholder} />
          )}
          {photoUrls.length > 1 && (
            <View style={styles.photoCount}>
              <Text style={styles.photoCountText}>
                {page + 1}/{photoUrls.length}
              </Text>
            </View>
          )}
        </View>
      )}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => router.push({ pathname: "/edit/[id]", params: { id: String(post.id) } } as any)}
        hitSlop={8}
      >
        <Ionicons name="create-outline" size={18} color={colors.navy} />
      </TouchableOpacity>

      <View style={styles.cardBody}>

        <Text style={[styles.cardTitle, paths.length === 0 && { paddingRight: 40 }]}>{post.title}</Text>
        
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.inkSoft} />
          <Text style={styles.metaText}>
            {dateText} · {timeText}
          </Text>
        </View>

        {post.category?.name && (
          <View style={styles.metaRow}>
            <Ionicons name="pricetag-outline" size={16} color={colors.inkSoft} />
            <Text style={styles.metaText}>{post.category.name}</Text>
          </View>
        )}

        {names !== "" && (
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={16} color={colors.inkSoft} />
            <Text style={styles.metaText}>With {names}</Text>
          </View>
        )}

        {!!post.description && <Text style={styles.description}>{post.description}</Text>}
      </View>
    </View>
  );
}

type DateBasis = "occurred_at" | "created_at";

type Filters = {
  basis: DateBasis;
  from: Date | null;
  to: Date | null;
  categoryIds: number[];
  personIds: number[];
};

const EMPTY_FILTERS: Filters = {
  basis: "occurred_at",
  from: null,
  to: null,
  categoryIds: [],
  personIds: [],
};

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const activeCount = (f: Filters) =>
  (f.from || f.to ? 1 : 0) + (f.categoryIds.length ? 1 : 0) + (f.personIds.length ? 1 : 0);

type Option = { id: number; name: string };

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={onPress}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function DateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
}) {
  return (
    <View style={styles.dateRow}>
      <Text style={styles.dateRowLabel}>{label}</Text>
      <View style={styles.dateRowRight}>
        {value ? (
          <DateTimePicker
            value={value}
            mode="date"
            maximumDate={new Date()}
            onValueChange={(_e, d) => onChange(d)}
            accentColor={colors.navy}
          />
        ) : (
          <TouchableOpacity onPress={() => onChange(new Date())}>
            <Text style={styles.anyText}>Any</Text>
          </TouchableOpacity>
        )}
        {value && (
          <TouchableOpacity onPress={() => onChange(null)} >
            <Ionicons name="close-circle" size={20} color={colors.inkSoft} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function FilterSheet({
  visible,
  onClose,
  filters,
  onApply,
  categoryOptions,
  personOptions,
}: {
  visible: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (f: Filters) => void;
  categoryOptions: Option[];
  personOptions: Option[];
}) {
  const [draft, setDraft] = useState<Filters>(filters);

  const toggle = (key: "categoryIds" | "personIds", id: number) =>
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key].includes(id) ? prev[key].filter((x) => x !== id) : [...prev[key], id],
    }));

  const apply = () => {
    // if the range is backwards, swap it
    const backwards = draft.from && draft.to && draft.from > draft.to;
    onApply({
      ...draft,
      from: backwards ? draft.to : draft.from,
      to: backwards ? draft.from : draft.to,
    });
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView edges={["top", "bottom"]} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.sheetClose}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Filter and sort by</Text>
            <View style={styles.segmented}>
              {(
                [
                  ["occurred_at", "Date of event"],
                  ["created_at", "Date posted"],
                ] as [DateBasis, string][]
              ).map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.segment, draft.basis === value && styles.segmentActive]}
                  onPress={() => setDraft((p) => ({ ...p, basis: value }))}
                >
                  <Text style={[styles.segmentText, draft.basis === value && styles.segmentTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DateRow label="From" value={draft.from} onChange={(d) => setDraft((p) => ({ ...p, from: d }))} />
            <DateRow label="To" value={draft.to} onChange={(d) => setDraft((p) => ({ ...p, to: d }))} />

            <Text style={styles.sectionLabel}>Categories</Text>
            {categoryOptions.length === 0 ? (
              <Text style={styles.hintText}>Categories you use on alibis will show up here.</Text>
            ) : (
              <View style={styles.chipWrap}>
                {categoryOptions.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    selected={draft.categoryIds.includes(c.id)}
                    onPress={() => toggle("categoryIds", c.id)}
                  />
                ))}
              </View>
            )}

            <Text style={styles.sectionLabel}>People</Text>
            {personOptions.length === 0 ? (
              <Text style={styles.hintText}>People you add to alibis will show up here.</Text>
            ) : (
              <View style={styles.chipWrap}>
                {personOptions.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    selected={draft.personIds.includes(p.id)}
                    onPress={() => toggle("personIds", p.id)}
                  />
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={() => setDraft(EMPTY_FILTERS)}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={apply}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}


export default function Index() {
  const router = useRouter();
  const { alibis, isLoading, refresh } = useCreate();

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterOpenKey, setFilterOpenKey] = useState(0);
  const filterCount = activeCount(filters);
  const openFilters = () => {
    setFilterOpenKey((key) => key + 1);
    setFilterVisible(true);
  };

  // Only offer categories and people that appear on at least one post
  const categoryOptions = useMemo(() => {
    const map = new Map<number, string>();
    alibis.forEach((a) => {
      if (a.category_id != null && a.category?.name) map.set(a.category_id, a.category.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [alibis]);

  const personOptions = useMemo(() => {
    const map = new Map<number, string>();
    alibis.forEach((a) =>
      (a.alibi_people ?? []).forEach((ap) => map.set(ap.people.id, ap.people.name))
    );
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [alibis]);

  const visiblePosts = useMemo(() => {
    const from = filters.from ? startOfDay(filters.from).getTime() : null;
    const to = filters.to ? endOfDay(filters.to).getTime() : null;

    return alibis
      .filter((a) => {
        const t = new Date(a[filters.basis]).getTime();
        if (from !== null && t < from) return false;
        if (to !== null && t > to) return false;
        if (
          filters.categoryIds.length > 0 &&
          (a.category_id == null || !filters.categoryIds.includes(a.category_id))
        )
          return false;
        if (
          filters.personIds.length > 0 &&
          !(a.alibi_people ?? []).some((ap) => filters.personIds.includes(ap.people.id))
        )
          return false;
        return true;
      })
      .sort((a, b) => new Date(b[filters.basis]).getTime() - new Date(a[filters.basis]).getTime());
  }, [alibis, filters]);

  // Redirect to create once if the user has no alibis at all (uses the unfiltered count)
  const redirected = useRef(false);
  useEffect(() => {
    if (!isLoading && alibis.length === 0 && !redirected.current) {
      redirected.current = true;
      router.push("/(tabs)/create");
    }
  }, [isLoading, alibis.length, router]);

  if (isLoading && alibis.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.center]} edges={["top", "bottom"]}>
        <BrandActivityIndicator size={54} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={visiblePosts}
        keyExtractor={(a) => String(a.id)}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refresh}
        ListHeaderComponent={
          <View style={styles.header}>

            <View style={styles.brandHeader}>
              <BrandLogo compact />
              <TouchableOpacity style={styles.filterButton} onPress={openFilters}>
                <Ionicons name="options-outline" size={22} color={colors.navy} />
                {filterCount > 0 && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>{filterCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>What have you done today?</Text>

            {filterCount > 0 && (
              <View style={styles.resultsRow}>
                <Text style={styles.resultsText}>
                  Showing {visiblePosts.length} of {alibis.length}
                </Text>
                <TouchableOpacity onPress={() => setFilters(EMPTY_FILTERS)}>
                  <Text style={styles.clearLink}>Clear filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          alibis.length > 0 ? (
            <View>
              <Text style={styles.emptyText}>No alibis match your filters.</Text>
              <TouchableOpacity onPress={() => setFilters(EMPTY_FILTERS)}>
                <Text style={[styles.clearLink, { textAlign: "center", marginTop: 8 }]}>
                  Clear filters
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.emptyText}>No alibis yet. Add your first one!</Text>
          )
        }
      />

      <FilterSheet
        key={filterOpenKey}
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={setFilters}
        categoryOptions={categoryOptions}
        personOptions={personOptions}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.parchment
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontFamily: 'ui-serif',
    fontSize: 32,
    fontWeight: "bold",
    color: colors.navy,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'ui-serif',
    fontSize: 16,
    color: colors.inkSoft,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: "center",
    color: colors.inkSoft,
    marginTop: 20,
    fontFamily: 'ui-serif',
    fontStyle: 'italic',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.paper,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  photoCount: {
    position: "absolute",
    bottom: 10,  
    right: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  photoCountText: {
    color: colors.parchment,
    fontSize: 12,
    fontWeight: "600",
  },
  editButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.parchment,
    borderWidth:1,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  cardBody: {
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontFamily: "ui-serif",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    color: colors.navy
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: colors.inkSoft,
    flexShrink: 1,
  },
  description: {
    fontFamily: "ui-serif",
    fontSize: 15,
    color: colors.navy,
    lineHeight: 22,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.paper,
  },
  brandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  filterButton: {
    width: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    height: 42,
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700",
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  resultsText: {
    color: colors.inkSoft,
    fontSize: 14,
  },
  clearLink: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline"
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: colors.scrim
  },
  sheet: {
    backgroundColor: colors.parchment,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: 'ui-serif',
    fontSize: 20,
    fontWeight: "700",
    color: colors.navy,
  },
  sheetClose: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.navy,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.inkSoft,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.card,
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 15,
    color: colors.inkSoft,
  },
  segmentTextActive: {
    color: colors.navy,
    fontWeight: "600",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  dateRowLabel: {
    fontFamily: 'ui-serif',
    fontSize: 16,
    color: colors.navy
  },
  dateRowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  anyText: {
    fontSize: 16,
    color: colors.navy,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.paper,
  },
  chipSelected: {
    backgroundColor: colors.navy,
  },
  chipText: {
    fontSize: 14,
    color: colors.navy,
  },
  chipTextSelected: {
    color: colors.parchment,
    fontWeight: "600",
  },
  hintText: {
    color: colors.inkSoft,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
  },
  resetButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: 12,
    alignItems: "center",
  },
  resetText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.navy,
  },
  applyButton: {
    flex: 2,
    borderRadius: 12,
    backgroundColor: colors.navy,
    padding: 12,
    alignItems: "center",
  },
  applyText: {
    color: colors.parchment,
    fontSize: 16,
    fontWeight: "bold",
  },

});