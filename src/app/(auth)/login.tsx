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
import { BrandActivityIndicator, BrandLogo } from "@/components/Branding";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      Alert.alert("Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    try {
      await signIn(normalizedEmail, password);
      router.replace("/(tabs)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      Alert.alert("Error signing in", message);
    } finally {
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
          <BrandLogo style={styles.brand} />
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue to Alibi.</Text>

            <View style={styles.form}>
              <TextInput
                placeholder="Email"
                placeholderTextColor={colors.inkSoft}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                selectionColor={colors.navy}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.inkSoft}
                autoComplete="password"
                autoCapitalize="none"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                selectionColor={colors.navy}
              />

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <BrandActivityIndicator size={24} tintColor={colors.parchment} />
                ) : (
                  <Text style={styles.buttonText}>Log In</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push("/(auth)/signup")}
              >
                <Text style={styles.linkPrompt}>
                  Don&apos;t have an account? <Text style={styles.linkText}>Sign up</Text>
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
  brand: {
    marginBottom: 28,
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
  title: {
    color: colors.navy,
    fontFamily: "ui-serif",
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.inkSoft,
    fontSize: 16,
    marginBottom: 24,
  },
  form: {
    width: "100%",
  },
  input: {
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
  linkButton: {
    alignItems: "center",
    marginTop: 20,
  },
  linkPrompt: {
    color: colors.inkSoft,
    fontSize: 14,
  },
  linkText: {
    color: colors.navy,
    fontWeight: "700",
  },
});
