import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getWatchlist, removeFromWatchlist } from "@/services/watchlistService";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 34 : 0;

const STATUS_COLORS: Record<string, string> = {
  Watching: "#3b82f6",
  Completed: "#22c55e",
  Planning: "#f59e0b",
  Dropped: "#ef4444",
  "On Hold": "#8b5cf6",
};

export default function WatchlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [watchlist, setWatchlist] = useState<{ animeId: number; title: string; coverImage: string; status: string; progress: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  const topInset = insets.top + WEB_TOP_INSET;

  const loadWatchlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getWatchlist();
      setWatchlist(res.watchlist || []);
    } catch {
      setWatchlist([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const handleRemove = async (animeId: number) => {
    await removeFromWatchlist(animeId);
    setWatchlist((prev) => prev.filter((w) => w.animeId !== animeId));
  };

  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} />
        <Ionicons name="bookmark-outline" size={56} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
          Your watchlist is empty
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Sign in to save and track your anime
        </Text>
        <Pressable
          style={[styles.signInBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAuth(true)}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Watchlist</Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>
          {watchlist.length} titles
        </Text>
      </View>

      <FlatList
        data={watchlist}
        keyExtractor={(item) => String(item.animeId)}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 90 + WEB_BOTTOM_INSET },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadWatchlist}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(`/anime/${item.animeId}`)}
          >
            <Image
              source={{ uri: item.coverImage }}
              style={styles.cover}
              contentFit="cover"
            />
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || colors.muted }]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              {item.progress > 0 && (
                <Text style={[styles.progress, { color: colors.mutedForeground }]}>
                  {item.progress} ep watched
                </Text>
              )}
            </View>
            <Pressable
              style={styles.removeBtn}
              onPress={() => handleRemove(item.animeId)}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
            </Pressable>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.center}>
              <Ionicons name="bookmark-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                No anime in your list yet
              </Text>
            </View>
          ) : null
        }
      />
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
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  headerCount: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  list: { paddingHorizontal: 16, gap: 12 },
  card: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  cover: {
    width: 60,
    height: 85,
  },
  cardInfo: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 19,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  progress: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  removeBtn: {
    padding: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  signInBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  signInText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
