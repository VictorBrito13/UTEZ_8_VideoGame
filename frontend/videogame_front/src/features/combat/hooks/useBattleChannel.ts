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
};

const processAttackAction = (ctx: ProcessActionContext) => {
  const damage = ctx.payload.damage as number;
  const currentBattle = ctx.battleStateRef.current;
  if (!currentBattle) return;

  const attackerTag: AnimTarget =
    ctx.playerId === currentBattle.player1.id ? "p1" : "p2";
  const victimTag: AnimTarget = attackerTag === "p1" ? "p2" : "p1";

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

      const nextTurnId =
        ctx.playerId === newState.player1.id
          ? newState.player2.id
          : newState.player1.id;
      newState.current_turn = nextTurnId;

      return newState;
    });

    const uid = ctx.myIdRef.current;
    ctx.addLogRef.current(
      `${ctx.playerId === uid ? "Tú" : "Oponente"} atacaste! Daño: ${damage}`,
    );
  }, 1000);
};

const processSwapAction = (ctx: ProcessActionContext) => {
  const targetId = ctx.payload.creature_id as number;
  ctx.setBattleState((prev) => {
    if (!prev) return prev;
    const newState = structuredClone(prev) as BattleState;
    const isP1 = ctx.playerId === newState.player1.id;
    if (isP1) {
      newState.player1.active_creature_id = targetId;
    } else {
      newState.player2.active_creature_id = targetId;
    }
    return newState;
  });
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
            setBattleState(data as unknown as BattleState);
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
                    current_turn: data.next_player_id as number,
                    turn_number: data.turn_number as number,
                  }
                : prev,
            );
            break;

          case "battle_action": {
            const action = data.action as string;
            const playerId = data.player_id as number;
            const payload = data.data as Record<string, unknown>;

            if (action === "attack") {
              processAttackAction({ playerId, payload, setBattleState, battleStateRef, setIsAttacking, setIsHit, setFloatingDamage, myIdRef, addLogRef });
            } else if (action === "swap") {
              processSwapAction({ playerId, payload, setBattleState, battleStateRef, myIdRef, addLogRef });
            } else if (action === "use_item") {
              processUseItemAction({ playerId, payload, setBattleState, battleStateRef, setUseItemVfx, setInventory, myIdRef, addLogRef });
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
