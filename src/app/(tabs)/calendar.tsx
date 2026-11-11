import { Text, View, StyleSheet } from "react-native";

export default function Calendar() {
  return (
    //in calander have a switch to toggle between timeline or calander view, and a button to add a new alibi
    <View style={styles.container}>
      <Text>calendar
      </Text>
      <Text> </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
