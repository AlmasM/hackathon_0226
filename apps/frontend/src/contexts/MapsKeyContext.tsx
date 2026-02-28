import { createContext, useContext } from "react";

export interface MapsKeyContextValue {
  hasMapsKey: boolean;
  mapAuthFailed: boolean;
}

export const MapsKeyContext = createContext<MapsKeyContextValue>({
  hasMapsKey: false,
  mapAuthFailed: false,
});

export function useHasMapsKey(): boolean {
  const { hasMapsKey, mapAuthFailed } = useContext(MapsKeyContext);
  return hasMapsKey && !mapAuthFailed;
}

export function useMapsKeyContext(): MapsKeyContextValue {
  return useContext(MapsKeyContext);
}
