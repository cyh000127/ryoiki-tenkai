export type PlayerSession = {
  playerId: string;
  guestToken: string;
};

const storageKey = "gesture-skill.player-session";

export function loadStoredPlayerSession(): PlayerSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PlayerSession>;
    if (!parsed.playerId || !parsed.guestToken) {
      return null;
    }
    return {
      playerId: parsed.playerId,
      guestToken: parsed.guestToken
    };
  } catch {
    return null;
  }
}

export function savePlayerSession(session: PlayerSession): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearPlayerSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey);
}
