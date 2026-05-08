import { create } from 'zustand';

interface CalibrationStore {
  calibrationData: any;
  accuracyMetrics: any;
  loading: boolean;
  setCalibrationData: (data: any) => void;
  setAccuracyMetrics: (metrics: any) => void;
  setLoading: (loading: boolean) => void;
}

export const useCalibrationStore = create<CalibrationStore>((set) => ({
  calibrationData: null,
  accuracyMetrics: null,
  loading: false,
  setCalibrationData: (data) => set({ calibrationData: data }),
  setAccuracyMetrics: (metrics) => set({ accuracyMetrics: metrics }),
  setLoading: (loading) => set({ loading }),
}));
