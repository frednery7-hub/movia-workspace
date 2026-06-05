import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SearchBarProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function SearchBar({ onMenuClick, onSearchClick }: SearchBarProps) {
  return (
    <View style={styles.bar}>
      <TouchableOpacity
        onPress={onMenuClick}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Feather name="menu" size={20} color="#6B7280" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.searchArea} onPress={onSearchClick} activeOpacity={0.7}>
        <Text style={styles.placeholder}>¿Para dónde?</Text>
        <Feather name="search" size={18} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52, borderRadius: 26, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 20, gap: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  placeholder: { flex: 1, fontSize: 15, color: '#9CA3AF', fontWeight: '400' },
});
