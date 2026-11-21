
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CreateProvider } from "@/context/CreateContext";
import { Stack, useRouter,useSegments } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { BrandActivityIndicator } from "@/components/Branding";
function RouteGuard(){
  const router= useRouter();
  const {user, isLoading}= useAuth();
  const segments = useSegments();
  const inAuthGroup= segments[0]=== "(auth)";
  const inTabsGroup= segments[0]=== "(tabs)";
  const inEditRoute= segments[0]=== "edit";

  useEffect(()=>{
    if (isLoading) return;
    if(!user){
      if(!inAuthGroup){
        router.replace("/(auth)/login");
      }
    }else if(!user.onboardingCompleted){
      if(segments.join("/") !== "(auth)/onboarding"){
        router.replace("/(auth)/onBoarding");
      }
    }else{
      if(!inTabsGroup && !inEditRoute){
        router.replace("/(tabs)");
      }
    }
  },[user,isLoading,segments,router,inAuthGroup,inTabsGroup,inEditRoute]
  );

  if(isLoading){
    return(
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.parchment }}>
        <BrandActivityIndicator />
      </View>
    );
  }
    return (
    
    <Stack screenOptions={{ contentStyle: { backgroundColor: colors.parchment } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="edit/[id]" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
    
  );
}



export default function RootLayout() {
  return(
    <SafeAreaProvider>
      <AuthProvider>
        <CreateProvider>
          <RouteGuard />
        </CreateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )


}