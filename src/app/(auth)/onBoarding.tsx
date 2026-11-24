import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { supabase } from "@/lib/supabase/client";
import { uploadProfileImage } from "@/lib/supabase/storage";
import { BrandActivityIndicator } from "@/components/Branding";
import { colors } from "@/lib/theme";

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
            setProfileImage(result.assets[0].uri);
        }
    }; 
    const takePhoto = async () => {
        const {status} = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission denied", "You need to grant permission to access the camera to upload pictures from the camera.");
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled && result.assets[0]) {
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
                    profileImageUrl = await uploadProfileImage(user.id, profileImage);
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
    <SafeAreaView edges={["top", "bottom"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Complete your profile</Text>
            <Text style={styles.subtitle}>
              Add a few details so your friends know it&apos;s you.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.form}>
              <TouchableOpacity style={styles.imageContainer} onPress={showImagePicker}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>+</Text>
                  </View>
                )}
                <View style={styles.editBadge}>
                  <Text style={styles.editText}>Edit</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.photoHint}>Add a profile photo (optional)</Text>

              <TextInput
                placeholder="Name"
                placeholderTextColor={colors.inkSoft}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                style={styles.input}
                selectionColor={colors.navy}
              />
              <TextInput
                placeholder="Username"
                placeholderTextColor={colors.inkSoft}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                style={styles.input}
                selectionColor={colors.navy}
              />
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <BrandActivityIndicator size={24} tintColor={colors.parchment} />
                ) : (
                  <Text style={styles.buttonText}>Complete Profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  header: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    marginBottom: 20,
    alignItems: "center",
  },
  title: {
    color: colors.navy,
    fontFamily: "ui-serif",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.inkSoft,
    textAlign: "center",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.paper,
    padding: 24,
  },
  form: {
    alignItems: "center",
  },
  photoHint: {
    color: colors.inkSoft,
    fontSize: 14,
    marginTop: -20,
    marginBottom: 24,
  },
  input: {
    width: "100%",
    backgroundColor: colors.parchment,
    borderWidth: 1,
    borderColor: colors.paper,
    borderRadius: 12,
    color: colors.navy,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  button: {
    width: "100%",
    minHeight: 50,
    backgroundColor: colors.navy,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.parchment,
    fontSize: 16,
    fontWeight: "700",
  },
  imageContainer:{
    marginBottom: 24,
    position: "relative",
  }, 
  profileImage:{
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.paper,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.parchment,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: colors.gold,
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 48,
    color: colors.inkSoft,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.navy,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: {
    color: colors.parchment,
    fontSize: 12,
    fontWeight: "600",
  },
});