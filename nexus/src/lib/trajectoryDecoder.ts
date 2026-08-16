/**
 * 🛰️ Ultra-Low Bandwidth (5 kbps) Trajectory Decompressor
 *
 * Uses native Web API DecompressionStream('gzip') to decode GZIP + Integer Delta Packed
 * binary payloads received over WebSocket.
 */

export interface DecodedLocationPoint {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed: number;
  isShutdown: boolean;
  formattedTime?: string;
}

export async function decompressTrajectoryPayload(base64Str: string): Promise<DecodedLocationPoint[]> {
  if (!base64Str || typeof window === 'undefined') return [];

  try {
    // 1. Decode Base64 to binary Uint8Array
    const binaryString = atob(base64Str);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 2. Decompress GZIP Stream via Native Browser DecompressionStream
    let decompressedBuffer: ArrayBuffer;
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Response(bytes).body?.pipeThrough(new DecompressionStream('gzip'));
      if (stream) {
        decompressedBuffer = await new Response(stream).arrayBuffer();
      } else {
        return [];
      }
    } else {
      return [];
    }

    // 3. Unpack Binary Delta Integers
    const dataView = new DataView(decompressedBuffer);
    let offset = 0;

    if (decompressedBuffer.byteLength < 4) return [];

    const totalPoints = dataView.getInt32(offset, false); // Big-Endian
    offset += 4;

    const points: DecodedLocationPoint[] = [];

    let prevLat = 0;
    let prevLon = 0;
    let prevTime = 0;

    for (let i = 0; i < totalPoints; i++) {
      if (offset >= decompressedBuffer.byteLength) break;

      let time: number;
      let lat: number;
      let lon: number;

      if (i === 0) {
        // Absolute first point (8 bytes time, 4 bytes lat, 4 bytes lon)
        // High & Low 32-bit ints for 64-bit timestamp
        const highTime = dataView.getInt32(offset, false);
        const lowTime = dataView.getUint32(offset + 4, false);
        time = highTime * 4294967296 + lowTime;
        offset += 8;

        const latInt = dataView.getInt32(offset, false);
        offset += 4;
        const lonInt = dataView.getInt32(offset, false);
        offset += 4;

        lat = latInt / 100000.0;
        lon = lonInt / 100000.0;
      } else {
        // Delta offset point
        const deltaTime = dataView.getInt32(offset, false);
        offset += 4;
        const deltaLatInt = dataView.getInt32(offset, false);
        offset += 4;
        const deltaLonInt = dataView.getInt32(offset, false);
        offset += 4;

        time = prevTime + deltaTime;
        const latInt = Math.round(prevLat * 100000) + deltaLatInt;
        const lonInt = Math.round(prevLon * 100000) + deltaLonInt;

        lat = latInt / 100000.0;
        lon = lonInt / 100000.0;
      }

      const alt = dataView.getInt16(offset, false);
      offset += 2;
      const acc = dataView.getUint8(offset);
      offset += 1;
      const spd = dataView.getUint8(offset);
      offset += 1;
      const isShutdown = dataView.getUint8(offset) === 1;
      offset += 1;

      prevLat = lat;
      prevLon = lon;
      prevTime = time;

      points.push({
        timestamp: time,
        latitude: lat,
        longitude: lon,
        altitude: alt,
        accuracy: acc,
        speed: spd,
        isShutdown,
        formattedTime: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    }

    return points;
  } catch (err) {
    console.error('Failed decompressing trajectory payload:', err);
    return [];
  }
}
