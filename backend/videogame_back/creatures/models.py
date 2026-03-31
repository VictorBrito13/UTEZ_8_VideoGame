from django.db import models

class Pokemon(models.Model):
    """
    Base model for the 100 Pokemon from Gen 1 with normalized stats.
    """
    pokedex_id = models.IntegerField(unique=True, primary_key=True)
    name = models.CharField(max_length=100)
    
    # Normalized Stats (Target BST: 500)
    hp = models.IntegerField()
    attack = models.IntegerField()
    defense = models.IntegerField()
    special_attack = models.IntegerField()
    special_defense = models.IntegerField()
    speed = models.IntegerField()
    
    # Types
    type_1 = models.CharField(max_length=50)
    type_2 = models.CharField(max_length=50, null=True, blank=True)
    
    # Sprites (Gen 5 Animated GIF URLs)
    front_sprite = models.URLField(max_length=500)
    back_sprite = models.URLField(max_length=500)

    def __str__(self):
        return f"{self.pokedex_id} - {self.name}"

class EvolutionChain(models.Model):
    """
    Defines the evolution relationship between Pokemon.
    Only used during combat via the 'Evolve' action.
    """
    from_pokemon = models.ForeignKey(
        Pokemon, 
        related_name='evolutions', 
        on_delete=models.CASCADE
    )
    to_pokemon = models.ForeignKey(
        Pokemon, 
        related_name='pre_evolutions',
        on_delete=models.CASCADE
    )
    
    def __str__(self):
        return f"{self.from_pokemon.name} -> {self.to_pokemon.name}"
