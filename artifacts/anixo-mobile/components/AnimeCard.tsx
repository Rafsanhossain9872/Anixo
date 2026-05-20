import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface AnimeCardProps {
  id: number;
  title: string;
  coverImage: string;
  score?: number;
  format?: string;
  episodes?: number;
  status?: string;
  width?: number;
}

export default function AnimeCard({
  id,
  title,
  coverImage,
  score,
  format,
  width = 120,
}: AnimeCardProps) {
  const colors = useColors();
  const height = Math.round(width * 1.42);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.75 : 1 }]}
      onPress={() => router.push(`/anime/${id}`)}
    >
      <View style={[styles.imageContainer, { width, height, borderRadius: colors.radius, backgroundColor: colors.card }]}>
        <Image
          source={{ uri: coverImage }}
          style={[styles.image, { borderRadius: colors.radius }]}
          contentFit="cover"
          transition={200}
        />
        {score && score > 0 ? (
          <View style={[styles.scoreBadge, { backgroundColor: "rgba(0,0,0,0.75)" }]}>
            <Ionicons name="star" size={9} color="#fbbf24" />
            <Text style={styles.scoreText}>{(score / 10).toFixed(1)}</Text>
          </View>
        ) : null}
        {format ? (
          <View style={[styles.formatBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.formatText}>{format}</Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[styles.title, { color: colors.foreground, width }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },
  imageContainer: {
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  scoreBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  scoreText: {
    color: "#fbbf24",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  formatBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  title: {
    marginTop: 6,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 16,
  },
});
