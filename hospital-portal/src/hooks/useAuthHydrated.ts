import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";

/** Wait until Zustand persist has rehydrated session from localStorage. */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useAuth.persist.hasHydrated());

  useEffect(() => {
    setHydrated(useAuth.persist.hasHydrated());
    return useAuth.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
