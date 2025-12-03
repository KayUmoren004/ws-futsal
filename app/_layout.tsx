import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { TournamentProvider } from "@/state/TournamentProvider";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <TournamentProvider>
      <ThemeProvider value={DarkTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: "modal", title: "Modal" }}
          />
          <Stack.Screen
            name="add-players-modal"
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
              title: "Add Players",
            }}
          />
          <Stack.Screen
            name="view-players-modal"
            options={{
              presentation: "modal",
              headerShown: false,
              title: "Team Players",
            }}
          />
          <Stack.Screen
            name="player-library"
            options={{
              presentation: "modal",
              headerShown: false,
              title: "Player Library",
            }}
          />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </TournamentProvider>
  );
}
