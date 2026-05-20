import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AnimeCard from "@/components/AnimeCard";
import { useColors } from "@/hooks/useColors";

interface AnimeItem {
  id: number;
  title: { romaji: string; english?: string };
  coverImage: { extraLarge?: string; large?: string; medium?: string };
  averageScore?: number;
  format?: string;
  episodes?: number;
  status?: string;
}

interface AnimeRowProps {
  title: string;
  data: AnimeItem[] | undefined;
  isLoading: boolean;
  seeMoreRoute?: string;
}

export default function AnimeRow({ title, data, isLoading, seeMoreRoute }: AnimeRowProps) {
  const colors = useColors();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        {seeMoreRoute && (
          <Pressable onPress={() => router.push(seeMoreRoute as never)}>
            <Text style={[styles.seeMore, { color: colors.primary }]}>See all</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          scrollEnabled={!!data?.length}
          renderItem={({ item }) => (
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
              episodes={item.episodes}
              status={item.status}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              Nothing to show
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  seeMore: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  empty: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginLeft: 4,
  },
});
