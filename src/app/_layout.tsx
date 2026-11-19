
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CreateProvider } from "@/context/CreateContext";
import { Stack, useRouter,useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator , View} from "react-native";

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
      <View>
        <ActivityIndicator/>
      </View>
    );
  }
    return (
    
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="edit/[id]" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
    
  );
}



export default function RootLayout() {
  return(
    <AuthProvider>
      <CreateProvider>
        <RouteGuard />
      </CreateProvider>
    </AuthProvider>
  )


}