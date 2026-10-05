import { useHost, type GameAppProps } from '@tugen/sdk';
import { StyleSheet, Text, View } from 'react-native';

// Пока заглушка: сборки, версии, загрузчики и запуск переезжают сюда из лаунчера (см. README)
export function App({ width, height }: GameAppProps) {
  const host = useHost();
  return (
    <View style={[styles.root, { width, height }]}>
      <Text>Minecraft</Text>
      <Text>Память компьютера: {host.system.totalMemoryMb()} МБ</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
});
