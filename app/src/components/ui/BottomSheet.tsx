import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

/** Modal que sube desde abajo (bottom sheet), como los del HTML original. */
export function BottomSheet({ visible, onClose, title, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Evita que el teclado tape los inputs: en iOS empuja el sheet con padding;
          en Android se apoya en windowSoftInputMode=adjustResize del manifest. */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
          <Pressable
            className="max-h-[90%] rounded-t-3xl bg-white p-5 dark:bg-slate-800"
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
