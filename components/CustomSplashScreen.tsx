import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, StatusBar } from "react-native";

interface CustomSplashScreenProps {
  onFinish: () => void;
}

export function CustomSplashScreen({ onFinish }: CustomSplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    // Display splash for 1800ms, then fade out over 300ms
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setIsVisible(false);
          onFinishRef.current();
        }
      });
    }, 1800);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim }]}
      pointerEvents="auto"
    >
      <StatusBar
        backgroundColor="#F5F1E8"
        barStyle="dark-content"
        translucent={false}
      />
      <Image
        source={require("../assets/images/splash-gorani.png")}
        style={styles.image}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: "#F5F1E8",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
