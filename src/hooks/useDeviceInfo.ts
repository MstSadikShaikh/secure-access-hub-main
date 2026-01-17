import { useState, useEffect, useCallback } from 'react';
import { getDeviceInfo, DeviceInfo } from '@/lib/device-fingerprint';
import { getCurrentLocation, LocationInfo, GeolocationError } from '@/lib/geolocation';

interface UseDeviceInfoResult {
  deviceInfo: DeviceInfo | null;
  locationInfo: LocationInfo | null;
  locationError: GeolocationError | null;
  isLoadingLocation: boolean;
  requestLocation: () => Promise<void>;
  refreshDeviceInfo: () => void;
}

export function useDeviceInfo(): UseDeviceInfoResult {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [locationError, setLocationError] = useState<GeolocationError | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Initialize device info on mount
  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
  }, []);

  // Refresh device info
  const refreshDeviceInfo = useCallback(() => {
    setDeviceInfo(getDeviceInfo());
  }, []);

  // Request location
  const requestLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    try {
      const location = await getCurrentLocation();
      setLocationInfo(location);
    } catch (error) {
      setLocationError(error as GeolocationError);
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  return {
    deviceInfo,
    locationInfo,
    locationError,
    isLoadingLocation,
    requestLocation,
    refreshDeviceInfo,
  };
}
