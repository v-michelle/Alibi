import { useMemo, useState } from "react";
import {
    Text,
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    Modal,
    KeyboardAvoidingView,
    FlatList,
    ScrollView,
    SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import DateTimePicker, { DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Category, Person, useCreate } from "@/context/CreateContext";

export type FormPhoto = { uri: string; path?: string };

export type AlibiFormValues = {
    title: string;
    description: string;
    date: Date;
    photos: FormPhoto[];
    category: Category | null;
    people: Person[];
};

type AlibiFormProps = {
    heading: string;
    subheading?: string;
    submitLabel: string;
    initial?: Partial<AlibiFormValues>;
    onSubmit: (values: AlibiFormValues) => Promise<void>;
    onCancel?: () => void;
};

const MAX_PHOTOS = 5;

function usePhotoPicker(initial: FormPhoto[]) {
    const [photos, setPhotos] = useState<FormPhoto[]>(initial);
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "You need to grant permission to access the media library.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsMultipleSelection: true,
            selectionLimit: MAX_PHOTOS - photos.length,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            const picked = result.assets.map((a) => ({ uri: a.uri }));
            setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS));
        }
    };
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "You need to grant permission to access the camera.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0];
            setPhotos((prev) => [...prev, { uri: a.uri }].slice(0, MAX_PHOTOS));
        }
    };
    const showImagePicker = () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert("Limit reached", `You can add up to ${MAX_PHOTOS} photos.`, [
                { text: "Edit Photos", onPress: () => { close } },
                { text: "Cancel", style: "cancel" },
            ]);
            return;
        } else {
            Alert.alert("Add photos", "Choose an option", [
                { text: "Camera", onPress: takePhoto },
                { text: "Photo Library", onPress: () => pickImage() },
                { text: "Cancel", style: "cancel" },
            ]);
        }
    };

    const removePhoto = (index: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    return { photos, showImagePicker, removePhoto }
}

function FormRow({
    icon,
    label,
    value,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.input} onPress={onPress}>
            <View style={{ flexDirection: "row" }}>
                <Ionicons name={icon} style={styles.icon} />
                <Text>{label}</Text>
            </View>
            <View style={styles.rowRight}>
                {!!value && (
                    <Text style={[styles.countText, { maxWidth: 140 }]} numberOfLines={1}>
                        {value}
                    </Text>
                )}
                <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
            </View>
        </TouchableOpacity>
    );
}

function DateField({ date, onChange }: { date: Date; onChange: (d: Date) => void }) {
    return (
        <View style={styles.input}>
            <View style={{ flexDirection: "row" }}>
                <Ionicons name="calendar-outline" style={styles.icon} />
                <Text>Date</Text>
            </View>
            <View style={styles.dateTime}>
                <DateTimePicker
                    value={date}
                    mode="date"
                    maximumDate={new Date()}
                    onValueChange={(_e, selected) => onChange(selected)}
                />
                <DateTimePicker
                    value={date}
                    mode="time"
                    onValueChange={(_e, selected) => onChange(selected)}
                />
            </View>
        </View>
    );
}

function PhotoSheet({
    visible,
    photos,
    onClose,
    onRemove,
    onAddMore,
}: {
    visible: boolean;
    photos: FormPhoto[];
    onClose: () => void;
    onRemove: (index: number) => void;
    onAddMore: () => void;
}) {
    const confirmRemove = (index: number) => {
        Alert.alert(
            "Are you sure you want to delete this photo?",
            "This photo will be permanently deleted from your account.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    style: "destructive",
                    onPress: () => onRemove(index),
                },
            ],
        );
    };
    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <SafeAreaView edges={["bottom"]} style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Your photos</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.sheetDone}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.photoGrid}>
                        {photos.map((photo, index) => (
                            <View key={photo.path ?? photo.uri} style={styles.photoCell}>
                                <Image
                                    source={{ uri: photo.uri }}
                                    style={styles.photoThumb}
                                    contentFit="cover"
                                />
                                <TouchableOpacity
                                    style={styles.removeBadge}
                                    onPress={() => confirmRemove(index)}
                                >
                                    <Ionicons name="close" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {photos.length < MAX_PHOTOS && (
                            <TouchableOpacity style={[styles.photoCell, styles.addTile]} onPress={onAddMore}>
                                <Ionicons name="add" size={32} color="#666" />
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

function CategorySheet({
    visible,
    onClose,
    selected,
    onSelect,
}: {
    visible: boolean;
    onClose: () => void;
    selected: Category | null;
    onSelect: (c: Category | null) => void;
}) {
    const { categories, addCategory } = useCreate();
    const [query, setQuery] = useState("");
    const [adding, setAdding] = useState(false);

    const trimmedQuery = query.trim();
    const exactMatch = categories.find((c) => c.name.toLowerCase() === trimmedQuery.toLowerCase());
    const canAdd = trimmedQuery.length > 0 && !exactMatch;

    const sections = useMemo(() => {
        const query = trimmedQuery.toLowerCase();
        const groups = new Map<string, Category[]>();
        for (const c of categories) {
            if (!c.name.toLowerCase().includes(query)) continue;
            const key = c.group_name ?? "My categories";
            groups.set(key, [...(groups.get(key) ?? []), c]);
        }
        const groupRank = (title: string) => {
            if (title === "My categories") return 0;
            if (title === "Other") return 2;
            return 1;
        };

        return Array.from(groups.entries())
            .map(([title, data]) => ({
                title,
                data: data.sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort(
                (a, b) =>
                    groupRank(a.title) - groupRank(b.title) ||
                    a.title.localeCompare(b.title),
            );
    }, [categories, trimmedQuery]);
    const close = () => {
        setQuery("");
        onClose();
    };
    const choose = (c: Category) => {
        onSelect(selected?.id === c.id ? null : c);
        close();
    };

    const handleAdd = async () => {
        if (!canAdd || adding) return;
        setAdding(true);
        try {
            const created = await addCategory(trimmedQuery);
            onSelect(created);
            close();
        } catch (error) {
            Alert.alert("Couldn't add category", error instanceof Error ? error.message : "Please try again.");
        } finally {
            setAdding(false);
        }
    };
    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={close}
        ><KeyboardAvoidingView
            style={styles.backdrop}>
                <SafeAreaView edges={["bottom"]} style={[styles.sheet, styles.tallSheet]}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Categories</Text>
                        <TouchableOpacity onPress={close}>
                            <Text style={styles.sheetDone}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#888" />
                        <TextInput
                            placeholder="Search or add a category"
                            placeholderTextColor="#888"
                            value={query}
                            onChangeText={setQuery}
                            autoCorrect={false}
                            style={styles.searchInput}
                        />
                    </View>
                    <SectionList
                        sections={sections}
                        keyExtractor={(c) => String(c.id)}
                        keyboardShouldPersistTaps="handled"
                        stickySectionHeadersEnabled={false}
                        ListHeaderComponent={
                            canAdd ? (
                                <TouchableOpacity
                                    style={styles.addRow}
                                    onPress={handleAdd}
                                    disabled={adding}
                                >
                                    <Ionicons name="add-circle-outline" size={22} color="#2B3FD6" />
                                    <Text style={styles.addRowText}>
                                        {adding ? "Adding..." : `Add "${trimmedQuery}"`}
                                    </Text>
                                </TouchableOpacity>
                            ) : undefined
                        }
                        ListEmptyComponent={
                            !canAdd ? (
                                <Text style={styles.emptyText}>No categories found</Text>
                            ) : undefined
                        }
                        renderSectionHeader={({ section }) => (
                            <Text style={styles.sectionHeader}>
                                {section.title}
                            </Text>
                        )}
                        renderItem={({ item }) => {
                            const isSelected = item.id === selected?.id;
                            return (
                                <TouchableOpacity
                                    style={styles.listRow}
                                    onPress={() => choose(item)}
                                >
                                    <Text style={[styles.listRowText, selected && styles.listRowTextSelected,]}>
                                        {item.name}
                                    </Text>
                                    {isSelected && <Ionicons name="checkmark" size={20} color="#2B3FD6" />}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}
function PeopleSheet({
    visible,
    onClose,
    selected,
    onChange,
}: {
    visible: boolean;
    onClose: () => void;
    selected: Person[];
    onChange: (people: Person[]) => void;
}) {
    const { people, addPerson } = useCreate();
    const [query, setQuery] = useState("");
    const [adding, setAdding] = useState(false);

    const trimmedQuery = query.trim();
    const canAdd =
        trimmedQuery.length > 0 &&
        !people.some((p) => p.name.toLowerCase() === trimmedQuery.toLowerCase());

    const filtered = useMemo(() => {
        const q = trimmedQuery.toLowerCase();
        return people.filter((p) => p.name.toLowerCase().includes(q));
    }, [people, trimmedQuery])

    const close = () => {
        setQuery("");
        onClose();
    };

    const toggle = (p: Person) => {
        onChange(selected.some((x) => x.id === p.id) ? selected.filter((x) => x.id !== p.id) : [...selected, p]);
    };

    const handleAdd = async () => {
        if (!canAdd || adding) return;
        setAdding(true);
        try {
            const created = await addPerson(trimmedQuery);
            onChange([...selected, created]);
            setQuery("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Please try again.";
            Alert.alert("Couldn't add person", message);
        } finally {
            setAdding(false);
        }
    };
    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={close}
        ><KeyboardAvoidingView style={styles.backdrop}>

                <SafeAreaView
                    edges={["top", "bottom"]}
                    style={[styles.sheet, styles.tallSheet]}
                >
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Who did you go with?</Text>
                        <TouchableOpacity onPress={close}>
                            <Text style={styles.sheetDone}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#888" />
                        <TextInput
                            placeholder="Search or add a name"
                            placeholderTextColor="#888"
                            value={query}
                            onChangeText={setQuery}
                            autoCorrect={false}
                            style={styles.searchInput}
                        />
                    </View>

                    <FlatList
                        data={filtered}
                        keyExtractor={(person) => String(person.id)}
                        keyboardShouldPersistTaps="handled"
                        ListHeaderComponent={
                            canAdd ? (
                                <TouchableOpacity
                                    style={styles.addRow}
                                    onPress={handleAdd}
                                    disabled={adding}
                                >
                                    <Ionicons name="person-add-outline" size={22} color="#2B3FD6" />
                                    <Text style={styles.addRowText}>
                                        {adding
                                            ? "Adding..."
                                            : `Add "${trimmedQuery}"`}
                                    </Text>
                                </TouchableOpacity>
                            ) : undefined
                        }
                        ListEmptyComponent={
                            !canAdd ? (
                                <Text style={styles.emptyText}>
                                    {people.length === 0
                                        ? "No saved people yet. Type a name to add"
                                        : "No one found."}
                                </Text>
                            ) : undefined
                        }
                        renderItem={({ item }) => {
                            const isSelected = selected.some(
                                (person) => person.id === item.id,
                            );
                            return (
                                <TouchableOpacity style={styles.listRow} onPress={() => toggle(item)} >
                                    <Text style={[styles.listRowText, selected && styles.listRowTextSelected,]}>
                                        {item.name}
                                    </Text>
                                    <Ionicons
                                        name={
                                            isSelected
                                                ? "checkmark-circle"
                                                : "ellipse-outline"
                                        }
                                        size={22}
                                        color={selected ? "#293edb" : "#bbb"}
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />
                </SafeAreaView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

export default function AlibiForm({
    heading,
    subheading,
    submitLabel,
    initial,
    onSubmit,
    onCancel,
}: AlibiFormProps) {
    // Form values (initial values are only read on the first render)
    const [title, setTitle] = useState(initial?.title ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [date, setDate] = useState(initial?.date ?? new Date());
    const [category, setCategory] = useState<Category | null>(initial?.category ?? null);
    const [selectedPeople, setSelectedPeople] = useState<Person[]>(initial?.people ?? []);
    const { photos, showImagePicker, removePhoto } = usePhotoPicker(initial?.photos ?? []);
    const [saving, setSaving] = useState(false);

    // Which modal is open
    const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
    const [peopleSheetOpen, setPeopleSheetOpen] = useState(false);
    const [categorySheetOpen, setCategorySheetOpen] = useState(false);

    const onPhotoRowPress = () => {
        if (photos.length === 0) showImagePicker();
        else setPhotoSheetOpen(true);
    }

    const addMorePhotos = () => {
        setPhotoSheetOpen(false);
        setTimeout(showImagePicker, 400);
    };

    const photosSummary = photos.length === 0 ? "" : `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;
    const peopleSummary =
        selectedPeople.length === 0
            ? ""
            : selectedPeople.length <= 2
                ? selectedPeople.map((p) => p.name).join(", ")
                : `${selectedPeople.length} people`;
    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert("Missing title", "Give your alibi a title.");
            return;
        }
        if (date > new Date()) {
            Alert.alert("Date is in the future", "Pick a time that has already happened.");
            return;
        }
        setSaving(true);
        try {
            await onSubmit({
                title: title.trim(),
                description: description.trim(),
                date,
                photos,
                category,
                people: selectedPeople,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
            Alert.alert("Couldn't save", message);
        } finally {
            setSaving(false);
        }
    };
    return (
        <>
            <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
                <KeyboardAvoidingView style={{ flex: 1 }} >
                    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                        <View style={styles.headerRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.title}>{heading}</Text>
                                {subheading ? <Text style={styles.subtitle}>{subheading}</Text> : null}
                            </View>
                            {onCancel && (
                                <TouchableOpacity onPress={onCancel} hitSlop={10}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.container}>
                            <TextInput
                                placeholder="Enter title"
                                placeholderTextColor="#000000c3"
                                value={title}
                                onChangeText={setTitle}
                                style={styles.inputText}
                            />

                            <DateField date={date} onChange={setDate} />

                            <FormRow
                                icon="camera-outline"
                                label={photos.length > 0 ? "Edit photos" : "Upload photo"}
                                value={photosSummary}
                                onPress={onPhotoRowPress}
                            />

                            <View style={[styles.input, { alignItems: "flex-start" }]}>
                                <Ionicons name="create-outline" style={styles.icon} />
                                <TextInput
                                    placeholder="Add description"
                                    placeholderTextColor="#000000c3"
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    style={styles.descInput}
                                />
                            </View>

                            <FormRow
                                icon="people-outline"
                                label="Who did you go with?"
                                value={peopleSummary}
                                onPress={() => setPeopleSheetOpen(true)}
                            />

                            <FormRow
                                icon="pricetag-outline"
                                label="Category"
                                value={category?.name}
                                onPress={() => setCategorySheetOpen(true)}
                            />

                            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving}>
                                <Text style={styles.buttonText}>{saving ? "Saving..." : submitLabel}</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
            <PhotoSheet
                visible={photoSheetOpen}
                photos={photos}
                onClose={() => setPhotoSheetOpen(false)}
                onRemove={removePhoto}
                onAddMore={addMorePhotos}
            />

            <PeopleSheet
                visible={peopleSheetOpen}
                onClose={() => setPeopleSheetOpen(false)}
                selected={selectedPeople}
                onChange={setSelectedPeople}
            />

            <CategorySheet
                visible={categorySheetOpen}
                onClose={() => setCategorySheetOpen(false)}
                selected={category}
                onSelect={setCategory}
            />
        </>

    );
}

const styles = StyleSheet.create({
  // --- Page ---
  screen: { flex: 1, padding: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start" },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 20 },
  cancelText: { fontSize: 16, fontWeight: "600", color: "#2B3FD6" },
  container: { borderRadius: 20, backgroundColor: "#ffffff", padding: 20, marginTop: 8 },

  // --- Rows ---
  icon: { color: "black", fontSize: 25 },
  iconArrow: { color: "grey", fontSize: 20 },
  inputText: {
    fontSize: 25,
    fontWeight: "700",
    padding: 10,
    fontStyle: "italic",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  descInput: {
    flex: 1,
    marginLeft: 8,
    minHeight: 60,
    fontSize: 16,
    textAlignVertical: "top",
  },
  dateTime: { flexDirection: "row" },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  countText: { color: "#666", fontSize: 14 },

  // --- Save button ---
  button: {
    backgroundColor: "#000000",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    margin: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // --- Sheets (shared by all three modals) ---
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  tallSheet: { height: "80%", maxHeight: "80%" },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  sheetDone: { fontSize: 16, fontWeight: "600", color: "#2B3FD6" },

  // --- Photo sheet ---
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 10 },
  photoCell: { width: "31%", aspectRatio: 1, borderRadius: 12, overflow: "hidden" },
  photoThumb: { width: "100%", height: "100%" },
  removeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: { backgroundColor: "#F0F0F0", alignItems: "center", justifyContent: "center" },

  // --- Category and people sheets ---
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 4,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  listRowText: { fontSize: 16 },
  listRowTextSelected: { fontWeight: "700", color: "#2B3FD6" },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  addRowText: { fontSize: 16, fontWeight: "600", color: "#2B3FD6" },
  emptyText: { textAlign: "center", color: "#888", marginTop: 24 },
});