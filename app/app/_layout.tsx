import React, { useEffect } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'html, body, #root { overflow-x: hidden; max-width: 100vw; overscroll-behavior-x: none; }';
  document.head.appendChild(style);
}
import { AuthProvider, useAuth } from '../context/AuthContext';

function RootNavigationLayout() {
  const segments = useSegments();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const currentRoute = segments[0] || 'index';
    const isAuthRoute = currentRoute === 'login' || currentRoute === 'register';
    const isProtectedRoute = currentRoute === 'vault' || currentRoute === 'orders';

    if (!isAuthenticated && isProtectedRoute) {
      router.replace('/login');
    } else if (isAuthenticated && isAuthRoute) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#f4f6fa'
          },
          headerTintColor: '#0f172a',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 16
          },
          contentStyle: {
            backgroundColor: '#f4f6fa'
          }
        }}
      >
        <Stack.Screen
          name="login"
          options={{
            title: 'Sign In',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            title: 'Create Account',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="index"
          options={{
            title: 'Landeed',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="explorer"
          options={{
            title: 'Survey Explorer',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="explore"
          options={{
            title: 'Survey Explorer',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="(tabs)/explore"
          options={{
            title: 'Survey Explorer',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="terra"
          options={{
            title: 'Terra AI',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="vault"
          options={{
            title: 'Locker',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="orders"
          options={{
            title: 'My Orders',
            headerShown: false
          }}
        />
        <Stack.Screen
          name="search/[state]"
          options={{
            title: 'Land Registry Search',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen
          name="record/[id]"
          options={{
            title: 'Certified Land Record',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen
          name="escrow"
          options={{
            title: 'Safe Escrow',
            headerBackTitle: 'Back'
          }}
        />
        <Stack.Screen
          name="verify"
          options={{
            title: 'Verify Blockchain Title',
            headerBackTitle: 'Back'
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigationLayout />
    </AuthProvider>
  );
}
