import base64
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, UserCreature, Team, TeamCreature, Ranking

class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for User Profile. 
    Handles Base64 photo string conversion to Binary storage.
    """
    # Expose the property for reading and a CharField for writing
    foto_base64 = serializers.CharField(required=False, allow_null=True)

    class Meta:
        model = Profile
        fields = ['trainer_sprite', 'foto_base64', 'bio', 'created_at']

    def update(self, instance, validated_data):
        # Extract the Base64 string if it exists in the request
        foto_data = validated_data.pop('foto_base64', None)
        
        if foto_data:
            # Handle the standard Data URL format: "data:image/jpeg;base64,..."
            if 'base64,' in foto_data:
                _, foto_data = foto_data.split('base64,')
            
            try:
                # Convert back to binary for storage
                instance.foto_binaria = base64.b64decode(foto_data)
            except Exception:
                raise serializers.ValidationError("Invalid Base64 format for profile picture.")
        
        return super().update(instance, validated_data)


class UserSerializer(serializers.ModelSerializer):
    """
    Complete User Serializer including Profile and Team status.
    """
    profile = ProfileSerializer(read_only=True)
    is_team_full = serializers.BooleanField(source='team.is_full', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile', 'is_team_full']


class UserCreatureSerializer(serializers.ModelSerializer):
    creature_name = serializers.ReadOnlyField(source='creature.name')
    creature_id = serializers.ReadOnlyField(source='creature.pokedex_id')
    sprite = serializers.ReadOnlyField(source='creature.front_sprite')

    class Meta:
        model = UserCreature
        fields = ['id', 'creature_id', 'creature_name', 'sprite', 'level', 'current_hp']


class TeamCreatureSerializer(serializers.ModelSerializer):
    user_creature = UserCreatureSerializer(read_only=True)

    class Meta:
        model = TeamCreature
        fields = ['id', 'user_creature']
