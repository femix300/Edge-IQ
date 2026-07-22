import { create } from 'zustand';

interface CalibrationStore {
  calibrationData: any;
  accuracyMetrics: any;
  predStats: any;
  loading: boolean;
  lastFetched: number | null;
  setCalibrationData: (data: any) => void;
  setAccuracyMetrics: (metrics: any) => void;
  setPredStats: (stats: any) => void;
  setLoading: (loading: boolean) => void;
  setLastFetched: (timestamp: number) => void;
}

export const useCalibrationStore = create<CalibrationStore>((set) => ({
  calibrationData: null,
  accuracyMetrics: null,
  predStats: null,
  loading: false,
  lastFetched: null,
  setCalibrationData: (data) => set({ calibrationData: data }),
  setAccuracyMetrics: (metrics) => set({ accuracyMetrics: metrics }),
  setPredStats: (stats) => set({ predStats: stats }),
  setLoading: (loading) => set({ loading }),
  setLastFetched: (timestamp) => set({ lastFetched: timestamp }),
}));
