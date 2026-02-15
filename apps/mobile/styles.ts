import { StyleSheet } from "react-native";

export const perfect = StyleSheet.create({
  boxShadow: {
    shadowColor: "rgba(14, 63, 126, 0.04)",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 24,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
