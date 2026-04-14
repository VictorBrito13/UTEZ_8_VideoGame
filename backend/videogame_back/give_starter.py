import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "videogame_back.settings")
django.setup()

from creatures.models import Creature
from user_profile.models import UserCreature, User
from django.contrib.auth import get_user_model

User = get_user_model()


def give_starter():
  # Get the user (assuming the user is already registered)
  user = User.objects.first()  # Let's pick the first user for now
  if not user:
    print("No users found. Please register first.")
    return

  starters = ["Charmander", "Squirtle", "Bulbasaur", "Pikachu"]

  for s_name in starters:
    try:
      species = Creature.objects.get(name=s_name)
      # Create a user creature instance
      _, created = UserCreature.objects.get_or_create(
        user=user,
        creature=species,
        defaults={
          "level": 5,
          "current_hp": species.hp,
          "max_hp": species.hp,
        },
      )
      if created:
        print(f"Assigned {s_name} to {user.username}")
      else:
        print(f"{user.username} already has {s_name}")
    except Creature.DoesNotExist:
      print(f"Species {s_name} not found in Pokedex.")


if __name__ == "__main__":
  give_starter()
