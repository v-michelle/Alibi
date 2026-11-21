import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {colors} from "@/lib/theme";

const getTabIcon =
  (iconName: "home-outline" | "calendar-outline" | "person-circle-outline" | "add-circle-outline") =>
    function TabIcon({ focused, size }: { focused: boolean; size: number }) {
      return (
        <Ionicons
          name={iconName}
          size={size}
          color={focused ? colors.navy : colors.inkSoft}
        />
      );
    };

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown:false,
                tabBarActiveTintColor: colors.navy,
                tabBarInactiveTintColor: colors.inkSoft,
                tabBarStyle: { backgroundColor: colors.parchment, borderTopColor: colors.paper },
            }}
        >
            <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: getTabIcon("home-outline") }} />
            <Tabs.Screen name="create" options={{ title: "Add Alibi", tabBarIcon: getTabIcon("add-circle-outline") }} />
            <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: getTabIcon("person-circle-outline") }} />
        </Tabs>
    );
}
