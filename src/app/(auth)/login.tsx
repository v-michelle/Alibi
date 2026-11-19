import { View, Text, StyleSheet, Button, TextInput, TouchableOpacity, Alert, Image} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {signIn} = useAuth();

  const router = useRouter();

  const handleLogin = async() => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
        Alert.alert("Please enter both email and password.");
        return;
    }
    setIsLoading(true);
    try{
        await signIn(normalizedEmail, password);
        router.replace("/(tabs)");
    } catch (error) {
        const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
        Alert.alert("Error signing in", message);
    }finally {
        setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top","bottom"]} style={styles.container}>
      <View style={styles.logoContent}>
        {/*<Image source={require('../../assets//alibi_logo.png')} style={styles.logo}/>*/}
        <Text style={styles.logoTitle}>alibi</Text>
      </View>
    <View style={styles.content}>
      
      <Text style={styles.title}>Login</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>
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
        
        <TouchableOpacity style={styles.button}
        onPress={handleLogin}>
          {isLoading ? (
            <Text style={styles.buttonText}>Loading...</Text>
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} 
        onPress={() => router.push("/(auth)/signup")}>
          <Text>
            Don't have an account? <Text style={styles.linkText}>Sign up</Text>
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
    marginTop:25,
  },
  content: {
    flex: 1,
    padding: 20,
    borderWidth:1,
    borderRadius: 15,
    justifyContent:"center"

  },
  logoContent: {
    alignContent: "center"
  },
  logo: {
    width: 100,
    height: 100,
    
  },
  logoTitle: {
    alignSelf:"center",
    fontFamily: "ui-serif",
    fontSize: 40,
    color: '#122454',
    fontWeight: 500,
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
  linkText: {
    color: "#0050c8",
    fontWeight: "bold",
  },
});