import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export default function SkeletonCard({ width = 120 }: { width?: number }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  const height = Math.round(width * 1.42);

  return (
    <View style={{ marginRight: 12 }}>
      <Animated.View
        style={[
          styles.image,
          {
            width,
            height,
            borderRadius: colors.radius,
            backgroundColor: colors.card,
            opacity,
          },
        ]}
      />
      <Animated.View
        style={[styles.title, { width, backgroundColor: colors.card, opacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  title: {
    height: 12,
    borderRadius: 4,
    marginTop: 8,
  },
});
