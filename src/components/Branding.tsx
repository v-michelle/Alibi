import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { colors } from "@/lib/theme";

const icon = require("../../assets/images/alibi_icon.png");
const logo = require("../../assets/images/alibi_logo.png");

export function BrandLogo({
  compact = false,
  style,
}: {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const iconSize = compact ? 38 : 76;

  return (
    <View style={[styles.logo, compact && styles.compactLogo, style]}>
      <Image source={logo} resizeMode="contain" style={{ width: iconSize, height: iconSize }} />
      <Text style={[styles.name, compact && styles.compactName]}>alibi</Text>
    </View>
  );
}

export function BrandActivityIndicator({
  size = 44,
  tintColor = colors.navy,
}: {
  size?: number;
  tintColor?: string;
}) {
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  return (
    <Animated.Image
      accessibilityLabel="Loading"
      source={icon}
      resizeMode="contain"
      style={{
        width: size,
        height: size,
        tintColor,
        transform: [
          {
            rotate: rotation.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "360deg"],
            }),
          },
        ],
      }}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  compactLogo: {
    justifyContent: "flex-start",
    gap: 4,
  },
  name: {
    color: colors.navy,
    fontFamily: "ui-serif",
    fontSize: 52,
    fontWeight: "500",
    lineHeight: 64,
  },
  compactName: {
    fontSize: 32,
    lineHeight: 42,
  },
});
