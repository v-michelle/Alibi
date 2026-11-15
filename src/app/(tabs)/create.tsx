import { Text, View, StyleSheet, TextInput, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { uploadAlibiPhotos } from "@/lib/supabase/storage";
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker'
import { Ionicons } from "@expo/vector-icons";
import { useCreate } from "@/context/CreateContext";
import { router } from "expo-router";



type Photo = { uri: string };

export default function Create() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date);
    const [postImage, setPostImage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [modalPhotoVisible, setModalPhotoVisible] = useState(false);
    const [modalPeopleVisible, setModalPeopleVisible] = useState(false);
    const [modalCatVisible, setModalCatVisible] = useState(false);

    const { addAlibi } = useCreate();

    const onValueChange = (_event: DateTimePickerChangeEvent, selected: Date) => {
        setDate(selected);
    }

    const MAX_PHOTOS = 5;
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
            // Handle the selected image here
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
            // Handle the captured photo here
            const a = result.assets[0];
            setPhotos((prev) => [...prev, { uri: a.uri }].slice(0, MAX_PHOTOS));
        }
    };
    const showImagePicker = () => {
        if (photos.length >= MAX_PHOTOS) {
            Alert.alert("Limit reached", `You can add up to ${MAX_PHOTOS} photos.`, [
                { text: "Edit Photos", onPress: setModalPhotoVisible },
                { text: "Cancel", style: "cancel" },
            ]);

        } else if (photos.length > 0) {
            Alert.alert("Add photos", "Choose an option", [
                { text: "Camera", onPress: takePhoto },
                { text: "Photo Library", onPress: () => pickImage() },
                { text: "Edit Photos", onPress: setModalPhotoVisible },
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
        Alert.alert("Are you sure you want to delete this photo?", "This photo will be permanently deleted from your account.", [
            { text: "Cancel", style: 'cancel' },
            { text: "Confirm", style: 'destructive', onPress: () => setPhotos((prev) => prev.filter((_, i) => i != index)) },
        ]);
    };

    const handleAddAlibi = async () => {
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

                            <View >{/* Add date: Cannot be past todays date or time */}

                                <View style={styles.input} >
                                    <View style={{ flexDirection: 'row' }}>
                                        <Ionicons name="calendar-outline" style={styles.icon} />
                                        <Text> Date</Text>
                                    </View>
                                    <View style={styles.dateTime}>
                                        {<DateTimePicker value={date} mode={'date'} maximumDate={new Date()} onValueChange={onValueChange} />}
                                        {<DateTimePicker value={date} mode={'time'} onValueChange={onValueChange} />}
                                    </View>


                                </View>


                            </View>

                            <Modal
                                animationType="slide"
                                transparent={true}
                                visible={modalPhotoVisible}
                                onRequestClose={() => setModalPhotoVisible(false)}
                            >
                                <View style={styles.backdrop}>
                                    <SafeAreaView edges={["top", "bottom"]} style={styles.sheet}>
                                        <View style={styles.sheetHeader}>
                                            <Text style={styles.sheetTitle}> Your Photos </Text>
                                            {postImage ? (<Image source={{ uri: postImage }} style={styles.postImage} />
                                            ) : (<Text></Text>)}
                                            <TouchableOpacity onPress={() => setModalPhotoVisible(!modalPhotoVisible)}>
                                                <Text style={styles.sheetDone}>Done</Text>
                                            </TouchableOpacity>
                                        </View>

                                    <ScrollView contentContainerStyle={styles.photoGrid}>
                                        {photos.map((p, i) =>
                                            <View key={p.uri} style={styles.photoCell}>
                                                <Image source={{ uri: p.uri }} style={styles.photoThumb} contentFit="cover" />
                                                <TouchableOpacity style={styles.removeBadge} onPress={() => confirmRemove(i)}>
                                                    <Ionicons name="close" size={16} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </ScrollView>
                                    </SafeAreaView>
                                </View>
                            </Modal>

                            <Modal
                                animationType="slide"
                                transparent={true}
                                visible={modalPeopleVisible}>
                                <SafeAreaView style={styles.centeredView}>
                                    <View style={styles.modalView}>
                                        <Text> Modal 1 </Text>
                                        <TouchableOpacity onPress={() => setModalPeopleVisible(!modalPeopleVisible)}>
                                            <Text>Close</Text>
                                        </TouchableOpacity>
                                    </View></SafeAreaView>
                            </Modal>
                            <Modal
                                animationType="slide"
                                transparent={true}
                                visible={modalCatVisible}>
                                <SafeAreaView style={styles.centeredView}>
                                    <View style={styles.modalView}>
                                        <Text> Categories </Text>
                                        <TouchableOpacity style={styles.modalButton} onPress={() => setModalCatVisible(!modalCatVisible)}>
                                            <Text style={styles.modalButtonText}>X</Text>
                                        </TouchableOpacity>
                                    </View></SafeAreaView>
                            </Modal>


                            <View style={styles.nextContainer}>
                                {/*Add pictue: can select multiple, shows after how many pictues added. */}
                                {/*add a modal so user can review photos and delete/change them */}
                                <View>
                                    <TouchableOpacity style={styles.input} onPress={showImagePicker}>
                                        <View style={{ flexDirection: 'row' }}>
                                            <Ionicons name="camera-outline" style={styles.icon} />
                                            <Text> Upload Photo</Text>

                                        </View>
                                        <Text>{photos.length} {photos.length === 1 ? "photo" : "photos"}</Text>
                                        <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                    </TouchableOpacity>
                                    {postImage && <Image source={{ uri: postImage }} style={{ width: 100, height: 100 }} />}
                                </View>

                                {/* modal pops up so user can add description??*/}
                                <TouchableOpacity style={styles.input} >
                                    <View style={{ flexDirection: 'row' }}>
                                        <Ionicons name="create-outline" style={styles.icon} />
                                        <Text> Add Description</Text>
                                    </View>
                                    <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                </TouchableOpacity>

                                {/* modal of names*/}
                                {/*can add names or other profiles your friends with. Add new name or a past name that was saved. */}
                                <TouchableOpacity style={styles.input} onPress={() => setModalPeopleVisible(true)}>
                                    <View style={{ flexDirection: 'row' }}>
                                        <Ionicons name="people-outline" style={styles.icon} />
                                        <Text> Who did you go with?</Text>
                                    </View>
                                    <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                </TouchableOpacity>


                                {/*drop down menu of categories with categories to add (add new category save to user) */}
                                {/* when clicked modal opens showing list of categories, users can search, and add create category if preexisting options don't apply*/}
                                <TouchableOpacity style={styles.input} onPress={() => setModalCatVisible(true)} >
                                    <View style={{ flexDirection: 'row' }}>
                                        <Ionicons name="pricetag-outline" style={styles.icon} />
                                        <Text> Category</Text>
                                    </View>
                                    <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                </TouchableOpacity>


                                <TouchableOpacity style={styles.button}  >
                                    <Text style={styles.buttonText}>Add a new alibi</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 95,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,

    },
    flex: {
        flex: 1,
        padding: 20,
    },
    centeredView: {
        flex: 1,
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
    container: {
        borderRadius: 20,
        backgroundColor: '#ffffff',
        padding: 20,

    },
    icon: {
        color: 'black',
        fontSize: 25,

    },
    iconArrow: {
        color: 'grey',
        fontSize: 20,

    },
    nextContainer: {

        borderEndColor: '#000'
    },
    inputText: {
        fontSize: 25,
        fontWeight: '700',
        padding: 10,
        fontStyle: 'italic',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',

    },
    input: {
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        padding: 10,
        fontSize: 16,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateTime: {
        flexDirection: 'row',
    },
    button: {
        backgroundColor: "#000000",
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
    modalButton: {
        backgroundColor: "#535353",
        borderRadius: 320,
        padding: 20,
        alignItems: "center",
        margin: 10,
        position: "absolute",
        bottom: 0,
        right: 0,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    modalButtonText: {
        color: "white",
        fontWeight: 600
    },
    postImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#ccc",
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
        
        shadowColor: '#000',
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
    }, removeBadge: {
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
