from django.db import models

class Type(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class Creature(models.Model):
    name = models.CharField(max_length=100)
    type = models.ForeignKey(Type, on_delete=models.CASCADE, related_name="creatures")
    base_health = models.IntegerField()
    base_damage = models.IntegerField()
    speed = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.base_health <= 0:
            raise ValueError("Health must be positive")
        if self.base_damage <= 0:
            raise ValueError("Damage must be positive")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Ability(models.Model):
    name = models.CharField(max_length=100)
    damage_multiplier = models.FloatField()
    effect = models.CharField(max_length=100, blank=True, null=True)
    effect_probability = models.FloatField()

    def clean(self):
        if not (0 <= self.effect_probability <= 1):
            raise ValueError("Probability must be between 0 and 1")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CreatureAbility(models.Model):
    creature = models.ForeignKey(Creature, on_delete=models.CASCADE)
    ability = models.ForeignKey(Ability, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('creature', 'ability')