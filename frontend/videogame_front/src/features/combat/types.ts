export interface CreatureData {
  id: number;
  name: string;
  hp: number;
  max_hp: number;
  level: number;
  sprite: string;
}

export interface PlayerData {
  id: number;
  username: string;
  team: CreatureData[];
  active_creature_id: number | null;
  trainer_sprite: string;
}

export interface InventoryItem {
  id: number;
  quantity: number;
  object: {
    id: number;
    name: string;
    description: string;
    rarity: string;
    vfx_type: string;
    effect_value: number;
  };
}

export interface BattleState {
  battle_id: number;
  status: "waiting" | "matched" | "playing" | "finished";
  current_turn: number | null;
  turn_number: number;
  winner_id?: number | null;
  player1: PlayerData;
  player2: PlayerData;
}
