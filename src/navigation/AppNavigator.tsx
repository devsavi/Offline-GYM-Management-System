import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { MemberProfileScreen } from '../screens/MemberProfileScreen';
import { PlanBuilderScreen } from '../screens/PlanBuilderScreen';
import { AddMemberModal } from '../screens/AddMemberModal';
import { AuthLockScreen } from '../screens/AuthLockScreen';
import { useGymStore } from '../store/useGymStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { trainer, locations, isAuthenticated } = useGymStore();

  const isConfigured = Boolean(trainer && locations.length > 0);
  const requiresAuth = isConfigured && Boolean(trainer?.pin_hash) && !isAuthenticated;

  // Prompt password / PIN when returning user opens app with PIN protection enabled
  if (requiresAuth) {
    return <AuthLockScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={isConfigured ? 'app-configured' : 'app-initial'}
        initialRouteName={isConfigured ? 'Dashboard' : 'Onboarding'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="MemberProfile" component={MemberProfileScreen} />
        <Stack.Screen name="PlanBuilder" component={PlanBuilderScreen} />
        <Stack.Screen
          name="AddMember"
          component={AddMemberModal}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
