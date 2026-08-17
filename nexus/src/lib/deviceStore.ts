import { create } from 'zustand';
import { DeviceProfile, VisionMode, EndpointType, IntruderPhoto } from './types';

interface NexusState {
  // Connection Status
  isWsConnected: boolean;
  activeEndpoint: EndpointType;
  wsEndpointUrl: string;
  latencyMs: number;
  
  // Multi-Device Registry
  devices: Record<number, DeviceProfile>;
  selectedDeviceIndex: number | null; // null = ALL (Broadcast Mode)
  selectedDeviceId: string;

  // Live Multi-Subsystem State Registry (per device)
  installedApps: Record<number, any[]>;
  smsThreads: Record<number, any[]>;
  appUsage: Record<number, any>;
  fileList: Record<number, any>;
  wifiNetworks: Record<number, any[]>;
  recentMedia: Record<number, any[]>;
  clipboardText: Record<number, string>;
  telephonyState: Record<number, any>;
  notifications: Record<number, any[]>;
  contactsList: Record<number, any[]>;
  torchState: Record<number, boolean>;
  gpsHistory: Record<number, any[]>;
  intruderPhotos: Record<number, IntruderPhoto[]>;
  fakeShutdownState: Record<number, boolean>;
  unlockVaultStatus: Record<number, any>;

  // Vision & Perception Engine
  activeVisionMode: VisionMode;
  isAudioStreaming: boolean;
  masterVolume: number;
  manualRotationDeg: number;
  isFillMode: boolean;
  isMirrored: boolean;

  // Logs HUD
  systemLogs: Array<{ id: string; tag: string; message: string; timestamp: number }>;

  // Actions
  setWsConnected: (connected: boolean, endpointUrl?: string) => void;
  setActiveEndpoint: (endpoint: EndpointType) => void;
  setLatency: (ms: number) => void;
  
  registerDevice: (index: number, rawData: any) => void;
  unregisterDevice: (index: number) => void;
  selectTargetDevice: (index: number | null) => void;
  
  updateTelemetry: (index: number, telemetry: any) => void;
  updateLocation: (index: number, loc: any) => void;

  setInstalledApps: (index: number, apps: any[]) => void;
  setSmsThreads: (index: number, threads: any[]) => void;
  setAppUsage: (index: number, usage: any) => void;
  setFileList: (index: number, files: any) => void;
  setWifiNetworks: (index: number, nets: any[]) => void;
  setRecentMedia: (index: number, media: any[]) => void;
  setClipboardText: (index: number, text: string) => void;
  setTelephonyState: (index: number, tel: any) => void;
  setNotifications: (index: number, notifs: any[]) => void;
  setContactsList: (index: number, contacts: any[]) => void;
  setTorchState: (index: number, state: boolean) => void;
  setGpsHistory: (index: number, breadcrumbs: any[]) => void;
  addIntruderPhoto: (index: number, photo: IntruderPhoto) => void;
  setFakeShutdownState: (index: number, active: boolean) => void;
  setUnlockVaultStatus: (index: number, status: any) => void;

  setVisionMode: (mode: VisionMode) => void;
  setAudioStreaming: (active: boolean) => void;
  setMasterVolume: (volume: number) => void;
  rotateFeed: () => void;
  toggleFillMode: () => void;
  toggleMirrorMode: () => void;

  addLog: (tag: string, message: string) => void;
  clearLogs: () => void;
}

export const useNexusStore = create<NexusState>((set, get) => ({
  isWsConnected: false,
  activeEndpoint: 'AUTO',
  wsEndpointUrl: '',
  latencyMs: 0,

  devices: {},
  selectedDeviceIndex: null,
  selectedDeviceId: 'ALL',

  installedApps: {},
  smsThreads: {},
  appUsage: {},
  fileList: {},
  wifiNetworks: {},
  recentMedia: {},
  clipboardText: {},
  telephonyState: {},
  notifications: {},
  contactsList: {},
  torchState: {},
  gpsHistory: {},
  intruderPhotos: {},
  fakeShutdownState: {},
  unlockVaultStatus: {},

  activeVisionMode: 'STOP',
  isAudioStreaming: false,
  masterVolume: 0.8,
  manualRotationDeg: 0,
  isFillMode: false,
  isMirrored: false,

  systemLogs: [],

  setWsConnected: (connected, endpointUrl) =>
    set((state) => ({
      isWsConnected: connected,
      wsEndpointUrl: endpointUrl !== undefined ? endpointUrl : state.wsEndpointUrl,
    })),

  setActiveEndpoint: (endpoint) => set({ activeEndpoint: endpoint }),
  setLatency: (ms) => set({ latencyMs: ms }),

  registerDevice: (index, rawData) => {
    set((state) => {
      const existing = state.devices[index] || {};
      const payload = rawData.payload || rawData.data || rawData;
      const model = payload.device_model || rawData.device_model || rawData.model || existing.model || (index === 0 ? 'Primary Node' : `Device #${index + 1}`);
      const name = payload.device_name || rawData.device_name || rawData.name || existing.name || (index === 0 ? 'Viraj Phone' : `Phone #${index + 1}`);
      const id = rawData.device_id || payload.device_id || rawData.id || existing.id || `device-${index}`;
      const owner = payload.device_owner || rawData.device_owner || existing.owner || (index === 0 ? 'Viraj' : `Node #${index + 1}`);
      const relation = payload.relation_with_viraj || rawData.relation_with_viraj || existing.relation || (index === 0 ? 'Viraj (Self)' : 'Family / Guardian');
      const role = payload.device_role || rawData.device_role || existing.role || (index === 0 ? 'Primary Sentinel Node' : 'Guardian Node');
      const label = name || model || existing.label || `Phone #${index + 1}`;

      const updatedDevice: DeviceProfile = {
        ...existing,
        id,
        name,
        model,
        label,
        index,
        owner,
        relation,
        role,
        isOnline: true,
        batteryPercent: payload.battery_level ?? payload.battery_percent ?? existing.batteryPercent,
        batteryTempC: payload.temperature_c ?? payload.battery_temp ?? payload.battery_temp_c ?? existing.batteryTempC,
        storageFreeGb: payload.storage_free_gb ?? payload.storage_free ?? existing.storageFreeGb,
        wifiSsid: payload.wifi_ssid ?? existing.wifiSsid,
        ramUsedMb: payload.ram_used_mb ?? payload.app_ram_used_mb ?? existing.ramUsedMb,
        isCharging: payload.is_charging ?? existing.isCharging,
        lastSeenMs: Date.now(),
      };

      let newSelected = state.selectedDeviceIndex;
      let newSelectedId = state.selectedDeviceId;
      if (newSelected === null) {
        newSelected = index;
        newSelectedId = id;
      }

      return {
        devices: {
          ...state.devices,
          [index]: updatedDevice,
        },
        selectedDeviceIndex: newSelected,
        selectedDeviceId: newSelectedId,
      };
    });
  },

  unregisterDevice: (index) => {
    set((state) => {
      const newDevices = { ...state.devices };
      delete newDevices[index];

      let newSelected = state.selectedDeviceIndex;
      let newSelectedId = state.selectedDeviceId;
      if (state.selectedDeviceIndex === index) {
        const remainingKeys = Object.keys(newDevices).map(Number);
        newSelected = remainingKeys.length > 0 ? remainingKeys[0] : null;
        newSelectedId = newSelected !== null ? newDevices[newSelected]?.id || 'ALL' : 'ALL';
      }

      return {
        devices: newDevices,
        selectedDeviceIndex: newSelected,
        selectedDeviceId: newSelectedId,
      };
    });
  },

  selectTargetDevice: (index) => {
    set((state) => {
      const dev = index !== null ? state.devices[index] : null;
      return {
        selectedDeviceIndex: index,
        selectedDeviceId: dev ? dev.id : 'ALL',
      };
    });
  },

  updateTelemetry: (index, telemetry) => {
    set((state) => {
      const existing = state.devices[index] || {
        id: `device-${index}`,
        name: 'Viraj Phone',
        model: 'Infinix X6835B',
        label: `Phone #${index + 1}`,
        index,
        owner: 'Viraj',
        relation: 'Viraj (Self)',
        role: 'Primary Mobile Node',
        isOnline: true,
        lastSeenMs: Date.now(),
      };

      const updatedDevice: DeviceProfile = {
        ...existing,
        isOnline: true,
        batteryPercent: telemetry.battery_percent ?? telemetry.battery_level ?? telemetry.batteryLevel ?? existing.batteryPercent,
        batteryTempC: telemetry.battery_temp_c ?? telemetry.temperature_c ?? telemetry.battery_temp ?? telemetry.temperatureC ?? existing.batteryTempC,
        storageFreeGb: telemetry.storage_free_gb ? `${telemetry.storage_free_gb} GB Free` : telemetry.storage_free ?? telemetry.storageFreeGb ?? existing.storageFreeGb,
        wifiSsid: telemetry.wifi_ssid ?? telemetry.wifiSsid ?? existing.wifiSsid,
        ramUsedMb: telemetry.app_ram_used_mb ?? telemetry.ram_used_mb ?? telemetry.ramUsedMb ?? existing.ramUsedMb,
        screenResolution:
          (telemetry.screen_width && telemetry.screen_height)
            ? `${telemetry.screen_width}x${telemetry.screen_height}`
            : (telemetry.screen_resolution || existing.screenResolution),
        isCharging: telemetry.is_charging ?? telemetry.isCharging ?? existing.isCharging,
        lastSeenMs: Date.now(),
      };

      return {
        devices: {
          ...state.devices,
          [index]: updatedDevice,
        },
        selectedDeviceIndex: state.selectedDeviceIndex === null ? index : state.selectedDeviceIndex,
        selectedDeviceId: state.selectedDeviceId === 'ALL' ? updatedDevice.id : state.selectedDeviceId,
      };
    });
  },

  updateLocation: (index, loc) => {
    set((state) => {
      const existing = state.devices[index] || {
        id: `device-${index}`,
        name: 'Viraj Phone',
        model: 'Infinix X6835B',
        label: `Phone #${index + 1}`,
        index,
        owner: 'Viraj',
        relation: 'Viraj (Self)',
        role: 'Primary Mobile Node',
        isOnline: true,
        lastSeenMs: Date.now(),
      };

      const updatedDevice: DeviceProfile = {
        ...existing,
        latitude: loc.latitude ?? loc.lat ?? existing.latitude ?? 28.6139,
        longitude: loc.longitude ?? loc.lon ?? existing.longitude ?? 77.209,
        altitudeM: loc.altitude ?? loc.altitude_m ?? existing.altitudeM ?? 216,
        gpsAccuracyM: loc.accuracy ?? loc.accuracy_m ?? existing.gpsAccuracyM ?? 12.5,
        gpsSpeedMps: loc.speed ?? loc.speed_mps ?? existing.gpsSpeedMps ?? 0,
        lastSeenMs: Date.now(),
      };

      return {
        devices: {
          ...state.devices,
          [index]: updatedDevice,
        },
      };
    });
  },

  setInstalledApps: (index, apps) => set((state) => ({ installedApps: { ...state.installedApps, [index]: apps } })),
  setSmsThreads: (index, threads) => set((state) => ({ smsThreads: { ...state.smsThreads, [index]: threads } })),
  setAppUsage: (index, usage) => set((state) => ({ appUsage: { ...state.appUsage, [index]: usage } })),
  setFileList: (index, files) => set((state) => ({ fileList: { ...state.fileList, [index]: files } })),
  setWifiNetworks: (index, nets) => set((state) => ({ wifiNetworks: { ...state.wifiNetworks, [index]: nets } })),
  setRecentMedia: (index, media) => set((state) => ({ recentMedia: { ...state.recentMedia, [index]: media } })),
  setClipboardText: (index, text) => set((state) => ({ clipboardText: { ...state.clipboardText, [index]: text } })),
  setTelephonyState: (index, tel) => set((state) => ({ telephonyState: { ...state.telephonyState, [index]: tel } })),
  setNotifications: (index, notifs) => set((state) => ({ notifications: { ...state.notifications, [index]: notifs } })),
  setContactsList: (index, contacts) => set((state) => ({ contactsList: { ...state.contactsList, [index]: contacts } })),
  setTorchState: (index, stateVal) => set((state) => ({ torchState: { ...state.torchState, [index]: stateVal } })),
  setGpsHistory: (index, breadcrumbs) => set((state) => ({ gpsHistory: { ...state.gpsHistory, [index]: breadcrumbs } })),
  addIntruderPhoto: (index, photo) =>
    set((state) => ({
      intruderPhotos: {
        ...state.intruderPhotos,
        [index]: [photo, ...(state.intruderPhotos[index] || [])].slice(0, 50),
      },
    })),
  setFakeShutdownState: (index, active) =>
    set((state) => ({
      fakeShutdownState: {
        ...state.fakeShutdownState,
        [index]: active,
      },
    })),
  setUnlockVaultStatus: (index, status) => set((state) => ({ unlockVaultStatus: { ...state.unlockVaultStatus, [index]: status } })),

  setVisionMode: (mode) => set({ activeVisionMode: mode }),
  setAudioStreaming: (active) => set({ isAudioStreaming: active }),
  setMasterVolume: (volume) => set({ masterVolume: volume }),
  rotateFeed: () => set((state) => ({ manualRotationDeg: (state.manualRotationDeg + 90) % 360 })),
  toggleFillMode: () => set((state) => ({ isFillMode: !state.isFillMode })),
  toggleMirrorMode: () => set((state) => ({ isMirrored: !state.isMirrored })),

  addLog: (tag, message) =>
    set((state) => ({
      systemLogs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          tag,
          message,
          timestamp: Date.now(),
        },
        ...state.systemLogs.slice(0, 199), // Keep latest 200 logs
      ],
    })),

  clearLogs: () => set({ systemLogs: [] }),
}));
