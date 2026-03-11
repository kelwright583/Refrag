/**
 * Create case modal component — with primary risk item
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useCreateCase } from '@/hooks/use-cases';
import { useCreateRiskItem } from '@/hooks/use-risk-items';
import { createCaseSchema } from '@/lib/validation/case';
import { ModalHeader } from '@/components/ModalHeader';
import { colors, typography } from '@/lib/theme/colors';
import { RiskType, RISK_TYPE_LABELS } from '@/lib/types/risk-item';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

interface CreateCaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RISK_TYPE_OPTIONS: { value: RiskType | ''; label: string }[] = [
  { value: '', label: 'Select risk type...' },
  { value: 'motor_vehicle', label: 'Motor Vehicle' },
  { value: 'building', label: 'Building' },
  { value: 'contents', label: 'Contents' },
  { value: 'stock', label: 'Stock' },
  { value: 'business_interruption', label: 'Business Interruption' },
  { value: 'goods_in_transit', label: 'Goods in Transit' },
  { value: 'other', label: 'Other' },
];

export function CreateCaseModal({ visible, onClose, onSuccess }: CreateCaseModalProps) {
  const [clientName, setClientName] = useState('');
  const [insurerName, setInsurerName] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [claimReference, setClaimReference] = useState('');
  const [lossDate, setLossDate] = useState('');
  const [location, setLocation] = useState('');

  // Risk item fields
  const [riskType, setRiskType] = useState<RiskType | ''>('');
  const [registration, setRegistration] = useState('');
  const [vin, setVin] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [erfNumber, setErfNumber] = useState('');
  const [riskDescription, setRiskDescription] = useState('');

  const createCase = useCreateCase();
  const createRiskItem = useCreateRiskItem();

  const resetForm = () => {
    setClientName('');
    setInsurerName('');
    setBrokerName('');
    setClaimReference('');
    setLossDate('');
    setLocation('');
    setRiskType('');
    setRegistration('');
    setVin('');
    setMake('');
    setModel('');
    setYear('');
    setPropertyAddress('');
    setErfNumber('');
    setRiskDescription('');
  };

  const buildAssetData = () => {
    if (riskType === 'motor_vehicle') {
      const data: Record<string, unknown> = {};
      if (vin) data.vin = vin;
      if (registration) data.registration = registration;
      if (make) data.make = make;
      if (model) data.model = model;
      if (year) data.year = parseInt(year);
      return data;
    }
    if (riskType === 'building') {
      const data: Record<string, unknown> = {};
      if (propertyAddress) data.address = propertyAddress;
      if (erfNumber) data.erf_number = erfNumber;
      return data;
    }
    const data: Record<string, unknown> = {};
    if (riskDescription) data.description = riskDescription;
    return data;
  };

  const handleSubmit = async () => {
    try {
      const input = createCaseSchema.parse({
        client_name: clientName,
        insurer_name: insurerName || undefined,
        broker_name: brokerName || undefined,
        claim_reference: claimReference || undefined,
        loss_date: lossDate || undefined,
        location: location || undefined,
        status: 'draft',
      });

      const newCase = await createCase.mutateAsync(input);

      // Create primary risk item if type selected
      if (riskType) {
        await createRiskItem.mutateAsync({
          case_id: newCase.id,
          is_primary: true,
          risk_type: riskType as RiskType,
          description: riskDescription || undefined,
          asset_data: buildAssetData(),
        });
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create case');
    }
  };

  const isPending = createCase.isPending || createRiskItem.isPending;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <ModalHeader title="New Case" onClose={onClose} />
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Client Name *</Text>
            <TextInput style={styles.input} value={clientName} onChangeText={setClientName} placeholder="Enter client name" />

            <Text style={styles.label}>Insurer Name</Text>
            <TextInput style={styles.input} value={insurerName} onChangeText={setInsurerName} placeholder="Enter insurer name" />

            <Text style={styles.label}>Broker Name</Text>
            <TextInput style={styles.input} value={brokerName} onChangeText={setBrokerName} placeholder="Enter broker name" />

            <Text style={styles.label}>Claim Reference</Text>
            <TextInput style={styles.input} value={claimReference} onChangeText={setClaimReference} placeholder="Enter claim reference" />

            <Text style={styles.label}>Loss Date</Text>
            <TextInput style={styles.input} value={lossDate} onChangeText={setLossDate} placeholder="YYYY-MM-DD" />

            <Text style={styles.label}>Location</Text>
            <AddressAutocomplete
              value={location}
              onChange={setLocation}
              placeholder="Enter location"
            />

            {/* Risk item section */}
            <View style={styles.riskSection}>
              <Text style={styles.sectionTitle}>Primary Risk Item</Text>

              <Text style={styles.label}>Risk Type</Text>
              <View style={styles.riskTypeRow}>
                {RISK_TYPE_OPTIONS.filter(o => o.value !== '').map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.riskTypeChip, riskType === opt.value && styles.riskTypeChipActive]}
                    onPress={() => setRiskType(riskType === opt.value ? '' : opt.value as RiskType)}
                  >
                    <Text style={[styles.riskTypeChipText, riskType === opt.value && styles.riskTypeChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {riskType === 'motor_vehicle' && (
                <View style={styles.riskFields}>
                  <Text style={styles.smallLabel}>Registration</Text>
                  <TextInput style={styles.input} value={registration} onChangeText={setRegistration} placeholder="e.g. CA 123-456" />
                  <Text style={styles.smallLabel}>VIN</Text>
                  <TextInput style={styles.input} value={vin} onChangeText={setVin} placeholder="17-character VIN" />
                  <View style={styles.row}>
                    <View style={styles.flex1}>
                      <Text style={styles.smallLabel}>Make</Text>
                      <TextInput style={styles.input} value={make} onChangeText={setMake} />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.smallLabel}>Model</Text>
                      <TextInput style={styles.input} value={model} onChangeText={setModel} />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.smallLabel}>Year</Text>
                      <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" />
                    </View>
                  </View>
                </View>
              )}

              {riskType === 'building' && (
                <View style={styles.riskFields}>
                  <Text style={styles.smallLabel}>Property Address</Text>
                  <AddressAutocomplete
                    value={propertyAddress}
                    onChange={setPropertyAddress}
                    placeholder="Enter property address"
                  />
                  <Text style={styles.smallLabel}>Erf Number</Text>
                  <TextInput style={styles.input} value={erfNumber} onChangeText={setErfNumber} />
                </View>
              )}

              {riskType && riskType !== 'motor_vehicle' && riskType !== 'building' && (
                <View style={styles.riskFields}>
                  <Text style={styles.smallLabel}>Description</Text>
                  <TextInput style={styles.input} value={riskDescription} onChangeText={setRiskDescription} placeholder="Describe the risk item" />
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isPending || !clientName.trim()}
            >
              {isPending ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilyForWeight[typography.weights.medium],
    color: colors.charcoal,
    marginBottom: 8,
    marginTop: 12,
  },
  smallLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilyForWeight[typography.weights.medium],
    color: colors.charcoal,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.body,
    backgroundColor: colors.white,
  },
  riskSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.bold],
    color: colors.charcoal,
    marginBottom: 8,
  },
  riskTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  riskTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  riskTypeChipActive: {
    borderColor: colors.copper,
    backgroundColor: colors.copper + '15',
  },
  riskTypeChipText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.slate,
  },
  riskTypeChipTextActive: {
    color: colors.copper,
    fontFamily: typography.fontFamilyForWeight[typography.weights.semibold],
  },
  riskFields: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F5F2EE',
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.semibold],
    color: colors.charcoal,
  },
  submitButton: {
    backgroundColor: colors.copper,
  },
  submitButtonText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.semibold],
    color: colors.white,
  },
});
