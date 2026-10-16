import { useCallback, useEffect, useRef, useState } from "react";
export type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
};
export type LocationFailure =
  "unsupported" | "insecure" | "denied" | "timeout" | "unavailable";
export function useDeviceLocation() {
  const [location, setLocation] = useState<DeviceLocation | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<LocationFailure | null>(null);
  const version = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current++;
    };
  }, []);
  const cancel = useCallback(() => {
    version.current++;
    setBusy(false);
  }, []);
  const request = useCallback(async (): Promise<DeviceLocation | null> => {
    const id = ++version.current;
    setError(null);
    if (!window.isSecureContext) {
      setError("insecure");
      setBusy(false);
      return null;
    }
    if (!navigator.geolocation) {
      setError("unsupported");
      setBusy(false);
      return null;
    }
    setBusy(true);
    return new Promise((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (p) => {
            if (!alive.current || id !== version.current) {
              resolve(null);
              return;
            }
            const v = {
              latitude: p.coords.latitude,
              longitude: p.coords.longitude,
              accuracy: p.coords.accuracy,
              timestamp: p.timestamp,
            };
            if (
              !Number.isFinite(v.latitude) ||
              !Number.isFinite(v.longitude) ||
              !Number.isFinite(v.accuracy) ||
              Math.abs(v.latitude) > 85.05112878 ||
              Math.abs(v.longitude) > 180 ||
              v.accuracy < 0
            ) {
              setError("unavailable");
              setBusy(false);
              resolve(null);
              return;
            }
            setLocation(v);
            setBusy(false);
            resolve(v);
          },
          (e) => {
            if (alive.current && id === version.current) {
              setError(
                e.code === 1
                  ? "denied"
                  : e.code === 3
                    ? "timeout"
                    : "unavailable",
              );
              setBusy(false);
            }
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
        );
      } catch {
        setError("unavailable");
        setBusy(false);
        resolve(null);
      }
    });
  }, []);
  return { location, busy, error, request, cancel };
}
