import { View, Text, StyleSheet, Button, TextInput, TouchableOpacity, Alert, ActivityIndicator} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function SignUpScreen() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const {signUp} = useAuth();

    
    
    const handleSignUp = async() => {
        const normalizedEmail = email.trim();

        if (!normalizedEmail || !password) {
            Alert.alert("Please enter both email and password.");
            return;
        }
        if (password.length < 6) {
            Alert.alert("Password must be at least 6 characters long.");
            return;
        }
        setIsLoading(true);
        try{
            await signUp(normalizedEmail, password);
            router.push("/(auth)/onBoarding");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
            Alert.alert("Error signing up", message);
        }finally {
            setIsLoading(false);
        }
    }

  return (
    <SafeAreaView edges={["top","bottom"]} style={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>Create New Account</Text>
      <Text style={styles.subtitle}>Create an account to get started</Text>
      <View style={styles.form}>
        <TextInput 
          placeholder="Email" 
          placeholderTextColor="#646464"
          keyboardType="email-address"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput 
          placeholder="Password" 
          placeholderTextColor="#999"
          autoComplete="password"
          autoCapitalize="none"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        
        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          {isLoading? (
            <ActivityIndicator size={24} color="#fff"/>
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} 
        onPress={() => router.push("/(auth)/login")}>
          <Text>
            Already have an account? <Text style={styles.linkText}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
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
  },  
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#000000",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
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
  } 
});