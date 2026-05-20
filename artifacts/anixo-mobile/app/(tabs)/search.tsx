import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AnimeCard from "@/components/AnimeCard";
import { useColors } from "@/hooks/useColors";
import { searchAnime, GENRES } from "@/services/api";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 34 : 0;

const SORT_OPTIONS = [
  { label: "Popularity", value: "POPULARITY_DESC" },
  { label: "Trending", value: "TRENDING_DESC" },
  { label: "Score", value: "SCORE_DESC" },
  { label: "Newest", value: "START_DATE_DESC" },
];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedSort, setSelectedSort] = useState("POPULARITY_DESC");

  const { data, isLoading } = useQuery({
    queryKey: ["browse", activeQuery, selectedGenre, selectedSort],
    queryFn: () =>
      searchAnime(activeQuery, { genre: selectedGenre, sort: selectedSort }),
    staleTime: 1000 * 60 * 5,
  });

  const topInset = insets.top + WEB_TOP_INSET;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View
        style={[
          styles.searchHeader,
          {
            paddingTop: topInset + 8,
            paddingBottom: 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} style={{ marginLeft: 12 }} />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Search anime..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => setActiveQuery(query)}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {!!query && (
            <Pressable onPress={() => { setQuery(""); setActiveQuery(""); }} style={{ marginRight: 12 }}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters row */}
      <View style={{ backgroundColor: colors.background }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {SORT_OPTIONS.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => setSelectedSort(s.value)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedSort === s.value ? colors.primary : colors.card,
                  borderColor:
                    selectedSort === s.value ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      selectedSort === s.value ? "#fff" : colors.mutedForeground,
                  },
                ]}
              >
                {s.label}
              </Text>
            </Pressable>
          ))}
          <View style={styles.divider} />
          {GENRES.map((g) => (
            <Pressable
              key={g}
              onPress={() => setSelectedGenre(selectedGenre === g ? "" : g)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    selectedGenre === g ? colors.accent : colors.card,
                  borderColor:
                    selectedGenre === g ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: selectedGenre === g ? "#fff" : colors.mutedForeground,
                  },
                ]}
              >
                {g}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      <FlatList
        data={data?.media || []}
        keyExtractor={(item: { id: number }) => String(item.id)}
        numColumns={3}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + 90 + WEB_BOTTOM_INSET },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }: { item: { id: number; title: { romaji: string; english?: string }; coverImage: { extraLarge?: string; large?: string; medium?: string }; averageScore?: number; format?: string } }) => (
          <View style={styles.gridItem}>
            <AnimeCard
              id={item.id}
              title={item.title.english || item.title.romaji}
              coverImage={
                item.coverImage.extraLarge ||
                item.coverImage.large ||
                item.coverImage.medium ||
                ""
              }
              score={item.averageScore}
              format={item.format}
              width={104}
            />
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {activeQuery ? "No results found" : "Search for anime above"}
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
  searchHeader: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: "#374151",
    marginHorizontal: 4,
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  gridItem: {
    flex: 1,
    alignItems: "center",
    marginBottom: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
