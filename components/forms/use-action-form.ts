"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { initialState, type ActionState } from "@/lib/utils/action-state";

/** Wraps a Server Action: tracks pending state and fires exactly one toast per submission. */
export function useActionForm(action: (prev: ActionState, fd: FormData) => Promise<ActionState>, opts?: { onSuccess?: (s: ActionState) => void }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const last = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state.nonce || state.nonce === last.current) return;
    last.current = state.nonce;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      opts?.onSuccess?.(state);
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.nonce]);
  return { state, formAction, pending };
}
