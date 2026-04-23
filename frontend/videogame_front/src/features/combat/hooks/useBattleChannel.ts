import {
  useEffect,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { BASE_URL } from "../../../common/utils/url";
import type { BattleState, CreatureData, InventoryItem } from "../types";

type AnimTarget = "p1" | "p2";

type UseBattleChannelParams = {
  battleId: string | undefined;
  myId: number | null;
  setBattleState: Dispatch<SetStateAction<BattleState | null>>;
  battleStateRef: { current: BattleState | null };
  setWinnerId: Dispatch<SetStateAction<number | null>>;
  setInventory: Dispatch<SetStateAction<InventoryItem[]>>;
  addLog: (msg: string) => void;
  setIsAttacking: Dispatch<SetStateAction<string | null>>;
  setIsHit: Dispatch<SetStateAction<string | null>>;
  setFloatingDamage: Dispatch<
    SetStateAction<{ target: AnimTarget; amount: number } | null>
  >;
  setUseItemVfx: Dispatch<
    SetStateAction<{ target: AnimTarget; type: string } | null>
  >;
  wsRef: RefObject<WebSocket | null>;
};

type ProcessActionContext = {
  playerId: number;
  payload: Record<string, unknown>;
  setBattleState: Dispatch<SetStateAction<BattleState | null>>;
  battleStateRef: { current: BattleState | null };
  setIsAttacking?: Dispatch<SetStateAction<string | null>>;
  setIsHit?: Dispatch<SetStateAction<string | null>>;
  setFloatingDamage?: Dispatch<
    SetStateAction<{ target: AnimTarget; amount: number } | null>
  >;
  setUseItemVfx?: Dispatch<
    SetStateAction<{ target: AnimTarget; type: string } | null>
  >;
  setInventory?: Dispatch<SetStateAction<InventoryItem[]>>;
  myIdRef: { current: number | null };
  addLogRef: { current: (msg: string) => void };
  isAnimatingRef: { current: boolean };
  pendingStateRef: { current: BattleState | null };
};

/**
 * Determines animation tags WITHOUT relying on battleStateRef.
 *
 * The server sends player1/player2 in every battle_state, but battle_action
 * messages only send player_id (the attacker). Because battleStateRef.current
 * may be stale when the message arrives (the useEffect that syncs it runs
 * asynchronously after rendering), we derive the attacker/victim tags from
 * myIdRef instead. The logic is simple:
 *   - If the attacker IS me  → attackerTag = myTag,  victimTag = oppTag
 *   - If the attacker is NOT me → attackerTag = oppTag, victimTag = myTag
 *
 * To know whether I am p1 or p2 we still need battleStateRef, but we fall
 * back gracefully: if the ref is still null we read from defender_user_id in
 * the payload (which the server always includes) to resolve the tags.
 */
const resolveAnimTags = (
  playerId: number,
  payload: Record<string, unknown>,
  battleStateRef: { current: BattleState | null },
  myIdRef: { current: number | null },
): { attackerTag: AnimTarget; victimTag: AnimTarget } | null => {
  const myId = myIdRef.current;

  // Happy path: we know who we are
  if (myId !== null) {
    const iAmAttacker = playerId === myId;
    // Determine if I am player1 from the cached battle state (may still be null)
    const battle = battleStateRef.current;
    const iAmP1 = battle ? battle.player1.id === myId : null;

    // battleState not yet synced to ref — derive p1/p2 from defender_user_id
    if (iAmP1 === null) {
      const defUid = payload.defender_user_id as number | undefined;
      if (defUid === undefined) return null;
      // If I am the defender, opponent (playerId) attacked me
      const iAmDefender = defUid === myId;
      if (iAmAttacker && !iAmDefender) return { attackerTag: "p1", victimTag: "p2" };
      if (!iAmAttacker && iAmDefender) return { attackerTag: "p2", victimTag: "p1" };
      return null;
    }

    const myTag: AnimTarget = iAmP1 ? "p1" : "p2";
    const oppTag: AnimTarget = iAmP1 ? "p2" : "p1";
    return {
      attackerTag: iAmAttacker ? myTag : oppTag,
      victimTag: iAmAttacker ? oppTag : myTag,
    };
  }

  // myId not loaded yet — try to determine from battleStateRef
  const battle = battleStateRef.current;
  if (!battle) return null;
  const attackerTag: AnimTarget = playerId === battle.player1.id ? "p1" : "p2";
  const victimTag: AnimTarget = attackerTag === "p1" ? "p2" : "p1";
  return { attackerTag, victimTag };
};

const processAttackAction = (ctx: ProcessActionContext) => {
  const damage = ctx.payload.damage as number;

  // Resolve animation tags — works even when battleStateRef.current is stale/null
  const tags = resolveAnimTags(
    ctx.playerId,
    ctx.payload,
    ctx.battleStateRef,
    ctx.myIdRef,
  );
  if (!tags) return; // cannot determine tags yet, skip animation

  const { attackerTag, victimTag } = tags;

  // Mark animation as in-progress so incoming battle_state messages are
  // deferred and don't wipe out the animation state mid-flight.
  ctx.isAnimatingRef.current = true;

  ctx.setIsAttacking?.(attackerTag);

  setTimeout(() => {
    ctx.setIsHit?.(victimTag);
    ctx.setFloatingDamage?.({ target: victimTag, amount: damage });
  }, 450);

  setTimeout(() => {
    ctx.setIsAttacking?.(null);
    ctx.setIsHit?.(null);
    ctx.setFloatingDamage?.(null);

    ctx.setBattleState((prev) => {
      if (!prev) return prev;
      const newState = structuredClone(prev) as BattleState;
      const defUid =
        (ctx.payload.defender_user_id as number | undefined) ??
        (ctx.playerId === newState.player1.id
          ? newState.player2.id
          : newState.player1.id);
      const isDefP1 = defUid === newState.player1.id;
      const target = isDefP1 ? newState.player1 : newState.player2;
      const defActiveId = ctx.payload.defender_active_id as number;
      const hpAfter = ctx.payload.defender_hp as number;

      const creatureToUpdate = target.team.find((c) => c.id === defActiveId);
      if (creatureToUpdate) {
        creatureToUpdate.hp = Math.max(0, hpAfter);
      }
      if (ctx.payload.forced_switch && ctx.payload.new_defender_active_id) {
        target.active_creature_id = ctx.payload.new_defender_active_id as
          | number
          | null;
      }
      return newState;
    });

    const uid = ctx.myIdRef.current;
    ctx.addLogRef.current(
      `${ctx.playerId === uid ? "Tú" : "Oponente"} atacó! Daño: ${damage}`,
    );

    // Release animation gate and flush any deferred battle_state
    ctx.isAnimatingRef.current = false;
    if (ctx.pendingStateRef.current) {
      ctx.setBattleState(ctx.pendingStateRef.current);
      ctx.pendingStateRef.current = null;
    }
  }, 1000);
};

const processSwapAction = (ctx: ProcessActionContext) => {
  const targetId = ctx.payload.creature_id as number;
  const creatureName = (ctx.payload.creature_name as string) || "otra criatura";
  const currentBattle = ctx.battleStateRef.current;
  if (!currentBattle) return;

  const trainerName =
    ctx.playerId === currentBattle.player1.id
      ? currentBattle.player1.username
      : currentBattle.player2.username;

  let changed = false;
  ctx.setBattleState((prev) => {
    if (!prev) return prev;
    const isP1 = ctx.playerId === prev.player1.id;
    const currentActiveId = isP1
      ? prev.player1.active_creature_id
      : prev.player2.active_creature_id;

    if (currentActiveId === targetId) return prev;

    changed = true;
    const newState = structuredClone(prev) as BattleState;
    if (isP1) {
      newState.player1.active_creature_id = targetId;
    } else {
      newState.player2.active_creature_id = targetId;
    }
    return newState;
  });

  if (changed) {
    ctx.addLogRef.current(`${trainerName} retiró a su criatura y envió a ${creatureName}!`);
  }
};

const processUseItemAction = (ctx: ProcessActionContext) => {
  const item_name = ctx.payload.item_name as string;
  const heal_amount = ctx.payload.heal_amount as number | undefined;
  const new_hp = ctx.payload.new_hp as number | undefined | null;
  const creature_id = ctx.payload.creature_id as number;
  const vfx_type = ctx.payload.vfx_type as string;
  const uid = ctx.myIdRef.current;

  let targetTag: AnimTarget | null = null;
  const currentBattle = ctx.battleStateRef.current;
  if (!currentBattle) return;

  ctx.setBattleState((prev) => {
    if (!prev) return prev;
    const isItemUserP1 = ctx.playerId === prev.player1.id;
    targetTag = isItemUserP1 ? "p1" : "p2";

    const newState = structuredClone(prev) as BattleState;
    const p = isItemUserP1 ? newState.player1 : newState.player2;
    const creature = p.team.find((c) => c.id === creature_id);
    if (creature) {
      if (new_hp !== undefined && new_hp !== null) creature.hp = new_hp;
      if (ctx.payload.buffs) {
        creature.buffs = ctx.payload.buffs as NonNullable<CreatureData["buffs"]>;
      }
    }
    return newState;
  });

  if (targetTag) {
    const tTag = targetTag as AnimTarget;
    ctx.setUseItemVfx?.({ target: tTag, type: vfx_type });
    setTimeout(() => {
      ctx.setUseItemVfx?.(null);
    }, 1500);
  }

  let logMsg = `${ctx.playerId === uid ? "Tú" : "Oponente"} usó ${item_name}!`;
  if (heal_amount && heal_amount > 0) logMsg += ` (+${heal_amount} HP)`;
  ctx.addLogRef.current(logMsg);

  if (ctx.playerId === uid) {
    ctx.setInventory?.((prev) =>
      prev
        .map((item) => {
          if (item.id === (ctx.payload.item_id as number)) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  }
};

export function useBattleChannel({
  battleId,
  myId,
  setBattleState,
  battleStateRef,
  setWinnerId,
  setInventory,
  addLog,
  setIsAttacking,
  setIsHit,
  setFloatingDamage,
  setUseItemVfx,
  wsRef,
}: UseBattleChannelParams) {
  const myIdRef = useRef<number | null>(null);
  const addLogRef = useRef(addLog);
  const isAnimatingRef = useRef(false);
  const pendingStateRef = useRef<BattleState | null>(null);

  useEffect(() => {
    myIdRef.current = myId;
  }, [myId]);

  useEffect(() => {
    addLogRef.current = addLog;
  }, [addLog]);

  useEffect(() => {
    if (!battleId) return;
    const token = localStorage.getItem("access_token") || "";
    const wsUrl = BASE_URL.replace("http://", "ws://").replace("https://", "wss://");

    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    const ws = new WebSocket(`${wsUrl}/ws/battle/${battleId}${qs}`);
    wsRef.current = ws;

    ws.onopen = () => {
      addLogRef.current("System: Connected to Battle Arena.");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;

        switch (data.type) {
          case "battle_state":
            // If an attack animation is playing, defer the state update so
            // it doesn't wipe out isAttacking/isHit mid-flight.
            if (isAnimatingRef.current) {
              pendingStateRef.current = data as unknown as BattleState;
            } else {
              setBattleState(data as unknown as BattleState);
            }
            if (data.status === "playing") {
              setWinnerId(null);
            }
            if (
              data.status === "finished" &&
              data.winner_id !== undefined &&
              data.winner_id !== null
            ) {
              setWinnerId(data.winner_id as number);
            }
            break;

          case "battle_started":
            setBattleState((prev) =>
              prev
                ? {
                    ...prev,
                    status: "playing",
                    current_turn: data.first_turn as number,
                  }
                : prev,
            );
            addLogRef.current("System: The battle has started!");
            break;

          case "turn_changed":
            setBattleState((prev) =>
              prev
                ? {
                    ...prev,
                    current_turn: data.next_player_id as number | null,
                    turn_number: data.turn_number as number,
                  }
                : prev,
            );
            break;

          case "player_ready":
            addLogRef.current(`System: El jugador ${data.player_id === myIdRef.current ? "tú" : "oponente"} está listo.`);
            break;

          case "action_queued":
            addLogRef.current(`System: ${data.message as string}`);
            break;

          case "battle_action": {
            const action = data.action as string;
            const playerId = data.player_id as number;
            const payload = data.data as Record<string, unknown>;

            const sharedCtx = {
              playerId,
              payload,
              setBattleState,
              battleStateRef,
              myIdRef,
              addLogRef,
              isAnimatingRef,
              pendingStateRef,
            };

            if (action === "attack") {
              processAttackAction({ ...sharedCtx, setIsAttacking, setIsHit, setFloatingDamage });
            } else if (action === "swap") {
              processSwapAction(sharedCtx);
            } else if (action === "use_item") {
              processUseItemAction({ ...sharedCtx, setUseItemVfx, setInventory });
            } else if (action === "skip_turn") {
              addLogRef.current(payload.message as string);
            }
            break;
          }

          case "battle_abandoned":
            setBattleState((prev) =>
              prev ? { ...prev, status: "finished" } : prev,
            );
            setWinnerId(data.winner_id as number);
            addLogRef.current(
              `System: ${data.winner_username as string} wins! Reason: ${data.reason as string}`,
            );
            break;

          case "error":
            addLogRef.current(`Error: ${data.message as string}`);
            break;
        }
      } catch {
        // Malformed WS payload ignored.
      }
    };

    ws.onerror = () => {
      addLogRef.current("System: Lost connection to the arena.");
    };

    return () => {
      ws.close();
    };
  }, [
    battleId,
    battleStateRef,
    setBattleState,
    setFloatingDamage,
    setInventory,
    setIsAttacking,
    setIsHit,
    setUseItemVfx,
    setWinnerId,
    wsRef,
  ]);
}
