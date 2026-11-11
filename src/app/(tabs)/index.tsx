import { Text, View, StyleSheet, TouchableOpacity,  } from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {router} from "expo-router";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["top","bottom"]}>
    <View >
      <View style={styles.content}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>What have you done today?</Text>
        {/* show a list of alibis, with the most recent at the top, and a button to add a new alibi */}
      <TouchableOpacity style={styles.button} onPress={() => router.replace("/(tabs)/create")}>
        <Text style={styles.buttonText}>Add a new alibi</Text>
      </TouchableOpacity>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:1,
    alignItems:'center',
    
  },
  content:{
    flex: 1,
    
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
});
