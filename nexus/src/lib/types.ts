/**
 * Ultron Nexus Core Types & Protocols
 * VirajVerse Universe #1 Brain
 */

export interface DeviceProfile {
  id: string;
  name: string;
  model: string;
  label: string;
  index: number;
  owner: string;
  relation: string;
  role: string;
  isOnline: boolean;
  batteryPercent?: number;
  batteryTempC?: number;
  storageFreeGb?: string;
  wifiSsid?: string;
  ramUsedMb?: number;
  screenResolution?: string;
  isCharging?: boolean;
  latitude?: number;
  longitude?: number;
  altitudeM?: number;
  gpsAccuracyM?: number;
  gpsSpeedMps?: number;
  fakeShutdownActive?: boolean;
  lastSeenMs: number;
}

export interface IntruderPhoto {
  id: string;
  timestamp: number;
  reason: string;
  imageBase64: string;
  deviceIndex: number;
}

export type VisionMode = 'SCREEN_VIEW' | 'SCREEN_TOUCH' | 'CAM_BACK' | 'CAM_FRONT' | 'STOP';
export type EndpointType = 'LOCAL' | 'CLOUD' | 'AUTO';

export interface OutboundPacket {
  type?: string;
  action?: string;
  target_device_index?: number;
  [key: string]: any;
}
