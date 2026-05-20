import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimeRow from "@/components/AnimeRow";
import { useColors } from "@/hooks/useColors";
import { getTrendingAnime, getPopularAnime, getNewReleases } from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 34 : 0;

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [heroIndex, setHeroIndex] = useState(0);

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ["trending"],
    queryFn: () => getTrendingAnime(1),
    staleTime: 1000 * 60 * 10,
  });

  const { data: popularData, isLoading: popularLoading } = useQuery({
    queryKey: ["popular"],
    queryFn: () => getPopularAnime(1),
    staleTime: 1000 * 60 * 10,
  });

  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ["newReleases"],
    queryFn: () => getNewReleases(1),
    staleTime: 1000 * 60 * 10,
  });

  const heroAnime = trendingData?.media?.[heroIndex];
  const topInset = insets.top + WEB_TOP_INSET;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 90 + WEB_BOTTOM_INSET,
        }}
      >
        {/* Hero Banner */}
        {heroAnime && (
          <Pressable onPress={() => router.push(`/anime/${heroAnime.id}`)}>
            <View style={[styles.hero, { height: 300 + topInset }]}>
              <Image
                source={{
                  uri:
                    heroAnime.coverImage?.extraLarge ||
                    heroAnime.coverImage?.large ||
                    "",
                }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
              <LinearGradient
                colors={["transparent", colors.background]}
                style={[StyleSheet.absoluteFill, { top: "40%" }]}
              />
              <View style={[styles.heroPillRow, { top: topInset + 12 }]}>
                {trendingData?.media?.slice(0, 5).map((a: { id: number }, i: number) => (
                  <Pressable key={a.id} onPress={() => setHeroIndex(i)}>
                    <View
                      style={[
                        styles.heroPill,
                        {
                          backgroundColor:
                            i === heroIndex ? colors.primary : colors.muted,
                        },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
              <View style={styles.heroMeta}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {heroAnime.title?.english || heroAnime.title?.romaji}
                </Text>
                <View style={styles.heroTags}>
                  {heroAnime.format && (
                    <View style={[styles.tag, { backgroundColor: colors.primary }]}>
                      <Text style={styles.tagText}>{heroAnime.format}</Text>
                    </View>
                  )}
                  {heroAnime.averageScore > 0 && (
                    <View style={[styles.tag, { backgroundColor: colors.card }]}>
                      <Text style={[styles.tagText, { color: "#fbbf24" }]}>
                        ★ {(heroAnime.averageScore / 10).toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        )}

        <View style={{ marginTop: 20 }}>
          <AnimeRow
            title="Trending Now"
            data={trendingData?.media}
            isLoading={trendingLoading}
            seeMoreRoute="/(tabs)/search"
          />
          <AnimeRow
            title="Popular Anime"
            data={popularData?.media}
            isLoading={popularLoading}
            seeMoreRoute="/(tabs)/search"
          />
          <AnimeRow
            title="New Releases"
            data={newData?.media}
            isLoading={newLoading}
            seeMoreRoute="/(tabs)/search"
          />
        </View>
      </ScrollView>

      {/* Floating AniXo logo header */}
      <View
        style={[
          styles.floatingHeader,
          {
            paddingTop: topInset + 8,
            backgroundColor: "transparent",
          },
        ]}
        pointerEvents="none"
      >
        <Text style={[styles.logoText, { color: colors.foreground }]}>
          Ani<Text style={{ color: colors.primary }}>Xo</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    width: SCREEN_WIDTH,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  heroPillRow: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    gap: 5,
  },
  heroPill: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroMeta: {
    padding: 16,
    paddingBottom: 20,
    gap: 8,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroTags: {
    flexDirection: "row",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
});
