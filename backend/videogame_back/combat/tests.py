from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from asgiref.sync import async_to_sync
from creatures.models import Ability, Creature, Type
from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import SimpleTestCase, TestCase
from inventory.models import Inventory, InventoryItem, Object
from user_profile.models import Ranking, Team, TeamCreature, UserCreature

from combat.battle_consumer import BattleConsumer
from combat.models import Battle


class BattleConsumerTests(TestCase):
  def setUp(self):
    cache.clear()

    self.type_normal = Type.objects.create(name="normal")

    self.player1 = User.objects.create_user(username="player1", password="pw")
    self.player2 = User.objects.create_user(username="player2", password="pw")

    self.attacker_species = self._create_creature(
      "Attacker",
      1,
      hp=120,
      attack=180,
      defense=20,
    )
    self.defender_species = self._create_creature(
      "Defender",
      2,
      hp=100,
      attack=20,
      defense=20,
    )
    self.bench_species = self._create_creature(
      "Bench",
      3,
      hp=80,
      attack=20,
      defense=20,
    )

    self.attacker_uc = UserCreature.objects.create(
      user=self.player1,
      creature=self.attacker_species,
      level=50,
      current_hp=120,
    )
    self.defender_uc = UserCreature.objects.create(
      user=self.player2,
      creature=self.defender_species,
      level=35,
      current_hp=15,
    )
    self.bench_uc = UserCreature.objects.create(
      user=self.player2,
      creature=self.bench_species,
      level=35,
      current_hp=60,
    )

    self.team1 = Team.objects.create(user=self.player1)
    TeamCreature.objects.create(team=self.team1, user_creature=self.attacker_uc)

    self.team2 = Team.objects.create(user=self.player2)
    TeamCreature.objects.create(team=self.team2, user_creature=self.defender_uc)
    TeamCreature.objects.create(team=self.team2, user_creature=self.bench_uc)

    self.inventory = Inventory.objects.create(user=self.player1)
    self.battle = Battle.objects.create(
      player1=self.player1,
      player2=self.player2,
      status=Battle.BattleStatus.PLAYING,
      current_turn=self.player1,
    )

    self.consumer = BattleConsumer()
    self.consumer._battle_id = self.battle.id
    self.consumer._battle = self.battle

  def tearDown(self):
    cache.clear()

  def _create_creature(self, name, pokedex_id, hp, attack, defense):
    return Creature.objects.create(
      name=name,
      pokedex_id=pokedex_id,
      type_1=self.type_normal,
      hp=hp,
      attack=attack,
      defense=defense,
      special_attack=attack,
      special_defense=defense,
      speed=50,
    )

  def _create_item(self, effect_type, effect_value, quantity=1):
    obj = Object.objects.create(
      name=f"{effect_type}_item",
      description="Test item",
      effect_type=effect_type,
      effect_value=effect_value,
      rarity="COMMON",
      vfx_type="HEAL",
    )
    return InventoryItem.objects.create(
      inventory=self.inventory,
      object=obj,
      quantity=quantity,
    )

  def _set_active_creatures(self):
    cache.set(
      f"battle_{self.battle.id}_p_{self.player1.id}_active",
      self.attacker_uc.id,
      timeout=3600,
    )
    cache.set(
      f"battle_{self.battle.id}_p_{self.player2.id}_active",
      self.defender_uc.id,
      timeout=3600,
    )

  def test_apply_damage_triggers_forced_switch_and_item_effects(self):
    self._set_active_creatures()
    cache.set(
      f"battle_{self.battle.id}_p_{self.player2.id}_b_{self.defender_uc.id}_focus_band",
      True,
      timeout=7200,
    )
    cache.set(
      f"battle_{self.battle.id}_p_{self.player2.id}_b_{self.defender_uc.id}_oran_berry",
      True,
      timeout=7200,
    )

    move = Ability.objects.create(name="Tackle", base_power=40, speed=0)
    result = async_to_sync(self.consumer._apply_damage)(
      self.player1,
      self.player2,
      move,
    )

    self.assertTrue(result["success"])
    self.assertFalse(result["forced_switch"])
    self.assertEqual(result["new_defender_active_id"], self.defender_uc.id)
    self.assertEqual(cache.get(
      f"battle_{self.battle.id}_p_{self.player2.id}_active"
    ), self.defender_uc.id)

    self.defender_uc.refresh_from_db()
    self.assertEqual(self.defender_uc.current_hp, 11)

  def test_apply_item_effect_covers_valid_branches(self):
    cases = (
      {
        "effect_type": "HEAL",
        "effect_value": 30,
        "quantity": 1,
        "starting_hp": 40,
        "target_id": self.attacker_uc.id,
        "expected_hp": 70,
      },
      {
        "effect_type": "REVIVE",
        "effect_value": 0.5,
        "quantity": 1,
        "starting_hp": 0,
        "target_id": self.attacker_uc.id,
        "expected_hp": 60,
      },
      {
        "effect_type": "AUTO_HEAL",
        "effect_value": 1.0,
        "quantity": 2,
        "starting_hp": 80,
        "target_id": None,
        "expected_cache": "oran_berry",
      },
      {
        "effect_type": "EQUIP_ATK",
        "effect_value": 1.0,
        "quantity": 1,
        "starting_hp": 80,
        "target_id": None,
        "expected_cache": "choice_band",
      },
      {
        "effect_type": "EQUIP_SURVIVE",
        "effect_value": 1.0,
        "quantity": 1,
        "starting_hp": 80,
        "target_id": None,
        "expected_cache": "focus_band",
      },
      {
        "effect_type": "BUFF_ATK",
        "effect_value": 0.25,
        "quantity": 1,
        "starting_hp": 80,
        "target_id": None,
        "expected_buff": ("atk", 1.25),
      },
      {
        "effect_type": "BUFF_DEF",
        "effect_value": 0.5,
        "quantity": 1,
        "starting_hp": 80,
        "target_id": None,
        "expected_buff": ("def", 1.5),
      },
      {
        "effect_type": "BUFF_SPEED",
        "effect_value": 1.0,
        "quantity": 1,
        "starting_hp": 80,
        "target_id": None,
        "expected_skip_turn": True,
      },
    )

    for case in cases:
      with self.subTest(effect=case["effect_type"]):
        cache.clear()
        self.attacker_uc.current_hp = case["starting_hp"]
        self.attacker_uc.save()
        self._set_active_creatures()

        item = self._create_item(
          case["effect_type"],
          case["effect_value"],
          quantity=case["quantity"],
        )

        result = async_to_sync(self.consumer._apply_item_effect)(
          self.player1,
          item.id,
          case["target_id"],
        )

        self.assertTrue(result["success"])

        if case.get("expected_hp") is not None:
          self.assertEqual(result["new_hp"], case["expected_hp"])
          self.assertEqual(
            result["heal_amount"],
            case["expected_hp"] - case["starting_hp"],
          )

        if case.get("expected_cache"):
          self.assertTrue(cache.get(
            f"battle_{self.battle.id}_p_{self.player1.id}_b_{self.attacker_uc.id}_{case['expected_cache']}"
          ))

        if case.get("expected_buff"):
          buff_name, expected_value = case["expected_buff"]
          self.assertEqual(result["buffs"][buff_name], expected_value)

        if case.get("expected_skip_turn"):
          self.assertTrue(cache.get(
            f"battle_{self.battle.id}_p_{self.player2.id}_skip_turn"
          ))

        item_exists = InventoryItem.objects.filter(id=item.id).exists()
        if case["quantity"] == 1:
          self.assertFalse(item_exists)
        else:
          self.assertTrue(item_exists)
          item.refresh_from_db()
          self.assertEqual(item.quantity, case["quantity"] - 1)

  def test_abandonment_penalizes_abandoner_and_boosts_stayer_elo(self):
    """Disconnecting user loses ELO; remaining player gains ELO (regression)."""
    Ranking.objects.update_or_create(
      user=self.player1,
      defaults={"elo": 1000, "wins": 0, "losses": 0},
    )
    Ranking.objects.update_or_create(
      user=self.player2,
      defaults={"elo": 1000, "wins": 0, "losses": 0},
    )

    self.consumer._user = self.player1
    self.consumer.channel_layer = SimpleNamespace(group_send=AsyncMock())

    with patch.object(
      BattleConsumer,
      "_award_all_rewards",
      new_callable=AsyncMock,
    ):
      async_to_sync(self.consumer._award_victory_by_abandonment)(self.player2)

    r_stayer = Ranking.objects.get(user=self.player2)
    r_abandoner = Ranking.objects.get(user=self.player1)
    self.assertGreater(r_stayer.elo, 1000)
    self.assertLess(r_abandoner.elo, 1000)
    self.assertEqual(r_stayer.wins, 1)
    self.assertEqual(r_stayer.losses, 0)
    self.assertEqual(r_abandoner.losses, 1)
    self.assertEqual(r_abandoner.wins, 0)

    self.battle.refresh_from_db()
    self.assertEqual(self.battle.winner_id, self.player2.id)

  def test_broadcast_battle_state_after_finish_no_lazy_orm_error(self):
    """Regression: broadcast must not hit sync ORM from async (winner FK)."""
    from combat.models import Battle

    self.battle.status = Battle.BattleStatus.FINISHED
    self.battle.winner = self.player2
    self.battle.save()
    self.consumer.channel_layer = SimpleNamespace(group_send=AsyncMock())

    async_to_sync(self.consumer._broadcast_battle_state_to_group)()

    self.consumer.channel_layer.group_send.assert_awaited_once()
    call_kw = self.consumer.channel_layer.group_send.call_args[0][1]
    payload = call_kw["payload"]
    self.assertEqual(payload["winner_id"], self.player2.id)
    self.assertEqual(payload["status"], Battle.BattleStatus.FINISHED)

  def test_abandonment_elo_when_player_two_abandons(self):
    Ranking.objects.update_or_create(
      user=self.player1,
      defaults={"elo": 1000, "wins": 0, "losses": 0},
    )
    Ranking.objects.update_or_create(
      user=self.player2,
      defaults={"elo": 1000, "wins": 0, "losses": 0},
    )

    self.consumer._user = self.player2
    self.consumer.channel_layer = SimpleNamespace(group_send=AsyncMock())

    with patch.object(
      BattleConsumer,
      "_award_all_rewards",
      new_callable=AsyncMock,
    ):
      async_to_sync(self.consumer._award_victory_by_abandonment)(self.player1)

    r1 = Ranking.objects.get(user=self.player1)
    r2 = Ranking.objects.get(user=self.player2)
    self.assertGreater(r1.elo, 1000)
    self.assertLess(r2.elo, 1000)
    self.assertEqual(r1.wins, 1)
    self.assertEqual(r2.losses, 1)

  def test_item_helpers_cover_target_resolution_and_validation_errors(self):
    self.assertEqual(
      self.consumer._resolve_item_target_sync(self.player1, 9999)["error"],
      "Target creature not found",
    )

    cache.clear()
    self.assertEqual(
      self.consumer._resolve_item_target_sync(self.player1, None)["error"],
      "No active creature to use item on",
    )

    self.attacker_uc.current_hp = 0
    self.attacker_uc.save()

    self.assertEqual(
      self.consumer._validate_item_target_sync("HEAL", self.attacker_uc),
      "Cannot use this item on fainted creatures",
    )
    self.assertEqual(
      self.consumer._validate_item_target_sync("REVIVE", self.bench_uc),
      "Cannot use revive on a conscious creature",
    )

    unsupported = SimpleNamespace(
      effect_type="UNKNOWN",
      effect_value=1,
      name="mystery",
      vfx_type="HEAL",
    )
    self.assertFalse(
      self.consumer._apply_item_effect_by_type_sync(
        self.player1,
        self.attacker_uc,
        unsupported,
        {},
      )
    )


class BattleActionHandlersTests(SimpleTestCase):
  def setUp(self):
    self.consumer = BattleConsumer()
    self.consumer._battle_id = 99
    self.consumer._user = SimpleNamespace(id=1)
    self.consumer.channel_layer = SimpleNamespace(group_send=AsyncMock())
    self.consumer.send_json = AsyncMock()

  def test_handle_attack_action_success_path_ends_turn(self):
    defender = SimpleNamespace(id=2)
    self.consumer._get_next_player = AsyncMock(return_value=defender)
    self.consumer._apply_damage = AsyncMock(
      return_value={
        "success": True,
        "damage": 33,
        "defender_active_id": 20,
        "defender_hp": 50,
        "is_fainted": False,
        "defender_user_id": 2,
        "forced_switch": False,
        "new_defender_active_id": 20,
        "all_fainted": False,
      }
    )
    self.consumer._award_victory_normal = AsyncMock()
    self.consumer._handle_end_turn = AsyncMock()

    async_to_sync(self.consumer._handle_attack_action)()

    self.consumer.channel_layer.group_send.assert_awaited_once()
    self.consumer._handle_end_turn.assert_awaited_once()
    self.consumer._award_victory_normal.assert_not_awaited()

  def test_handle_attack_action_awards_victory_when_all_fainted(self):
    attacker = self.consumer._user
    defender = SimpleNamespace(id=2)
    self.consumer._get_next_player = AsyncMock(return_value=defender)
    self.consumer._apply_damage = AsyncMock(
      return_value={
        "success": True,
        "damage": 10,
        "defender_active_id": 20,
        "defender_hp": 0,
        "is_fainted": True,
        "defender_user_id": 2,
        "forced_switch": False,
        "new_defender_active_id": 20,
        "all_fainted": True,
      }
    )
    self.consumer._award_victory_normal = AsyncMock()
    self.consumer._handle_end_turn = AsyncMock()

    async_to_sync(self.consumer._handle_attack_action)()

    self.consumer._award_victory_normal.assert_awaited_once_with(
      attacker,
      defender,
    )
    self.consumer._handle_end_turn.assert_not_awaited()

  def test_handle_attack_action_error_path(self):
    self.consumer._get_next_player = AsyncMock(
      return_value=SimpleNamespace(id=2),
    )
    self.consumer._apply_damage = AsyncMock(
      return_value={"success": False, "error": "boom"}
    )

    async_to_sync(self.consumer._handle_attack_action)()

    self.consumer.send_json.assert_awaited_once_with(
      {"type": "error", "message": "Attack failed: boom"}
    )

  def test_handle_use_item_action_missing_item_id(self):
    async_to_sync(self.consumer._handle_use_item_action)({"data": {}})

    self.consumer.send_json.assert_awaited_once_with(
      {"type": "error", "message": "Missing item_id for use_item"}
    )

  def test_handle_use_item_action_success_and_failure_paths(self):
    self.consumer._apply_item_effect = AsyncMock(
      return_value={
        "success": True,
        "item_name": "Potion",
        "heal_amount": 10,
        "new_hp": 60,
        "creature_id": 3,
        "vfx_type": "HEAL",
        "buffs": {"atk": 1.0},
      }
    )
    payload = {"data": {"item_id": 10, "target_id": 3}}

    async_to_sync(self.consumer._handle_use_item_action)(payload)

    self.consumer.channel_layer.group_send.assert_awaited_once()

    self.consumer.channel_layer.group_send.reset_mock()
    self.consumer.send_json.reset_mock()
    self.consumer._apply_item_effect = AsyncMock(
      return_value={"success": False, "error": "No stock"}
    )

    async_to_sync(self.consumer._handle_use_item_action)(payload)

    self.consumer.send_json.assert_awaited_once_with(
      {"type": "error", "message": "Item failed: No stock"}
    )

  def test_handle_swap_action_paths(self):
    async_to_sync(self.consumer._handle_swap_action)({"data": {}})
    self.consumer.send_json.assert_awaited_once_with(
      {"type": "error", "message": "Missing creature_id for swap"}
    )

    self.consumer.send_json.reset_mock()
    self.consumer._cache_active_creature = AsyncMock(return_value=True)
    payload = {"data": {"creature_id": 77}}
    async_to_sync(self.consumer._handle_swap_action)(payload)
    self.consumer.channel_layer.group_send.assert_awaited_once()

    self.consumer.channel_layer.group_send.reset_mock()
    self.consumer._cache_active_creature = AsyncMock(return_value=False)
    async_to_sync(self.consumer._handle_swap_action)(payload)
    self.consumer.send_json.assert_awaited_once_with(
      {
        "type": "error",
        "message": "Swap failed: Creature does not belong to you or is fainted",
      }
    )

  def test_handle_battle_action_dispatch_and_exception_paths(self):
    payload = {"action": "attack", "data": {}}
    self.consumer._validate_action = AsyncMock(return_value=True)
    self.consumer._handle_attack_action = AsyncMock()
    self.consumer._handle_use_item_action = AsyncMock()
    self.consumer._handle_swap_action = AsyncMock()
    self.consumer._broadcast_action = AsyncMock()

    async_to_sync(self.consumer._handle_battle_action)(payload)
    self.consumer._handle_attack_action.assert_awaited_once()

    self.consumer._handle_attack_action.reset_mock()
    self.consumer._validate_action = AsyncMock(return_value=False)
    async_to_sync(self.consumer._handle_battle_action)(payload)
    self.consumer._handle_attack_action.assert_not_awaited()

    self.consumer._validate_action = AsyncMock(return_value=True)
    self.consumer._handle_attack_action = AsyncMock(
      side_effect=RuntimeError("x"),
    )
    with patch("combat.battle_consumer.logger.exception") as mock_exception:
      async_to_sync(self.consumer._handle_battle_action)(payload)

    mock_exception.assert_called_once()
    self.consumer.send_json.assert_awaited_with(
      {"type": "error", "message": "Failed to process action"}
    )

  def test_handle_start_battle_cannot_start(self):
    """Test _handle_start_battle error when battle cannot start"""
    self.consumer._can_start_battle = AsyncMock(return_value=False)
    async_to_sync(self.consumer._handle_start_battle)()
    self.consumer.send_json.assert_awaited_with(
      {"type": "error", "message": "Cannot start battle"}
    )

  def test_award_victory_by_abandonment_rejects_invalid_scenario(self):
    self.consumer._battle = SimpleNamespace(status=Battle.BattleStatus.PLAYING)
    self.consumer._validate_abandonment_scenario_async = AsyncMock(
      return_value=False
    )

    async_to_sync(self.consumer._award_victory_by_abandonment)(
      SimpleNamespace(id=2, username="winner")
    )

    self.consumer.send_json.assert_awaited_with(
      {
        "type": "error",
        "message": "Invalid abandonment scenario detected",
      }
    )

  def test_award_victory_by_abandonment_handles_finalize_failure(self):
    self.consumer._battle = SimpleNamespace(status=Battle.BattleStatus.PLAYING)
    self.consumer._validate_abandonment_scenario_async = AsyncMock(
      return_value=True
    )
    self.consumer._finalize_battle_sync = AsyncMock(
      return_value={"success": False, "error": "db_error"}
    )
    self.consumer._refresh_battle_sync = AsyncMock()

    async_to_sync(self.consumer._award_victory_by_abandonment)(
      SimpleNamespace(id=2, username="winner")
    )

    self.consumer._refresh_battle_sync.assert_not_awaited()
