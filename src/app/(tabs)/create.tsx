import { Text, View, StyleSheet, TextInput, TouchableOpacity, Button, Alert, Modal, KeyboardAvoidingView, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase/client";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'


export default function Create() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date);
    const [show, setShow] = useState(false);
    const [mode, setMode] = useState<'date' | 'time'>('date');
    const [postImage, setPostImage] = useState<string | null>(null);

    const [modalVisible, setModalVisible] = useState(true);

    const onChange = (_e: DateTimePickerEvent, selected?: Date) => {
        if (selected) setDate(selected);
    }


    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "You need to grant permission to access the media library.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
            // Handle the selected image here
            //setProfileImage(result.assets[0].uri);
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
            //setProfileImage(result.assets[0].uri);
        }
    };

    const showImagePicker = () => {
        Alert.alert("Select Profile Image", "Choose an option", [
            { text: "Camera", onPress: takePhoto },
            { text: "Photo Library", onPress: () => pickImage() },
            { text: "Cancel", style: "cancel" },
        ]);
    };



    return (
        <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
            <KeyboardAvoidingView>
                <ScrollView>
                    <Text style={styles.title}>New alibi</Text>
                    <Text style={styles.subtitle}>Fill in the details for your new alibi.</Text>

                    <TextInput
                        placeholder="Title"
                        placeholderTextColor="#000000"
                        value={title}
                        onChangeText={setTitle}
                        style={styles.inputText}
                    />

                    <View>
                        <View style={styles.input}>
                            <TouchableOpacity onPress={() => { setMode('date'); setShow(true); }}>
                                <Text>Date</Text>
                            </TouchableOpacity>
                            <View style={styles.dateTime}>

                                {show && <DateTimePicker value={date} mode={'date'} onChange={onChange} />}
                                {show && <DateTimePicker value={date} mode={'time'} onChange={onChange} />}

                            </View>
                        </View>
                    </View>
                    <TextInput
                        placeholder="Description"
                        placeholderTextColor="#000000"
                        style={styles.inputText}
                        value={description}
                        onChangeText={setDescription}
                    />



                    <View style={styles.input}>
                        <TouchableOpacity onPress={showImagePicker}>
                            <Text>Upload Photo</Text>
                        </TouchableOpacity>
                        {postImage && <Image source={{ uri: postImage }} style={{ width: 100, height: 100 }} />}
                    </View>

                    <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)} >
                        <Text style={styles.buttonText}>Add a new alibi</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,

    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
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
    modalText: {
        marginBottom: 15,
        textAlign: 'center',
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
        fontSize: 22,
        fontWeight: "600",

        paddingVertical: 12,
        borderBottomWidth: 1.5,

        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
        marginBottom: 10,
    },
    dateTime: {
        justifyContent: 'flex-end',

        flexDirection: 'row'
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
