import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { uploadAlibiPhotos } from "@/lib/supabase/storage";
import DateTimePicker, { DateTimePickerChangeEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Category, Person, useCreate } from "@/context/CreateContext";

type Photo = { uri: string };
const MAX_PHOTOS = 5;

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }
    return fallback;
};

export default function Create() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date());
    const [saving, setSaving] = useState(false);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [modalPhotoVisible, setModalPhotoVisible] = useState(false);
    const [modalPeopleVisible, setModalPeopleVisible] = useState(false);
    const [modalCatVisible, setModalCatVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [catQuery, setCatQuery] = useState("");
    const [addingCat, setAddingCat] = useState(false);
    const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
    const [peopleQuery, setPeopleQuery] = useState("");
    const [addingPerson, setAddingPerson] = useState(false);

    const { addAlibi, categories, addCategory, people, addPerson } = useCreate();

    const onValueChange = (_event: DateTimePickerChangeEvent, selected: Date) => {
        setDate(selected);
    };

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
                { text: "Edit Photos", onPress: () => setModalPhotoVisible(true) },
                { text: "Cancel", style: "cancel" },
            ]);
        } else if (photos.length > 0) {
            Alert.alert("Add photos", "Choose an option", [
                { text: "Camera", onPress: takePhoto },
                { text: "Photo Library", onPress: () => pickImage() },
                { text: "Edit Photos", onPress: () => setModalPhotoVisible(true) },
                { text: "Cancel", style: "cancel" },
            ]);
        } else {
            Alert.alert("Add photos", "Choose an option", [
                { text: "Camera", onPress: takePhoto },
                { text: "Photo Library", onPress: () => pickImage() },
                { text: "Cancel", style: "cancel" },
            ]);
        }
    };

    const confirmRemove = (index: number) => {
        Alert.alert(
            "Are you sure you want to delete this photo?",
            "This photo will be permanently deleted from your account.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    style: "destructive",
                    onPress: () => setPhotos((prev) => prev.filter((_, i) => i !== index)),
                },
            ],
        );
    };

    const trimmedQuery = catQuery.trim();
    const exactMatch = categories.find((c) => c.name.toLowerCase() === trimmedQuery.toLowerCase());
    const canAdd = trimmedQuery.length > 0 && !exactMatch;

    const catSections = useMemo(() => {
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

    const chooseCategory = (c: Category) => {
        setSelectedCategory((prev) => (prev?.id === c.id ? null : c));
        setModalCatVisible(false);
    };

    const handleAddCategory = async () => {
        if (!canAdd || addingCat) return;
        setAddingCat(true);
        try {
            const created = await addCategory(trimmedQuery);
            setSelectedCategory(created);
            setCatQuery("");
            setModalCatVisible(false);
        } catch (error) {
            console.error("Adding category failed:", error);
            const message = getErrorMessage(error, "Please try again");
            Alert.alert("Couldn't add category", message);
        } finally {
            setAddingCat(false);
        }
    };

    const trimmedPeopleQuery = peopleQuery.trim();
    const canAddPerson =
        trimmedPeopleQuery.length > 0 &&
        !people.some((p) => p.name.toLowerCase() === trimmedPeopleQuery.toLowerCase());

    const filteredPeople = useMemo(() => {
        const q = trimmedPeopleQuery.toLowerCase();
        return people.filter((p) => p.name.toLowerCase().includes(q));
    }, [people, trimmedPeopleQuery]);

    const togglePerson = (p: Person) => {
        setSelectedPeople((prev) =>
            prev.some((x) => x.id === p.id)
                ? prev.filter((x) => x.id !== p.id)
                : [...prev, p],
        );
    };

    const handleAddPerson = async () => {
        if (!canAddPerson || addingPerson) return;
        setAddingPerson(true);
        try {
            const created = await addPerson(trimmedPeopleQuery);
            setSelectedPeople((prev) => [...prev, created]);
            setPeopleQuery("");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Please try again.";
            Alert.alert("Couldn't add person", message);
        } finally {
            setAddingPerson(false);
        }
    };

    const peopleSummary =
        selectedPeople.length === 0
            ? ""
            : selectedPeople.length <= 2
                ? selectedPeople.map((p) => p.name).join(", ")
                : `${selectedPeople.length} people`;

    const handleAddAlibi = async () => {
        if (saving) return;
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
            const image_paths = await uploadAlibiPhotos(photos);
            await addAlibi({
                title: title.trim(),
                description: description.trim() || undefined,
                occurred_at: date.toISOString(),
                image_paths,
                category_id: selectedCategory?.id ?? null,
                person_ids: selectedPeople.map((p) => p.id),
            });
            router.back();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
            Alert.alert("Error creating alibi", message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView edges={["top", "bottom"]} style={styles.flex}>
            <KeyboardAvoidingView>
                <ScrollView>
                    <View>
                        <Text style={styles.title}>New alibi</Text>
                        <Text style={styles.subtitle}>Fill in the details for your new alibi.</Text>

                        <View style={styles.container}>
                            <TextInput
                                placeholder="Enter title"
                                placeholderTextColor="#000000c3"
                                value={title}
                                onChangeText={setTitle}
                                style={styles.inputText}
                            />

                            <View style={styles.input}>
                                <View style={styles.iconLabel}>
                                        <Ionicons name="calendar-outline" style={styles.icon} />
                                    <Text>Date</Text>
                                </View>
                                <View style={styles.dateTime}>
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        maximumDate={new Date()}
                                        onValueChange={onValueChange}
                                    />
                                    <DateTimePicker
                                        value={date}
                                        mode="time"
                                        onValueChange={onValueChange}
                                    />
                                </View>
                            </View>

                            <Modal
                                animationType="slide"
                                transparent
                                visible={modalPhotoVisible}
                                onRequestClose={() => setModalPhotoVisible(false)}
                            >
                                <View style={styles.backdrop}>
                                    <SafeAreaView edges={["top", "bottom"]} style={styles.sheet}>
                                        <View style={styles.sheetHeader}>
                                            <Text style={styles.sheetTitle}>Your photos</Text>
                                            <TouchableOpacity onPress={() => setModalPhotoVisible(false)}>
                                                <Text style={styles.sheetDone}>Done</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView contentContainerStyle={styles.photoGrid}>
                                            {photos.map((photo, index) => (
                                                <View key={photo.uri} style={styles.photoCell}>
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
                                        </ScrollView>
                                    </SafeAreaView>
                                </View>
                            </Modal>

                            <Modal
                                animationType="slide"
                                transparent
                                visible={modalCatVisible}
                                onRequestClose={() => setModalCatVisible(false)}
                            >
                                <View style={styles.backdrop}>
                                    <SafeAreaView
                                        edges={["top", "bottom"]}
                                        style={[styles.sheet, styles.catSheet]}
                                    >
                                        <View style={styles.sheetHeader}>
                                            <Text style={styles.sheetTitle}>Categories</Text>
                                            <TouchableOpacity onPress={() => setModalCatVisible(false)}>
                                                <Text style={styles.sheetDone}>Close</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.searchBox}>
                                            <Ionicons name="search-outline" size={18} color="#888" />
                                            <TextInput
                                                placeholder="Search or add a category"
                                                placeholderTextColor="#888"
                                                value={catQuery}
                                                onChangeText={setCatQuery}
                                                autoCorrect={false}
                                                style={styles.searchInput}
                                            />
                                        </View>
                                        <SectionList
                                            sections={catSections}
                                            keyExtractor={(c) => String(c.id)}
                                            keyboardShouldPersistTaps="handled"
                                            stickySectionHeadersEnabled={false}
                                            ListHeaderComponent={
                                                canAdd ? (
                                                    <TouchableOpacity
                                                        style={styles.addRow}
                                                        onPress={handleAddCategory}
                                                        disabled={addingCat}
                                                    >
                                                        <Ionicons name="add-circle-outline" size={22} color="#2B3FD6" />
                                                        <Text style={styles.addRowText}>
                                                            {addingCat ? "Adding..." : `Add "${trimmedQuery}"`}
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
                                                const selected = item.id === selectedCategory?.id;
                                                return (
                                                    <TouchableOpacity
                                                        style={styles.catRow}
                                                        onPress={() => chooseCategory(item)}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.catRowText,
                                                                selected && styles.catRowTextSelected,
                                                            ]}
                                                        >
                                                            {item.name}
                                                        </Text>
                                                        {selected && <Ionicons name="checkmark" size={20} />}
                                                    </TouchableOpacity>
                                                );
                                            }}
                                        />
                                    </SafeAreaView>
                                </View>
                            </Modal>

                            <Modal
                                animationType="slide"
                                transparent
                                visible={modalPeopleVisible}
                                onRequestClose={() => setModalPeopleVisible(false)}
                            >
                                <View style={styles.backdrop}>
                                    <SafeAreaView
                                        edges={["top", "bottom"]}
                                        style={[styles.sheet, styles.catSheet]}
                                    >
                                        <View style={styles.sheetHeader}>
                                            <Text style={styles.sheetTitle}>Who did you go with?</Text>
                                            <TouchableOpacity onPress={() => setModalPeopleVisible(false)}>
                                                <Text style={styles.sheetDone}>Close</Text>
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.searchBox}>
                                            <Ionicons name="search-outline" size={18} color="#888" />
                                            <TextInput
                                                placeholder="Search or add a name"
                                                placeholderTextColor="#888"
                                                value={peopleQuery}
                                                onChangeText={setPeopleQuery}
                                                autoCorrect={false}
                                                style={styles.searchInput}
                                            />
                                        </View>

                                        <FlatList
                                            data={filteredPeople}
                                            keyExtractor={(person) => String(person.id)}
                                            keyboardShouldPersistTaps="handled"
                                            ListHeaderComponent={
                                                canAddPerson ? (
                                                    <TouchableOpacity
                                                        style={styles.addRow}
                                                        onPress={handleAddPerson}
                                                        disabled={addingPerson}
                                                    >
                                                        <Ionicons name="person-add-outline" size={22} />
                                                        <Text style={styles.addRowText}>
                                                            {addingPerson
                                                                ? "Adding..."
                                                                : `Add "${trimmedPeopleQuery}"`}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ) : undefined
                                            }
                                            ListEmptyComponent={
                                                !canAddPerson ? (
                                                    <Text style={styles.emptyText}>
                                                        {people.length === 0
                                                            ? "No saved people yet. Type a name to add"
                                                            : "No one found."}
                                                    </Text>
                                                ) : undefined
                                            }
                                            renderItem={({ item }) => {
                                                const selected = selectedPeople.some(
                                                    (person) => person.id === item.id,
                                                );
                                                return (
                                                    <TouchableOpacity
                                                        style={styles.catRow}
                                                        onPress={() => togglePerson(item)}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.catRowText,
                                                                selected && styles.catRowTextSelected,
                                                            ]}
                                                        >
                                                            {item.name}
                                                        </Text>
                                                        <Ionicons
                                                            name={
                                                                selected
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
                                </View>
                            </Modal>

                            <TouchableOpacity style={styles.input} onPress={showImagePicker}>
                                <View style={styles.iconLabel}>
                                    <Ionicons name="camera-outline" style={styles.icon} />
                                    <Text>Upload Photo</Text>
                                </View>
                                <View style={styles.rowRight}>
                                    <Text style={styles.countText}>
                                        {photos.length} {photos.length === 1 ? "photo" : "photos"}
                                    </Text>
                                    <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setModalCatVisible(true)}
                            >
                                <View style={styles.iconLabel}>
                                    <Ionicons name="pricetag-outline" style={styles.icon} />
                                    <Text>Category</Text>
                                </View>
                                <View style={styles.rowRight}>
                                    {selectedCategory && (
                                        <Text style={styles.countText}>{selectedCategory.name}</Text>
                                    )}
                                    <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setModalPeopleVisible(true)}
                            >
                                <View style={styles.iconLabel}>
                                    <Ionicons name="people-outline" style={styles.icon} />
                                    <Text>Who did you go with?</Text>
                                </View>
                                <View style={styles.rowRight}>
                                    {peopleSummary !== "" && (
                                        <Text style={styles.countText}>{peopleSummary}</Text>
                                    )}
                                    <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                </View>
                            </TouchableOpacity>

                            <View style={styles.input}>
                                <View style={styles.iconLabel}>
                                    <Ionicons name="create-outline" style={styles.icon} />
                                    <Text>Add Description</Text>
                                </View>
                                <TextInput
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    style={styles.descriptionInput}
                                />
                            </View>

                            <TouchableOpacity
                                style={styles.button}
                                onPress={handleAddAlibi}
                                disabled={saving}
                            >
                                <Text style={styles.buttonText}>
                                    {saving ? "Saving..." : "Add a new alibi"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        padding: 20,
    },
    container: {
        padding: 20,
        borderRadius: 20,
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
    },
    subtitle: {
        fontSize: 16,
        color: "#666",
        marginBottom: 20,
    },
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
    dateTime: {
        flexDirection: "row",
    },
    iconLabel: {
        flexDirection: "row",
        alignItems: "center",
    },
    icon: {
        color: "#000",
        fontSize: 25,
    },
    iconArrow: {
        color: "#888",
        fontSize: 20,
    },
    rowRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    descriptionInput: {
        flex: 1,
        marginLeft: 6,
        minHeight: 60,
    },
    button: {
        backgroundColor: "#000",
        borderRadius: 12,
        padding: 10,
        alignItems: "center",
        margin: 10,
    },
    buttonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "bold",
    },
    backdrop: {
        flex: 1,
        justifyContent: "flex-end",
        backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: "70%",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    sheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    sheetDone: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2B3FD6",
    },
    catSheet: {
        height: "80%",
        maxHeight: "80%",
    },
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
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: "700",
        color: "#888",
        textTransform: "uppercase",
        marginTop: 16,
        marginBottom: 4,
    },
    catRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    catRowText: {
        fontSize: 16,
    },
    catRowTextSelected: {
        fontWeight: "700",
        color: "#2B3FD6",
    },
    addRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    addRowText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2B3FD6",
    },
    emptyText: {
        textAlign: "center",
        color: "#888",
        marginTop: 24,
    },
    countText: {
        color: "#666",
        fontSize: 14,
    },
    photoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingBottom: 10,
    },
    photoCell: {
        width: "31%",
        aspectRatio: 1,
        borderRadius: 12,
        overflow: "hidden",
    },
    photoThumb: {
        width: "100%",
        height: "100%",
    },
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
});
