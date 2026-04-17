import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from django.contrib.auth.models import User
from user_profile.models import Team, UserCreature
from combat.matchmaking.factory import get_matchmaking_backend

def check_status():
    print("--- User Status ---")
    for user in User.objects.all():
        try:
            team = Team.objects.get(user=user)
            creatures = team.team_creatures.count()
            print(f"User: {user.username} (ID: {user.id}), Team creatures: {creatures}")
        except Team.DoesNotExist:
            print(f"User: {user.username} (ID: {user.id}), No team found.")

    print("\n--- Battles ---")
    from combat.models import Battle
    battles = Battle.objects.all().order_by("-created_at")[:10]
    if not battles:
        print("No battles found.")
    for b in battles:
        print(f"Battle {b.id}: {b.player1.username} vs {b.player2.username}, Status: {b.status}, Created At: {b.created_at}")

if __name__ == "__main__":
    check_status()
