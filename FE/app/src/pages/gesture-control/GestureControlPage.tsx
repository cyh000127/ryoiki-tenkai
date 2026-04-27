import { DEBUG_FALLBACK_ENABLED } from "../../features/gesture-session/model/gestureInput";
import { copy } from "../../platform/i18n/catalog";
import { StatusBadge } from "../../platform/ui/StatusBadge";
import { AppShell } from "../../platform/ui/AppShell";
import { BattleGameWorkspace } from "../../widgets/battle-game/BattleGameWorkspace";

export function GestureControlPage() {
  return (
    <AppShell
      headerNotice={
        DEBUG_FALLBACK_ENABLED ? <StatusBadge tone="warning">{copy.fallbackNotice}</StatusBadge> : null
      }
    >
      <BattleGameWorkspace />
    </AppShell>
  );
}
