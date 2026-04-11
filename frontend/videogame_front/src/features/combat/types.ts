export interface CreatureData {
  id: number;
  name: string;
  hp: number;
  max_hp: number;
  level: number;
  sprite: string;
  buffs?: {
    atk: number;
    def: number;
    has_choice: boolean;
    has_focus: boolean;
    has_oran: boolean;
  };
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
    effect_type: string;
    vfx_type: string;
    effect_value: number;
  };
}

export interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  text: string;
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
