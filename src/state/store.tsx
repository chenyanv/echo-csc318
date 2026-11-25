import { createContext, useContext, useEffect, useReducer, useState, type Dispatch, type ReactNode } from "react";
import { reducer, type Action } from "./reducer";
import { buildPreset, type PresetKey } from "./presets";
import { STATE_VERSION, type AppState } from "./types";

const STORAGE_KEY = "echo.state";

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  return buildPreset("fresh");
}

interface Store {
  state: AppState;
  dispatch: Dispatch<Action>;
  /** Replace everything with a task's starting state (facilitator use). */
  loadPreset: (key: PresetKey) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private browsing or quota: the prototype still works, it just won't persist.
    }
  }, [state]);

  const loadPreset = (key: PresetKey) => dispatch({ type: "RESET", state: buildPreset(key) });

  return <StoreContext.Provider value={{ state, dispatch, loadPreset }}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}

/** Re-renders every `intervalMs` while `active`, for countdowns like the 10-second undo. */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
