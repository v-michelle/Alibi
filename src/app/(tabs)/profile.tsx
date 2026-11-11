import { Text, View, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; 
export default function Profile() {
  return (
    <SafeAreaView style={styles.container} edges={["top","bottom"]}>
      <ScrollView>
        
      </ScrollView>
      <View style={styles.container}>
      <Text>Profile</Text>
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
});
