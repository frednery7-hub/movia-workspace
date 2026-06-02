import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SearchBarProps { onMenuClick: () => void; }

export function SearchBar({ onMenuClick }: SearchBarProps) {
  return (
    <TouchableOpacity style={styles.bar} onPress={onMenuClick} activeOpacity={0.95}>
      <TouchableOpacity onPress={onMenuClick} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Feather name="menu" size={22} color="#5A5A5A" />
      </TouchableOpacity>
      <Text style={styles.placeholder}>Para onde?</Text>
      <Feather name="search" size={20} color="#5A5A5A" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56, borderRadius: 28, flexDirection: 'row',
    alignItems: 'center', paddingHorizontal: 20, gap: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.06)',
  },
  placeholder: { flex: 1, fontSize: 16, color: '#86868B', fontWeight: '400' },
});
