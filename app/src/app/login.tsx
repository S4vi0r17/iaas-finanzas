import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function submit() {
    setError('');
    if (!email.trim() || !password) {
      setError('Ingresa tu email y contraseña');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error inesperado');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#2563eb]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerClassName="grow justify-center p-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Marca */}
          <View className="mb-8 items-center">
            <Text className="text-3xl font-extrabold text-white">IAAS Finanzas</Text>
            <Text className="mt-1 text-sm text-white/80">Tu tablero financiero personal</Text>
          </View>

          {/* Tarjeta */}
          <View className="rounded-3xl bg-white p-6 shadow-lg dark:bg-slate-800">
            <Text className="mb-1 text-xl font-bold text-slate-800 dark:text-slate-100">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </Text>
            <Text className="mb-5 text-sm text-slate-500 dark:text-slate-400">
              {isRegister ? 'Regístrate para empezar' : 'Bienvenido de vuelta'}
            </Text>

            {isRegister && (
              <Field
                label="Nombre"
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre"
                autoCapitalize="words"
              />
            )}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="tucorreo@ejemplo.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {error ? <Text className="mb-3 text-sm font-medium text-red-600">{error}</Text> : null}

            <Pressable
              onPress={submit}
              disabled={busy}
              className="mt-1 h-12 items-center justify-center rounded-xl bg-[#2563eb] active:opacity-80"
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">
                  {isRegister ? 'Crear cuenta' : 'Entrar'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setMode(isRegister ? 'login' : 'register');
                setError('');
              }}
              className="mt-4 items-center"
            >
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                {isRegister ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
                <Text className="font-bold text-[#2563eb]">
                  {isRegister ? 'Inicia sesión' : 'Regístrate'}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FieldProps = React.ComponentProps<typeof TextInput> & { label: string };

function Field({ label, ...props }: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </Text>
      <TextInput
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        placeholderTextColor="#94a3b8"
        {...props}
      />
    </View>
  );
}
