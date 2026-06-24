import { useCallback, useRef, useState } from "react";

export function usePendingActions() {
  const [pendingActions, setPendingActions] = useState({});
  const pendingActionsRef = useRef(new Set());

  const isPending = useCallback(
    (actionKey) => Boolean(pendingActions[actionKey]),
    [pendingActions]
  );

  const runPendingAction = useCallback(async (actionKey, action) => {
    if (pendingActionsRef.current.has(actionKey)) {
      return undefined;
    }

    pendingActionsRef.current.add(actionKey);
    setPendingActions((current) => ({
      ...current,
      [actionKey]: true,
    }));

    try {
      return await action();
    } finally {
      pendingActionsRef.current.delete(actionKey);
      setPendingActions((current) => {
        if (!current[actionKey]) {
          return current;
        }

        const next = { ...current };
        delete next[actionKey];
        return next;
      });
    }
  }, []);

  return { isPending, runPendingAction };
}