import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { login, register } from "@/services/authService";

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AuthModal({ visible, onClose }: AuthModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loginAuth } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const reset = () => {
    setEmail(""); setPassword(""); setUsername(""); setConfirmPassword(""); setError("");
  };

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!isLogin && password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!isLogin && !username) { setError("Username is required."); return; }

    setLoading(true);
    try {
      const res = isLogin
        ? await login(email, password)
        : await register(username, email, password);

      if (res.token) {
        await loginAuth(res.user, res.token);
        reset();
        onClose();
      } else {
        setError(res.message || (isLogin ? "Login failed." : "Registration failed."));
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setError(e.code === "ERR_NETWORK" ? "Cannot reach server. Try again later." : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.secondary, borderColor: colors.border, color: colors.foreground },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 24 }]} onPress={() => {}}>
          <View style={styles.handle} />

          <Text style={[styles.title, { color: colors.foreground }]}>
            {isLogin ? "Sign In" : "Create Account"}
          </Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!isLogin && (
              <TextInput
                style={inputStyle}
                placeholder="Username"
                placeholderTextColor={colors.mutedForeground}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            )}

            <TextInput
              style={inputStyle}
              placeholder="Email"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <View style={styles.pwRow}>
              <TextInput
                style={[inputStyle, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPw(v => !v)}>
                <Ionicons name={showPw ? "eye-off" : "eye"} size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {!isLogin && (
              <TextInput
                style={inputStyle}
                placeholder="Confirm Password"
                placeholderTextColor={colors.mutedForeground}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            )}

            {!!error && (
              <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>
            )}

            <Pressable
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitText}>{isLogin ? "Sign In" : "Create Account"}</Text>
              }
            </Pressable>

            <Pressable
              onPress={() => { setIsLogin(v => !v); setError(""); }}
              style={styles.switchBtn}
            >
              <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Text style={{ color: colors.primary }}>
                  {isLogin ? "Sign Up" : "Sign In"}
                </Text>
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#374151",
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  pwRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
  },
  error: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
    textAlign: "center",
  },
  submitBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  switchBtn: {
    marginTop: 16,
    alignItems: "center",
  },
  switchText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
