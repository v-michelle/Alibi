import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const getTabIcon =
  (iconName: "home-outline" | "calendar-outline" | "person-circle-outline" | "add-circle-outline") =>
  ({ color, size }: { color?: any; size?: number }) =>
    <Ionicons name={iconName} size={size ?? 24} color={color ?? "#000000"} />;

export default function TabsLayout() {
    return (
        <Tabs>
            <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: getTabIcon("home-outline") }} />
            <Tabs.Screen name="create" options={{ title: "Add Alibi", tabBarIcon: getTabIcon("add-circle-outline") }} />
            <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: getTabIcon("person-circle-outline") }} />
        </Tabs>
    );
}
