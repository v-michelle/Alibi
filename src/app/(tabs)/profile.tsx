import { Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { uploadProfileImage } from "@/lib/supabase/storage";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function Profile() {
  const { user, updateUser, signOut,deleteAccount } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleUpdateProfileImage = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need camera roll permissions to select a profile image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setIsUpdating(true);
      try {
        const imageUrl = await uploadProfileImage(
          user.id,
          result.assets[0].uri,
        );

        await updateUser({ profileImage: imageUrl });
        Alert.alert("Success", "Profile image updated.");
      } catch (error) {
        console.error("Error updating profile image:", error);
        Alert.alert(
          "Error",
          "Failed to update profile image. Please try again.",
        );
      } finally {
        setIsUpdating(false);
      }
    }
  };


  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel" },
      {
        text: "Sign Out",
        style:"destructive",
        onPress: async () => {
          await deleteAccount();
          router.replace("/(auth)/login");
        }
      }
    ])
  }

  const handleDelete = async () => {
    Alert.alert("Are you sure you want to delete your account?", "Your account cannot be recovered once deleted", [
      { text: "Cancel" },
      {
        text: " Permanently Delete Account",
        style:'destructive',
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        }
      }
    ])
  }

  return (
    <SafeAreaView style={styles.flex} edges={["top", "bottom"]}>
      <ScrollView>
        <View>
          <View style={styles.container}>
            <Text style={styles.title}>Profile</Text>

            <TouchableOpacity style={styles.imageContainer}>
              <View>
                {user?.profileImage ? (
                  <Image
                    source={{ uri: user.profileImage }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>+</Text>
                  </View>
                )
                }
                <View style={styles.editBadge}>
                  <Text style={styles.editText}>edit</Text>
                </View>
              </View>


            </TouchableOpacity>


            

          </View>

          <View style={styles.infoContainer}>
          <View style={styles.fields}>
            <Text style={styles.fieldTitle}>Name</Text>
            <Text style={styles.fieldUserInfo}>{user?.name || "no name"}</Text>
          </View>

          <View style={styles.fields}>
            <Text style={styles.fieldTitle}>Username</Text>
            <Text style={styles.fieldUserInfo}>{user?.username}</Text>
          </View>
          <View style={styles.fields}>
            <Text style={styles.fieldTitle}>Email</Text>
            <Text style={styles.fieldUserInfo}>{user?.email}</Text>
          </View>
          </View>


          <TouchableOpacity style={styles.button} onPress={handleSignOut}>
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDelete} >
            <Text style={styles.deleteButton}>Delete Account</Text>
          </TouchableOpacity>


        </View>
      </ScrollView>


    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingBottom: 20,
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 80,
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
  editText: {
    color: "#fff",
    fontSize: 12,
  },
  imageContainer: {
    marginBottom: 32,
    position: "relative",
  },

  infoContainer:{
    flexDirection: 'column',
    margin:5,
    marginLeft:20,
    marginRight:20,
    borderTopWidth:1,
    borderTopColor:'#ccc',
  },
  fields: {
    justifyContent:'space-between',
    flexDirection: 'row',
    flexWrap:'wrap',
    padding: 10,
    borderBottomWidth:1,
    borderBottomColor:'#ccc'
  },
  fieldTitle: {
    fontWeight: 'bold',
    marginLeft: 20,
  },
  fieldUserInfo: {
    
    marginRight:20,
    textAlign:"end",
    
   

  },


  button: {
    backgroundColor: "#000000",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    margin: 10,
  },

  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton:{
    color: "#ff0000",
    justifyContent:'center',
    padding: 0,
    alignItems: "center",
    textAlign:'left',
    marginLeft:15,
  }
});
