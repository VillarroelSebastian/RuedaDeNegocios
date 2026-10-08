// Config dinámica (en vez de app.json) solo para poder resolver
// android.googleServicesFile en tiempo de build: en EAS Build ese archivo no
// está en git (contiene una API key), así que se sube como variable de
// entorno de archivo secreta ("GOOGLE_SERVICES_JSON", ver eas.json/EAS
// dashboard) y EAS la descarga y expone su ruta local en esa env var. En
// local (Expo Go / build local) simplemente se usa el archivo del repo.
module.exports = {
  expo: {
    name: "Rueda de Negocios",
    slug: "mobile",
    version: "1.1.3",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "edu.univalle.ruedadenegocios",
      // Android 16 (targetSdk 36) impone edge-to-edge y ya ignora
      // windowOptOutEdgeToEdgeEnforcement, así que desactivarlo no servía de
      // nada: la app se dibuja bajo la barra de estado igual. La solución es
      // que cada pantalla reserve el inset superior con SafeAreaView.
      versionCode: 15,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-notifications",
      "@react-native-community/datetimepicker",
    ],
    extra: {
      eas: {
        projectId: "37b3f54b-efe4-4832-bada-0a160759dea6",
      },
    },
    owner: "rodrigovillanuevas-team",
  },
};
