import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Modal que sube desde abajo (bottom sheet), como los del HTML original. */
export function BottomSheet({ visible, onClose, title, children }: Props) {
  // El Modal nativo de RN vive en su propia ventana: no hereda windowSoftInputMode
  // de la Activity, y con edge-to-edge (gradle.properties: edgeToEdgeEnabled=true)
  // adjustResize deja de mover el contenido en builds standalone (Expo Go sí lo hace,
  // por eso ahí se ve bien). El KeyboardAvoidingView de react-native-keyboard-controller
  // (no el de React Native) sí funciona dentro de un Modal y no depende de adjustResize.
  const insets = useSafeAreaInsets();
  // navigationBarTranslucent hace que el sheet dibuje por detrás de la barra de
  // navegación: con gestos el inset es chico, pero con los 3 botones es grande y
  // tapa el contenido. Sumamos el inset real + un margen fijo para que nunca quede
  // pegado ni oculto detrás de la barra, sea gestos o botones.
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
          <Pressable
            className="max-h-[90%] rounded-t-3xl bg-white p-5 dark:bg-slate-800"
            style={{ paddingBottom: insets.bottom + 20 }}
            onPress={() => {}}
          >
            {title ? (
              <Text className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">
                {title}
              </Text>
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
