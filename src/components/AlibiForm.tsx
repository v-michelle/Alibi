import { useMemo, useState, useRef } from "react";
import {
    Text,
    View,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    Modal,
    KeyboardAvoidingView,
    Platform,
    FlatList,
    ScrollView,
    SectionList,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Category, Person, useCreate } from "@/context/CreateContext";
import { colors } from "@/lib/theme";
import type { ScrollViewInstance } from "react-native";
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
    onDelete?: () => Promise<void>;
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

            selectionLimit: MAX_PHOTOS - photos.length,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            const a = result.assets[0];
            setPhotos((prev) => [...prev, { uri: a.uri }].slice(0, MAX_PHOTOS));
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
            aspect: [4, 3],
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
            <View style={styles.rowLead}>
                <Ionicons name={icon} style={styles.icon} />
                <Text style={styles.rowLabel}>{label}</Text>
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
            <View style={styles.rowLead}>
                <Ionicons name="calendar-outline" style={styles.icon} />
                <Text style={styles.rowLabel}>Date</Text>
            </View>
            <View style={styles.dateTime}>
                <DateTimePicker
                    value={date}
                    mode="date"
                    accentColor={colors.navy}
                    maximumDate={new Date()}
                    onValueChange={(_e, selected) => onChange(selected)}
                />
                <DateTimePicker
                    value={date}
                    mode="time"
                    accentColor={colors.navy}
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
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [page, setPage] = useState(0); // photo currently showing in the viewer
    const [pager, setPager] = useState({ width: 0, height: 0 });


    const openViewer = (index: number) => {
        setPage(index);
        setViewerIndex(index);
    };
    const closeViewer = () => setViewerIndex(null);
    const close = () => {
        setViewerIndex(null);
        onClose();
    };


    const confirmRemove = (index: number, afterRemove?: () => void) => {
        Alert.alert(
            "Are you sure you want to delete this photo?",
            "This photo will be permanently deleted from your account.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    style: "destructive",
                    onPress: () => {
                        onRemove(index);
                        afterRemove?.();
                    },
                },
            ],
        );
    };
    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            statusBarTranslucent
            onRequestClose={viewerIndex !== null ? closeViewer : close}
        >
            <SafeAreaProvider style={styles.fullScreen}>
                <View style={styles.fullScreen}>
                    <SafeAreaView edges={["top", "bottom"]} style={styles.fullSheet}>
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>Your photos</Text>
                            <TouchableOpacity onPress={close}>
                                <Text style={styles.sheetDone}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        {photos.length > 0 && <Text style={styles.photoHint}>Tap a photo to view it larger, add up to 5 photos.</Text>}
                        <ScrollView contentContainerStyle={styles.photoGrid} showsVerticalScrollIndicator={false}>
                            {photos.map((photo, index) => (
                                <TouchableOpacity
                                    key={photo.path ?? photo.uri}
                                    style={styles.photoCell}
                                    activeOpacity={0.85}
                                    onPress={() => openViewer(index)}
                                >
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
                                </TouchableOpacity>
                            ))}
                            {photos.length < MAX_PHOTOS && (
                                <TouchableOpacity style={[styles.photoCell, styles.addTile]} onPress={onAddMore}>
                                    <Ionicons name="add" size={32} color={colors.inkSoft} />
                                    <Text style={styles.addTitleText}>Add photos</Text>
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                    {viewerIndex !== null && (
                        <View style={[StyleSheet.absoluteFill, styles.viewer]}>
                            <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
                                <View style={styles.viewerBar}>
                                    <TouchableOpacity onPress={closeViewer} hitSlop={12} accessibilityLabel="Close photo">
                                        <Ionicons name="chevron-back" size={28} color={colors.parchment} />
                                    </TouchableOpacity>
                                    <Text style={styles.viewerCount}>
                                        {page + 1} / {photos.length}
                                    </Text>
                                    <TouchableOpacity onPress={() => confirmRemove(page, closeViewer)} hitSlop={12} accessibilityLabel="Delete photo">
                                        <Ionicons name="trash-outline" size={24} color={colors.parchment} />
                                    </TouchableOpacity>
                                </View>

                                <View
                                    style={{ flex: 1 }}
                                    onLayout={(e) =>
                                        setPager({
                                            width: e.nativeEvent.layout.width,
                                            height: e.nativeEvent.layout.height,
                                        })
                                    }
                                >
                                    {pager.width > 0 && (
                                        <ScrollView
                                            horizontal
                                            pagingEnabled
                                            showsHorizontalScrollIndicator={false}
                                            contentOffset={{ x: viewerIndex * pager.width, y: 0 }}
                                            onMomentumScrollEnd={(e) =>
                                                setPage(Math.round(e.nativeEvent.contentOffset.x / pager.width))
                                            }
                                        >
                                            {photos.map((p) => (
                                                <ScrollView
                                                    key={p.path ?? p.uri}
                                                    style={{ width: pager.width, height: pager.height }}
                                                    contentContainerStyle={{ width: pager.width, height: pager.height }}
                                                    maximumZoomScale={3}
                                                    minimumZoomScale={1}
                                                    centerContent
                                                    showsHorizontalScrollIndicator={false}
                                                    showsVerticalScrollIndicator={false}
                                                >
                                                    <Image
                                                        source={{ uri: p.uri }}
                                                        style={{ width: pager.width, height: pager.height }}
                                                        contentFit="contain"
                                                    />
                                                </ScrollView>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>
                            </SafeAreaView>
                        </View>
                    )}
                </View>
            </SafeAreaProvider>
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
            style={styles.backdrop}
            behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <SafeAreaView edges={["top", "bottom"]} style={[styles.sheet, styles.tallSheet]}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Categories</Text>
                        <TouchableOpacity onPress={close}>
                            <Text style={styles.sheetDone}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color={colors.inkSoft} />
                        <TextInput
                            placeholder="Search or add a category"
                            placeholderTextColor={colors.inkSoft}
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
                                    <Ionicons name="add-circle-outline" size={22} color={colors.navy} />
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
                                    <Text style={[styles.listRowText, isSelected && styles.listRowTextSelected,]}>
                                        {item.name}
                                    </Text>
                                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.navy} />}
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
        ><KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>

                <SafeAreaView
                    edges={["top", "bottom"]}
                    style={[styles.sheet, styles.tallSheet]}
                >
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>People</Text>
                        <TouchableOpacity onPress={close}>
                            <Text style={styles.sheetDone}>Done</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color={colors.inkSoft} />
                        <TextInput
                            placeholder="Search or add a name"
                            placeholderTextColor={colors.inkSoft}
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
                                    <Ionicons name="person-add-outline" size={22} color={colors.navy} />
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
                                    <Text style={[styles.listRowText, isSelected && styles.listRowTextSelected,]}>
                                        {item.name}
                                    </Text>
                                    <Ionicons
                                        name={
                                            isSelected
                                                ? "checkmark-circle"
                                                : "ellipse-outline"
                                        }
                                        size={22}
                                        color={isSelected ? colors.navy : colors.gold}
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
    onDelete
}: AlibiFormProps) {
    //Form values (
    const [title, setTitle] = useState(initial?.title ?? "");
    const [description, setDescription] = useState(initial?.description ?? "");
    const [date, setDate] = useState(initial?.date ?? new Date());
    const [category, setCategory] = useState<Category | null>(initial?.category ?? null);
    const [selectedPeople, setSelectedPeople] = useState<Person[]>(initial?.people ?? []);
    const { photos, showImagePicker, removePhoto } = usePhotoPicker(initial?.photos ?? []);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    //modals
    const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
    const [peopleSheetOpen, setPeopleSheetOpen] = useState(false);
    const [categorySheetOpen, setCategorySheetOpen] = useState(false);
    //formatting page so description isnt blocked by the keyboard.
    const scrollRef = useRef<ScrollViewInstance|null>(null);
    const containerY = useRef(0);
    const descY = useRef(0);
    const scrollToDescription = () => {
        setTimeout(() => {
            scrollRef.current?.scrollTo({
                y: containerY.current + descY.current - 24,
                animated: true,
            });
        }, 300);
    };

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
    const confirmDelete = () => {
        Alert.alert("Delete this alibi?", "This permanently deletes it and cannot be recovered",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive",
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            await onDelete?.();
                        } catch (error) {
                            const message = error instanceof Error ? error.message : "Please try again";
                            Alert.alert("Couldn't delete", message);
                            setDeleting(false);
                        }
                    },
                },
            ]
        );
    };
    return (
        <>
            <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
                <ScrollView
                    ref={scrollRef}
                    automaticallyAdjustKeyboardInsets
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}>

                    <View style={styles.header}>
                        <View >
                            <Text style={styles.title}>{heading}</Text>
                            {subheading ? <Text style={styles.subtitle}>{subheading}</Text> : null}
                        </View>
                        {onCancel && (
                            <TouchableOpacity onPress={onCancel} hitSlop={10}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={styles.container}
                    onLayout={(e)=> {containerY.current=e.nativeEvent.layout.y;}}>
                        <TextInput
                            placeholder="Enter title"
                            placeholderTextColor={colors.inkSoft}
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


                        <FormRow
                            icon="people-outline"
                            label="Who was there?"
                            value={peopleSummary}
                            onPress={() => setPeopleSheetOpen(true)}
                        />

                        <FormRow
                            icon="pricetag-outline"
                            label="Category"
                            value={category?.name}
                            onPress={() => setCategorySheetOpen(true)}
                        />

                        <View style={[styles.input, { alignItems: "flex-start" }]}
                            onLayout={(e)=> {descY.current = e.nativeEvent.layout.y;}}>
                            <Ionicons name="create-outline" style={styles.icon} />
                            <TextInput
                                placeholder="Add description"
                                placeholderTextColor={colors.inkSoft}
                                value={description}
                                onChangeText={setDescription}
                                onFocus={scrollToDescription}
                                multiline
                                style={styles.descInput}
                            />
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving || deleting}>
                            <Text style={styles.buttonText}>{saving ? "Saving..." : submitLabel}</Text>
                        </TouchableOpacity>
                        {onDelete && (
                            <TouchableOpacity style={styles.deleteButton} onPress={confirmDelete} disabled={saving || deleting}>
                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                <Text style={styles.deleteText}>{deleting ? "Deleting..." : "Delete alibi"}</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>

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
    screen: {
        flex: 1,
        padding: 30,
        backgroundColor: colors.parchment
    },
    header: {
        flexDirection: "row",
        justifyContent: 'space-between',
        alignItems: "flex-start",
        marginBottom: 20
    },
    brandHeader: {
        gap: 10,
        marginBottom: 18,
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

    },
    cancelText: {
        fontSize: 16,
        fontWeight: "600",
        color: colors.navy
    },
    container: {
        borderRadius: 16,
        backgroundColor: colors.card,
        padding: 20,

        borderWidth: 1,
        borderColor: colors.paper,
    },


    // --- Rows ---
    icon: {
        color: colors.navy,
        fontSize: 25
    },
    iconArrow: {
        color: colors.inkSoft,
        fontSize: 20
    },
    rowLabel: {
        fontFamily: 'ui-serif',
        fontSize: 16,
        color: colors.navy
    },
    inputText: {
        fontSize: 25,
        fontWeight: "700",
        padding: 10,
        fontStyle: "italic",
        borderBottomWidth: 1,
        borderBottomColor: colors.gold,
    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: colors.paper,
        padding: 10,
        fontSize: 16,
        marginBottom: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    rowLead: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    descInput: {
        flex: 1,
        marginLeft: 8,
        minHeight: 80,
        maxHeight:160,
        fontFamily: "ui-serif",
        fontSize: 16,
        color: colors.navy,
        textAlignVertical: "top",
    },
    dateTime: { flexDirection: "row" },
    rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
    countText: { color: colors.inkSoft, fontSize: 14 },

    // --- Save button ---
    button: {
        backgroundColor: colors.navy,
        borderRadius: 12,
        padding: 10,
        alignItems: "center",
        margin: 10,
    },
    buttonText: { color: colors.parchment, fontSize: 16, fontWeight: "bold" },
    deleteButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 12,
        marginHorizontal: 10,
    },
    deleteText: { color: colors.danger, fontSize: 16, fontWeight: "600" },


    // --- Sheets (shared by all three modals) ---
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.scrim },
    sheet: {
        backgroundColor: colors.parchment,
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
    sheetTitle: { fontFamily: 'ui-serif', fontSize: 20, fontWeight: "700", color: colors.navy },
    sheetDone: { fontSize: 16, fontWeight: "600", color: colors.navy },

    // --- Photo sheet ---
    fullScreen: { flex: 1, backgroundColor: colors.parchment },
    fullSheet: { flex: 1, padding: 20 },
    photoHint: { fontSize: 13, color: colors.inkSoft, marginTop: -6, marginBottom: 20 },

    photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 10 },
    photoCell: {
        width: "48%",
        aspectRatio: 0.85,
        borderRadius: 10,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.gold,
        backgroundColor: colors.paper,
    },
    photoThumb: { width: "100%", height: "100%" },
    removeBadge: {
        position: "absolute",
        top: 6,
        right: 6,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "rgba(23,46,75,0.75)",
        alignItems: "center",
        justifyContent: "center",
    },
    addTile: { backgroundColor: "transparent", borderStyle: 'dashed', alignItems: "center",alignSelf:'flex-start', justifyContent: "center", gap: 4 },
    addTitleText: {
        color: colors.inkSoft,
        fontSize: 14,
    },
    viewer: { backgroundColor: colors.navy },
    viewerBar: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 30,
        paddingVertical: 12,
    },
    viewerCount: { color: colors.parchment, fontSize: 16, fontWeight: "600" },


    // --- Category and people sheets ---
    searchBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: colors.paper,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 8,
    },
    searchInput: { flex: 1, fontSize: 16, color: colors.navy },
    sectionHeader: {
        fontSize: 13,
        fontWeight: "700",
        color: colors.inkSoft,
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
        borderBottomColor: colors.paper,
    },
    listRowText: {
        fontFamily: 'ui-serif',
        fontSize: 16,
        color: colors.navy,
    },
    listRowTextSelected: { fontWeight: "700" },
    addRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.paper,
    },
    addRowText: { fontSize: 16, fontWeight: "600", color: colors.navy },
    emptyText: { textAlign: "center", color: colors.inkSoft, marginTop: 24 },
});