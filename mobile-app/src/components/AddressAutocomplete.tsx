/**
 * AddressAutocomplete component for React Native
 * Uses Google Places Autocomplete API via fetch for Expo Go compatibility.
 */

import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/lib/theme/colors';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  /** ISO 3166-1 alpha-2 country code to restrict results */
  country?: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Enter address...',
  country = 'za',
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!input || input.length < 3 || !GOOGLE_MAPS_API_KEY) {
        setPredictions([]);
        return;
      }

      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            input
          )}&types=address&components=country:${country}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        if (data.predictions) {
          setPredictions(data.predictions.slice(0, 5));
          setShowDropdown(true);
        }
      } catch {
        // Silently fail
      }
    },
    [country]
  );

  const handleChangeText = (text: string) => {
    onChange(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  const handleSelectPrediction = (prediction: Prediction) => {
    onChange(prediction.description);
    setPredictions([]);
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
        ]}
      >
        <Ionicons
          name="location-outline"
          size={18}
          color={isFocused ? colors.accent : colors.muted}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            // Delay hiding so tap can register
            setTimeout(() => setShowDropdown(false), 200);
          }}
          returnKeyType="done"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onChange('');
              setPredictions([]);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.predictionItem,
                  index < predictions.length - 1 && styles.predictionBorder,
                ]}
                onPress={() => handleSelectPrediction(item)}
              >
                <Ionicons
                  name="location-sharp"
                  size={16}
                  color={colors.accent}
                  style={styles.predictionIcon}
                />
                <View style={styles.predictionText}>
                  <Text style={styles.mainText} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.secondaryText} numberOfLines={1}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
          <View style={styles.poweredBy}>
            <Text style={styles.poweredByText}>Powered by Google</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
  },
  inputContainerFocused: {
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  predictionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  predictionIcon: {
    marginRight: 10,
  },
  predictionText: {
    flex: 1,
  },
  mainText: {
    fontSize: typography.sizes.sm,
    fontFamily:
      typography.fontFamilyForWeight[typography.weights.medium],
    color: colors.charcoal,
  },
  secondaryText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body,
    color: colors.muted,
    marginTop: 1,
  },
  poweredBy: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'flex-end',
  },
  poweredByText: {
    fontSize: 9,
    color: colors.muted,
  },
});
