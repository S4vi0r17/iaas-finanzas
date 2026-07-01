import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

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
    </Modal>
  );
}
