import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const WEB_BOTTOM_INSET = Platform.OS === "web" ? 34 : 0;

function MenuItem({
  icon,
  label,
  value,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <Ionicons
        // @ts-ignore
        name={icon}
        size={20}
        color={destructive ? colors.destructive : colors.mutedForeground}
        style={{ width: 24 }}
      />
      <Text
        style={[
          styles.menuLabel,
          { color: destructive ? colors.destructive : colors.foreground },
        ]}
      >
        {label}
      </Text>
      {value && (
        <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      )}
      {!value && !destructive && (
        <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logoutAuth } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const topInset = insets.top + WEB_TOP_INSET;

  if (!user) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} />
        <View style={[styles.guestContent, { paddingTop: topInset }]}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
            <Ionicons name="person" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.foreground }]}>
            Sign in to AniXo
          </Text>
          <Text style={[styles.guestSubtitle, { color: colors.mutedForeground }]}>
            Track your watchlist, sync with AniList, and more
          </Text>
          <Pressable
            style={[styles.authBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAuth(true)}
          >
            <Text style={styles.authBtnText}>Sign In / Register</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const initials = user.username?.slice(0, 2).toUpperCase() || "??";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 + WEB_BOTTOM_INSET }}
      >
        {/* Profile card */}
        <View style={[styles.profileCard, { paddingTop: topInset + 16 }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.username, { color: colors.foreground }]}>
            {user.username}
          </Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>
            {user.email}
          </Text>
        </View>

        {/* Menu sections */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            ACCOUNT
          </Text>
          <MenuItem icon="person-outline" label="Username" value={user.username} />
          <MenuItem icon="mail-outline" label="Email" value={user.email} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            APP
          </Text>
          <MenuItem
            icon="logo-github"
            label="AniList Sync"
            onPress={() => {}}
          />
          <MenuItem icon="information-circle-outline" label="About AniXo" onPress={() => {}} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MenuItem
            icon="log-out-outline"
            label="Sign Out"
            onPress={logoutAuth}
            destructive
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  guestContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  guestTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  authBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
  },
  authBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  profileCard: {
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  username: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  email: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  menuValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
