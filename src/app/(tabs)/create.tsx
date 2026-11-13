import { Text, View, StyleSheet, TextInput, TouchableOpacity, Alert, Modal, KeyboardAvoidingView, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { uploadAlibiPhotos } from "@/lib/supabase/storage";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
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

    const { addAlibi } = useCreate();

    const onChange = (_e: DateTimePickerEvent, selected?: Date) => {
        if (selected) setDate(selected);
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
            allowsEditing: true,
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
            Alert.alert("Limit reached", `You can add up to ${MAX_PHOTOS} photos.`);
            return;
        }
        Alert.alert("Add a photo", "Choose an option", [
            { text: "Camera", onPress: takePhoto },
            { text: "Photo Library", onPress: () => pickImage() },
            { text: "Cancel", style: "cancel" },
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
                                        {<DateTimePicker value={date} mode={'date'} maximumDate={new Date()} onChange={onChange} />}
                                        {<DateTimePicker value={date} mode={'time'} onChange={onChange} />}
                                    </View>


                                </View>


                            </View>





                            <View style={styles.nextContainer}>
                                {/*Add pictue: can select multiple, shows after how many pictues added. */}
                                <View>
                                    <TouchableOpacity style={styles.input} >
                                        <View style={{ flexDirection: 'row' }}>
                                            <Ionicons name="camera-outline" style={styles.icon} />
                                            <Text onPress={showImagePicker}> Upload Photo</Text>
                                        </View>
                                        <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                    </TouchableOpacity>
                                    {postImage && <Image source={{ uri: postImage }} style={{ width: 100, height: 100 }} />}
                                </View>


                                <TouchableOpacity style={styles.input} >
                                    <View style={{ flexDirection: 'row' }}>
                                        <Ionicons name="create-outline" style={styles.icon} />
                                        <Text> Add Description</Text>
                                    </View>
                                    <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                </TouchableOpacity>


                                {/*can add names or other profiles your friends with. Add new name or a past name that was saved. */}
                                <TouchableOpacity style={styles.input} >
                                    <View style={{ flexDirection: 'row' }}>
                                        <Ionicons name="people-outline" style={styles.icon} />
                                        <Text> Who did you go with?</Text>
                                    </View>
                                    <Ionicons name="chevron-forward-outline" style={styles.iconArrow} />
                                </TouchableOpacity>
                                {/*drop down menu of categories with categories to add (add new category save to user) */}
                                <TouchableOpacity style={styles.input} >
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
    flex: {
        flex: 1,
        padding: 20,
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 10,

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
});
