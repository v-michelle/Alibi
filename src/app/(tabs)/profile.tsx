import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { uploadProfileImage } from "@/lib/supabase/storage";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { BrandActivityIndicator } from "@/components/Branding";
import { useCreate } from "@/context/CreateContext";
import { colors } from "@/lib/theme";

type ManagedEntity = "person" | "category";
type ManagedItem = { id: number; name: string };

export default function Profile() {
  const { user, updateUser, signOut } = useAuth();
  const {
    categories,
    people,
    isLoading: isLoadingEntities,
    addCategory,
    addPerson,
    updateCategory,
    updatePerson,
  } = useCreate();
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeManager, setActiveManager] = useState<ManagedEntity | null>(null);
  const router = useRouter();
  const userCategories = categories.filter((category) => category.user_id === user?.id);

  const handleUpdateProfileImage = async () => {
    if (!user || isUpdating) return;
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
        const imageUrl = await uploadProfileImage(user.id, result.assets[0].uri);
        await updateUser({ profileImage: imageUrl });
        Alert.alert("Success", "Profile image updated.");
      } catch (error) {
        console.error("Error updating profile image:", error);
        Alert.alert("Error", "Failed to update profile image. Please try again.");
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
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

 
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Your account and personal details</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarButton}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>+</Text>
              </View>
            )}
            <TouchableOpacity
            style={styles.editBadge}
            onPress={handleUpdateProfileImage}
            disabled={isUpdating}
          >
           
            {isUpdating ? (
              <BrandActivityIndicator size={20} />
            ) : (
              <Text style={styles.editText}>Edit</Text>
            )}
          </TouchableOpacity>
          </View>
          <Text style={styles.name}>{user?.name || "Your name"}</Text>
          <Text style={styles.username}>
            {user?.username ? `@${user.username}` : "Add a username"}
          </Text>
          
        </View>

        <View style={styles.infoCard}>
          <View style={styles.field}>
            <Text style={styles.fieldTitle}>Name</Text>
            <Text style={styles.fieldValue}>{user?.name || "Not set"}</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldTitle}>Username</Text>
            <Text style={styles.fieldValue}>
              {user?.username ? `@${user.username}` : "Not set"}
            </Text>
          </View>
          <View style={[styles.field, styles.lastField]}>
            <Text style={styles.fieldTitle}>Email</Text>
            <Text style={styles.fieldValue}>{user?.email || "Not set"}</Text>
          </View>
        </View>

        <View style={styles.managementButtons}>
          <TouchableOpacity
            style={styles.managementButton}
            onPress={() => setActiveManager("category")}
          >
            <Ionicons name="pricetag-outline" size={20} color={colors.navy} />
            <Text style={styles.managementButtonText}>Edit categories</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.managementButton}
            onPress={() => setActiveManager("person")}
          >
            <Ionicons name="people-outline" size={20} color={colors.navy} />
            <Text style={styles.managementButtonText}>Edit people</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Log Out</Text>
        </TouchableOpacity>
        
      </ScrollView>
      {activeManager && (
        <NameManagerModal
          key={activeManager}
          type={activeManager}
          items={activeManager === "person" ? people : userCategories}
          isLoading={isLoadingEntities}
          onClose={() => setActiveManager(null)}
          onAdd={async (name) => {
            if (activeManager === "person") {
              await addPerson(name);
            } else {
              await addCategory(name);
            }
          }}
          onRename={async (id, name) => {
            if (activeManager === "person") {
              await updatePerson(id, name);
            } else {
              await updateCategory(id, name);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

function NameManagerModal({
  type,
  items,
  isLoading,
  onClose,
  onAdd,
  onRename,
}: {
  type: ManagedEntity;
  items: ManagedItem[];
  isLoading: boolean;
  onClose: () => void;
  onAdd: (name: string) => Promise<void>;
  onRename: (id: number, name: string) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [editingItem, setEditingItem] = useState<ManagedItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const title = type === "person" ? "Edit people" : "Edit categories";

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name || isSaving) return;

    setIsSaving(true);
    try {
      await onAdd(name);
      setNewName("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert(`Couldn't add ${type}`, message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRename = async () => {
    if (!editingItem || isSaving) return;
    const name = editingItem.name.trim();
    if (!name) {
      Alert.alert("Name required", "Enter a name before saving.");
      return;
    }

    setIsSaving(true);
    try {
      await onRename(editingItem.id, name);
      setEditingItem(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert(`Couldn't update ${type}`, message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider style={styles.managerProvider}>
        <View style={styles.managerBackdrop}>
          <SafeAreaView edges={["top", "bottom"]} style={styles.managerSafeArea}>
            <KeyboardAvoidingView
              style={styles.managerKeyboard}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.managerPanel}>
                <View style={styles.managerHeader}>
                  <View style={styles.managerHeaderText}>
                    <Text style={styles.managerTitle}>{title}</Text>
                    <Text style={styles.managerDescription}>
                      {type === "category"
                        ? "Only your custom categories appear here. Built-in categories stay unchanged."
                        : "Add or rename people for your alibi posts."}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.managerClose}
                    onPress={onClose}
                    hitSlop={8}
                    accessibilityLabel="Close"
                  >
                    <Ionicons name="close" size={22} color={colors.navy} />
                  </TouchableOpacity>
                </View>

                <View style={styles.addRow}>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder={`New ${type} name`}
                    placeholderTextColor={colors.inkSoft}
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={handleAdd}
                    style={[styles.managedInput, styles.addInput]}
                    selectionColor={colors.navy}
                  />
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={handleAdd}
                    disabled={!newName.trim() || isSaving}
                    accessibilityLabel={`Add ${type}`}
                  >
                    <Ionicons name="add" size={20} color={colors.parchment} />
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.managerList}
                  contentContainerStyle={styles.managerListContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {isLoading && items.length === 0 ? (
                    <View style={styles.entityLoading}>
                      <BrandActivityIndicator size={30} />
                    </View>
                  ) : items.length === 0 ? (
                    <Text style={styles.emptyEntities}>
                      {type === "category" ? "No custom categories yet." : "No people yet."}
                    </Text>
                  ) : (
                    items.map((item) => {
                      const isEditing = editingItem?.id === item.id;
                      return (
                        <View key={item.id} style={styles.managedRow}>
                          {isEditing && editingItem ? (
                            <>
                              <TextInput
                                value={editingItem.name}
                                onChangeText={(name) =>
                                  setEditingItem({ ...editingItem, name })
                                }
                                autoFocus
                                autoCapitalize="words"
                                returnKeyType="done"
                                onSubmitEditing={handleRename}
                                style={[styles.managedInput, styles.editingInput]}
                                selectionColor={colors.navy}
                              />
                              <TouchableOpacity
                                style={styles.iconButton}
                                onPress={handleRename}
                                disabled={isSaving}
                                accessibilityLabel={`Save ${type} name`}
                              >
                                <Ionicons name="checkmark" size={20} color={colors.navy} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => setEditingItem(null)}
                                disabled={isSaving}
                                accessibilityLabel={`Cancel editing ${type} name`}
                              >
                                <Ionicons name="close" size={20} color={colors.inkSoft} />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <>
                              <Text style={styles.managedName}>{item.name}</Text>
                              <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => setEditingItem(item)}
                                disabled={isSaving}
                                accessibilityLabel={`Edit ${item.name}`}
                              >
                                <Ionicons
                                  name="pencil-outline"
                                  size={18}
                                  color={colors.navy}
                                />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.parchment,
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: 22,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: colors.navy,
    fontFamily: "ui-serif",
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 15,
    marginTop: 4,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.paper,
    padding: 24,
    marginBottom: 16,
  },
  avatarButton: {
    position: "relative",
    marginBottom: 12,
  },
  profileImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.paper,
  },
  placeholderImage: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: colors.parchment,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gold,
    borderStyle: "dashed",
  },
  placeholderText: {
    color: colors.inkSoft,
    fontSize: 42,
  },
  editBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editText: {
    color: colors.parchment,
    fontSize: 12,
    fontWeight: "600",
  },
  name: {
    color: colors.navy,
    fontFamily: "ui-serif",
    fontSize: 22,
    fontWeight: "700",
  },
  username: {
    color: colors.inkSoft,
    fontSize: 15,
    marginTop: 3,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.paper,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  managementButtons: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.paper,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  managementButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 54,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
  },
  managementButtonText: {
    flex: 1,
    color: colors.navy,
    fontSize: 15,
    fontWeight: "600",
  },
  managerProvider: {
    flex: 1,
  },
  managerBackdrop: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: colors.scrim,
  },
  managerSafeArea: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  managerKeyboard: {
    width: "100%",
  },
  managerPanel: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "100%",
    alignSelf: "center",
    backgroundColor: colors.parchment,
    borderRadius: 20,
    padding: 20,
  },
  managerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  managerHeaderText: {
    flex: 1,
  },
  managerTitle: {
    color: colors.navy,
    fontFamily: "ui-serif",
    fontSize: 22,
    fontWeight: "700",
  },
  managerDescription: {
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  managerClose: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
    marginRight: -8,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  managerList: {
    flexGrow: 0,
    flexShrink: 1,
  },
  managerListContent: {
    paddingBottom: 4,
  },
  managedInput: {
    minWidth: 0,
    backgroundColor: colors.parchment,
    borderWidth: 1,
    borderColor: colors.paper,
    borderRadius: 10,
    color: colors.navy,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  addInput: {
    flex: 1,
  },
  addButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: colors.navy,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  addButtonText: {
    color: colors.parchment,
    fontSize: 14,
    fontWeight: "600",
  },
  managedRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.paper,
    paddingVertical: 4,
  },
  managedName: {
    flex: 1,
    color: colors.navy,
    fontSize: 15,
    paddingVertical: 10,
  },
  editingInput: {
    flex: 1,
  },
  iconButton: {
    width: 38,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  entityLoading: {
    alignItems: "center",
    paddingVertical: 12,
  },
  emptyEntities: {
    color: colors.inkSoft,
    fontSize: 14,
    paddingTop: 14,
    textAlign: "center",
  },
  field: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.paper,
    gap: 5,
  },
  lastField: {
    borderBottomWidth: 0,
  },
  fieldTitle: {
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fieldValue: {
    color: colors.navy,
    fontSize: 16,
    flexShrink: 1,
  },
  signOutButton: {
    minHeight: 50,
    backgroundColor: colors.navy,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  signOutText: {
    color: colors.parchment,
    fontSize: 16,
    fontWeight: "700",
  },
});
