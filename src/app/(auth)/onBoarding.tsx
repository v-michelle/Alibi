import { View, Text, StyleSheet, Button, TextInput, TouchableOpacity, Alert, ActivityIndicator} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase/client";
import { uploadProfileImage } from "@/lib/supabase/storage";

export default function OnBoardingScreen() {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [profileImage, setProfileImage] = useState<string |null>(null);
    const {user, updateUser} = useAuth();
    const router = useRouter();

    const pickImage = async () => {
        const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
            setProfileImage(result.assets[0].uri);
        }
    }; 
    const takePhoto = async () => {
        const {status} = await ImagePicker.requestCameraPermissionsAsync();
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
            setProfileImage(result.assets[0].uri);
        }
    };

    const showImagePicker = () => {
        Alert.alert("Select Profile Image", "Choose an option", [
            { text: "Camera", onPress: takePhoto },
            { text: "Photo Library", onPress: () => pickImage() },
            { text: "Cancel", style: "cancel" },
        ]);
    };

    const handleComplete = async() => {
        const normalizedName = name.trim();
        const normalizedUsername = username.trim();

        if (!normalizedName || !normalizedUsername){
            Alert.alert("Please fill in all fields.");
            return;
        }
        if (normalizedUsername.length < 3) {
            Alert.alert("Username must be at least 3 characters long.");
            return;
        }
        setIsLoading(true);
        try{
            if(!user){
                throw new Error("User is not authenticated.");
            }
            const { data: existingUser, error: existingUserError } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", normalizedUsername)
            .maybeSingle();

            if (existingUserError && existingUserError.code !== "PGRST116") {
                throw existingUserError;
            }

            if (existingUser) {
                Alert.alert("Username already exists. Please choose a different username.");
                setIsLoading(false);
                return;
            }

            let profileImageUrl: string | undefined;
            if(profileImage){
                try{
                    await uploadProfileImage(user.id, profileImage);
                    profileImageUrl = profileImage;
                }catch(error){
                    console.error("Error uploading profile image:", error);
                    Alert.alert("Error uploading profile image.");
                }

            }
            await updateUser({
                name: normalizedName,
                username: normalizedUsername,
                profileImage: profileImageUrl,
                onboardingCompleted: true,
            });
            router.replace("/(tabs)");
            }catch (error){
                const message = error instanceof Error ? error.message : "Something went wrong while completing your profile.";
                Alert.alert("Error completing profile", message);
            }finally {
                setIsLoading(false);
        }
        
    };

  return (
    <SafeAreaView edges={["top","bottom"]} style={styles.container}>
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>Please fill in the following information to complete your profile.</Text>
      </View>

      <View style={styles.form}>
        <TouchableOpacity style={styles.imageContainer} onPress={showImagePicker}>
            
            {profileImage ? (<Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
            />
            ) :(
                <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>+</Text>
            </View>)}

            <View style={styles.editBadge}>
                <Text style={styles.editText}>edit</Text>
            </View>
        </TouchableOpacity> 
        <TextInput
          placeholder="Name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          style={styles.input}
        />
        <TextInput
          placeholder="Username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoComplete="username"
          style={styles.input}
        />
        <TouchableOpacity style={styles.button} onPress={handleComplete}>
            {isLoading? (
            <ActivityIndicator size={24} color="#fff"/>
            ) : (
            <Text style={styles.buttonText}>Complete Profile</Text>
            )}
        </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fefefe",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
    subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  form: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },  
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
    width: "100%",
  },
  button: {
    backgroundColor: "#000000",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkButton: {
    marginTop: 10,
    alignItems: "center",
  },   
  linkText:{
    color: "#0b27b7",
  },
  imageContainer:{
    marginBottom: 32,
    position: "relative",
  }, 
  profileImage:{
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ccc",
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 2,
    borderColor: "#fff",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 48,
    color: "#999",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#000000",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBadgeText: {
    color: "#fff",
    fontSize: 12,
  },
  editText: {
    color: "#fff",
    fontSize: 12,
  },
});