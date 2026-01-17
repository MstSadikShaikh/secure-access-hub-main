// Geolocation utility for fraud detection
export interface LocationInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  state?: string;
  country?: string;
  timestamp: number;
}

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED';
  message: string;
}

// Request user location
export async function getCurrentLocation(): Promise<LocationInfo> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by this browser',
      } as GeolocationError);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        let code: GeolocationError['code'];
        switch (error.code) {
          case error.PERMISSION_DENIED:
            code = 'PERMISSION_DENIED';
            break;
          case error.POSITION_UNAVAILABLE:
            code = 'POSITION_UNAVAILABLE';
            break;
          case error.TIMEOUT:
            code = 'TIMEOUT';
            break;
          default:
            code = 'POSITION_UNAVAILABLE';
        }
        reject({
          code,
          message: error.message || 'Failed to get location',
        } as GeolocationError);
      },
      {
        enableHighAccuracy: false, // Lower accuracy is faster and sufficient for fraud detection
        timeout: 10000, // 10 second timeout
        maximumAge: 300000, // Cache location for 5 minutes
      }
    );
  });
}

// Calculate distance between two coordinates in kilometers (Haversine formula)
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Check if current location is near any known locations
export function isNearKnownLocation(
  current: LocationInfo,
  knownLocations: Array<{ latitude: number; longitude: number }>,
  thresholdKm: number = 50 // Within 50km is considered "near"
): boolean {
  if (knownLocations.length === 0) return true; // No history means we can't flag

  return knownLocations.some((known) => {
    const distance = calculateDistance(
      current.latitude,
      current.longitude,
      known.latitude,
      known.longitude
    );
    return distance <= thresholdKm;
  });
}

// Get a rough location description (for display purposes)
export function getLocationDescription(location: LocationInfo): string {
  if (location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  if (location.city) {
    return location.city;
  }
  if (location.country) {
    return location.country;
  }
  return `${location.latitude.toFixed(2)}°, ${location.longitude.toFixed(2)}°`;
}
