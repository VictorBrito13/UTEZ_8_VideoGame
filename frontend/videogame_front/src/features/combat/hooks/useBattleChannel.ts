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

export function useBattleChannel({
  battleId,
  myId,
  setBattleState,
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
    const wsUrl = BASE_URL.replace("http://", "ws://").replace(
      "https://",
      "wss://",
    );

    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    const ws = new WebSocket(`${wsUrl}/ws/battle/${battleId}${qs}`);
    wsRef.current = ws;

    const handleBattleAction = (data: Record<string, unknown>) => {
      const action = data.action as string;
      const playerId = data.player_id as number;
      const payload = data.data as Record<string, unknown>;

      if (action === "attack") {
        const damage = payload.damage as number;
        const attackerId = playerId;

        setBattleState((current) => {
          if (!current) return current;
          const isAttackerP1 = attackerId === current.player1.id;
          const attackerTag = isAttackerP1 ? "p1" : "p2";
          const victimTag = isAttackerP1 ? "p2" : "p1";

          setIsAttacking(attackerTag);

          setTimeout(() => {
            setIsHit(victimTag);
            setFloatingDamage({ target: victimTag, amount: damage });
          }, 450);

          setTimeout(() => {
            setIsAttacking(null);
            setIsHit(null);
            setFloatingDamage(null);

            setBattleState((prev) => {
              if (!prev) return prev;
              const newState = structuredClone(prev) as BattleState;
              const atkUid = playerId;
              const defUid =
                (payload.defender_user_id as number | undefined) ??
                (atkUid === newState.player1.id
                  ? newState.player2.id
                  : newState.player1.id);
              const isDefP1 = defUid === newState.player1.id;
              const target = isDefP1 ? newState.player1 : newState.player2;
              const defActiveId = payload.defender_active_id as number;
              const hpAfter = payload.defender_hp as number;

              const creatureToUpdate = target.team.find(
                (c) => c.id === defActiveId,
              );
              if (creatureToUpdate) {
                creatureToUpdate.hp = Math.max(0, hpAfter);
              }
              if (payload.forced_switch && payload.new_defender_active_id) {
                target.active_creature_id = payload.new_defender_active_id as
                  | number
                  | null;
              }
              return newState;
            });
            const uid = myIdRef.current;
            addLogRef.current(
              `${playerId === uid ? "Tú" : "Oponente"} atacaste! Daño: ${damage}`,
            );
          }, 1000);

          return current;
        });
      } else if (action === "swap") {
        const targetId = payload.creature_id as number;
        setBattleState((prev) => {
          if (!prev) return prev;
          const newState = structuredClone(prev) as BattleState;
          const isP1 = playerId === newState.player1.id;
          if (isP1) {
            newState.player1.active_creature_id = targetId;
          } else {
            newState.player2.active_creature_id = targetId;
          }
          return newState;
        });
      } else if (action === "use_item") {
        const item_name = payload.item_name as string;
        const heal_amount = payload.heal_amount as number | undefined;
        const new_hp = payload.new_hp as number | undefined | null;
        const creature_id = payload.creature_id as number;
        const vfx_type = payload.vfx_type as string;
        const uid = myIdRef.current;

        setBattleState((prev) => {
          if (!prev) return prev;
          const isItemUserP1 = playerId === prev.player1.id;
          const targetTag = isItemUserP1 ? "p1" : "p2";

          setUseItemVfx({ target: targetTag, type: vfx_type });
          setTimeout(() => {
            setUseItemVfx(null);
          }, 1500);

          const newState = structuredClone(prev) as BattleState;
          const p = isItemUserP1 ? newState.player1 : newState.player2;
          const creature = p.team.find((c) => c.id === creature_id);
          if (creature) {
            if (new_hp !== undefined && new_hp !== null) creature.hp = new_hp;
            if (payload.buffs) {
              creature.buffs = payload.buffs as NonNullable<
                CreatureData["buffs"]
              >;
            }
          }
          return newState;
        });

        let logMsg = `${playerId === uid ? "Tú" : "Oponente"} usó ${item_name}!`;
        if (heal_amount && heal_amount > 0) logMsg += ` (+${heal_amount} HP)`;
        addLogRef.current(logMsg);

        if (playerId === uid) {
          setInventory((prev) =>
            prev
              .map((item) => {
                if (item.id === (payload.item_id as number)) {
                  return { ...item, quantity: item.quantity - 1 };
                }
                return item;
              })
              .filter((item) => item.quantity > 0),
          );
        }
      } else if (action === "skip_turn") {
        const msg = payload.message as string;
        addLogRef.current(msg);
      }
    };

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

          case "battle_action":
            handleBattleAction(data);
            break;

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
    // Intentionally only battleId: setState fns are stable; other deps caused a
    // reconnect storm when parent passed a new `addLog` every render.
  }, [battleId]);
}
