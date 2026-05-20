import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getAnimeDetails } from "@/services/api";
import { addToWatchlist, removeFromWatchlist } from "@/services/watchlistService";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_HEIGHT = 220;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 34 : 0;

const MIRURO_BASE = "https://www.miruro.tv";

export default function AnimeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [inWatchlist, setInWatchlist] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const { data: anime, isLoading } = useQuery({
    queryKey: ["anime", id],
    queryFn: () => getAnimeDetails(Number(id)),
    enabled: !!id,
    staleTime: 1000 * 60 * 30,
  });

  const handleWatch = async (episode: number) => {
    const url = `${MIRURO_BASE}/watch?id=${id}&ep=${episode}`;
    await WebBrowser.openBrowserAsync(url);
  };

  const handleWatchlistToggle = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!anime) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await removeFromWatchlist(Number(id));
        setInWatchlist(false);
      } else {
        await addToWatchlist(
          Number(id),
          anime.title?.english || anime.title?.romaji || "",
          anime.coverImage?.extraLarge || anime.coverImage?.large || "",
        );
        setInWatchlist(true);
      }
    } finally {
      setWatchlistLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!anime) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
          Anime not found
        </Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Text style={{ color: colors.foreground }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const episodes = anime.episodes || 0;
  const episodeList = episodes > 0
    ? Array.from({ length: Math.min(episodes, 200) }, (_, i) => i + 1)
    : [];

  const description = anime.description
    ?.replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"') || "";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 + WEB_BOTTOM_INSET }}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <Image
            source={{ uri: anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large || "" }}
            style={[styles.bannerImage, { height: BANNER_HEIGHT }]}
            contentFit="cover"
          />
          <LinearGradient
            colors={["transparent", colors.background]}
            style={[StyleSheet.absoluteFill, { top: BANNER_HEIGHT * 0.4 }]}
          />
        </View>

        {/* Cover + Title */}
        <View style={styles.titleRow}>
          <Image
            source={{ uri: anime.coverImage?.extraLarge || anime.coverImage?.large || "" }}
            style={[styles.cover, { borderRadius: colors.radius, borderColor: colors.border }]}
            contentFit="cover"
          />
          <View style={styles.titleInfo}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={3}>
              {anime.title?.english || anime.title?.romaji}
            </Text>
            {anime.title?.romaji && anime.title?.english && (
              <Text style={[styles.altTitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                {anime.title.romaji}
              </Text>
            )}
            <View style={styles.metaRow}>
              {anime.format && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{anime.format}</Text>
                </View>
              )}
              {anime.status && (
                <View style={[styles.badge, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                  <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{anime.status}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { borderColor: colors.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: "#fbbf24" }]}>
              {anime.averageScore ? `${(anime.averageScore / 10).toFixed(1)}` : "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Score</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {anime.episodes || "?"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Episodes</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>
              {anime.season ? `${anime.season} ${anime.seasonYear}` : anime.seasonYear || "—"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Season</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.watchBtn, { backgroundColor: colors.primary }]}
            onPress={() => handleWatch(1)}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.watchBtnText}>Watch Ep 1</Text>
          </Pressable>
          <Pressable
            style={[
              styles.bookmarkBtn,
              {
                backgroundColor: inWatchlist ? colors.primary : colors.card,
                borderColor: inWatchlist ? colors.primary : colors.border,
              },
            ]}
            onPress={handleWatchlistToggle}
            disabled={watchlistLoading}
          >
            <Ionicons
              name={inWatchlist ? "bookmark" : "bookmark-outline"}
              size={20}
              color={inWatchlist ? "#fff" : colors.mutedForeground}
            />
          </Pressable>
        </View>

        {/* Genres */}
        {anime.genres?.length > 0 && (
          <View style={styles.genreRow}>
            {anime.genres.map((g: string) => (
              <View key={g} style={[styles.genreChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                <Text style={[styles.genreText, { color: colors.mutedForeground }]}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {!!description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Synopsis</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {description}
            </Text>
          </View>
        )}

        {/* Episodes */}
        {episodeList.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Episodes</Text>
            <FlatList
              data={episodeList}
              keyExtractor={(ep) => String(ep)}
              numColumns={5}
              scrollEnabled={false}
              renderItem={({ item: ep }) => (
                <Pressable
                  style={[styles.epBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleWatch(ep)}
                >
                  <Text style={[styles.epText, { color: colors.foreground }]}>{ep}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {/* Characters */}
        {anime.characters?.edges?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Characters</Text>
            <FlatList
              horizontal
              data={anime.characters.edges.slice(0, 12)}
              keyExtractor={(edge: { node: { id: number } }) => String(edge.node.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              renderItem={({ item: edge }: { item: { node: { id: number; name: { full: string }; image: { large: string; medium: string } }; role: string } }) => (
                <View style={styles.charCard}>
                  <Image
                    source={{ uri: edge.node.image?.large || edge.node.image?.medium || "" }}
                    style={[styles.charImage, { borderRadius: colors.radius }]}
                    contentFit="cover"
                  />
                  <Text style={[styles.charName, { color: colors.foreground }]} numberOfLines={2}>
                    {edge.node.name?.full}
                  </Text>
                  <Text style={[styles.charRole, { color: colors.mutedForeground }]}>
                    {edge.role === "MAIN" ? "Main" : "Supporting"}
                  </Text>
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: { fontSize: 16, fontFamily: "Inter_400Regular" },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  banner: {
    position: "relative",
    height: BANNER_HEIGHT,
  },
  bannerImage: {
    width: SCREEN_WIDTH,
  },
  titleRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
    marginTop: -60,
  },
  cover: {
    width: 100,
    height: 145,
    borderWidth: 2,
  },
  titleInfo: {
    flex: 1,
    paddingTop: 60,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    lineHeight: 22,
  },
  altTitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 2,
  },
  statDivider: {
    width: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  watchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 10,
    gap: 8,
  },
  watchBtnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  bookmarkBtn: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  genreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 16,
  },
  genreChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  epBtn: {
    flex: 1,
    margin: 3,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 56,
  },
  epText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  charCard: {
    width: 80,
    alignItems: "center",
    gap: 4,
  },
  charImage: {
    width: 80,
    height: 110,
  },
  charName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 14,
  },
  charRole: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
});
