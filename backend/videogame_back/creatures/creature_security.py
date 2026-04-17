"""
Creature Access Security Service
Handles validation, logging, and security for creature statistics access
"""

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from rest_framework.exceptions import NotFound, PermissionDenied
from utils.log import logger
from .models import Creature
from user_profile.models import UserCreature


class CreatureAccessError(Exception):
    """Custom exception for creature access violations"""
    pass


class CreatureSecurityService:
    """Service for managing creature access validation and security"""
    
    @staticmethod
    def validate_creature_access(user: User, creature_id: int, access_type: str = 'public') -> Creature:
        """
        Validate if user can access creature statistics
        
        Args:
            user: The user attempting to access creature
            creature_id: The creature ID to validate
            access_type: 'public' for pokedex creatures, 'private' for user creatures
            
        Returns:
            Creature: The creature object if validation passes
            
        Raises:
            NotFound: If creature ID doesn't exist
            PermissionDenied: If user doesn't have access
            CreatureAccessError: For security violations
        """
        # Log the access attempt
        logger.info(f"Creature access attempt: user={user.username}, creature_id={creature_id}, access_type={access_type}")
        
        # Validate creature ID format
        if not isinstance(creature_id, int) or creature_id <= 0:
            logger.warning(f"Invalid creature ID format: user={user.username}, creature_id={creature_id}")
            CreatureSecurityService._log_access_attempt(
                user, creature_id, 'BLOCKED', 'Invalid ID format'
            )
            raise CreatureAccessError(f"Invalid creature ID: {creature_id}")
        
        # Check if creature exists
        try:
            if access_type == 'public':
                creature = Creature.objects.get(id=creature_id)
            else:  # private
                creature = UserCreature.objects.get(id=creature_id, user=user)
        except Creature.DoesNotExist:
            CreatureSecurityService._log_access_attempt(
                user, creature_id, 'BLOCKED', 'Creature not found'
            )
            raise NotFound(f"Creature with ID {creature_id} not found")
        except UserCreature.DoesNotExist:
            CreatureSecurityService._log_access_attempt(
                user, creature_id, 'BLOCKED', 'User creature not found or access denied'
            )
            raise NotFound(f"User creature with ID {creature_id} not found")
        
        # Additional validation for private access
        if access_type == 'private':
            if hasattr(creature, 'user') and creature.user != user:
                CreatureSecurityService._log_access_attempt(
                    user, creature_id, 'BLOCKED', 'Attempted access to another user\'s creature'
                )
                raise PermissionDenied("You don't have permission to access this creature")
        
        # Success - log and return
        CreatureSecurityService._log_access_attempt(
            user, creature_id, 'SUCCESS', 'Access granted'
        )
        return creature
    
    @staticmethod
    def validate_public_creature_access(user: User, creature_id: int) -> Creature:
        """
        Validate access to public pokedex creatures
        
        Args:
            user: The user attempting access
            creature_id: The creature ID
            
        Returns:
            Creature: The creature object
        """
        return CreatureSecurityService.validate_creature_access(user, creature_id, 'public')
    
    @staticmethod
    def validate_private_creature_access(user: User, creature_id: int) -> UserCreature:
        """
        Validate access to user's private creatures
        
        Args:
            user: The user attempting access
            creature_id: The creature ID
            
        Returns:
            UserCreature: The user creature object
        """
        return CreatureSecurityService.validate_creature_access(user, creature_id, 'private')
    
    @staticmethod
    def is_valid_creature_id(creature_id) -> bool:
        """
        Check if creature ID format is valid
        
        Args:
            creature_id: The ID to validate
            
        Returns:
            bool: True if ID format is valid
        """
        try:
            id_int = int(creature_id)
            return id_int > 0
        except (ValueError, TypeError):
            return False
    
    @staticmethod
    def get_user_accessible_creatures(user: User, include_public: bool = True) -> list:
        """
        Get list of creatures accessible to the user
        
        Args:
            user: The user to check
            include_public: Whether to include public pokedex creatures
            
        Returns:
            list: Accessible creature IDs
        """
        accessible_creatures = []
        
        # Add user's private creatures
        user_creatures = UserCreature.objects.filter(user=user).values_list('id', flat=True)
        accessible_creatures.extend(user_creatures)
        
        # Add public creatures if requested
        if include_public:
            public_creatures = Creature.objects.all().values_list('id', flat=True)
            accessible_creatures.extend(public_creatures)
        
        return list(set(accessible_creatures))  # Remove duplicates
    
    @staticmethod
    def detect_suspicious_access_pattern(user: User, creature_ids: list) -> bool:
        """
        Detect suspicious access patterns (e.g., trying many non-existent IDs)
        
        Args:
            user: The user to check
            creature_ids: List of creature IDs being accessed
            
        Returns:
            bool: True if pattern is suspicious
        """
        if len(creature_ids) > 10:  # Threshold for suspicious activity
            existing_ids = Creature.objects.filter(id__in=creature_ids).count()
            user_creature_ids = UserCreature.objects.filter(
                user=user, id__in=creature_ids
            ).count()
            
            # If more than 50% of IDs don't exist, it's suspicious
            success_rate = (existing_ids + user_creature_ids) / len(creature_ids)
            if success_rate < 0.5:
                logger.warning(
                    f"Suspicious creature access pattern: user={user.username}, "
                    f"requested_ids={len(creature_ids)}, success_rate={success_rate}"
                )
                return True
        
        return False
    
    @staticmethod
    def _log_access_attempt(user: User, creature_id: int, action: str, reason: str = ""):
        """Log creature access attempts for security"""
        try:
            # Log to system logger
            if action == 'BLOCKED':
                logger.warning(
                    f"Blocked creature access: user={user.username}, "
                    f"creature_id={creature_id}, reason={reason}"
                )
            else:
                logger.info(
                    f"Creature {action.lower()}: user={user.username}, creature_id={creature_id}"
                )
                
        except Exception as e:
            logger.error(f"Failed to log creature access attempt: {e}")


class CreatureAccessMiddleware:
    """Middleware to detect and prevent creature access manipulation attempts"""
    
    @staticmethod
    def validate_creature_request_integrity(user: User, creature_id: int) -> bool:
        """
        Validate creature request integrity
        
        Args:
            user: The user making the request
            creature_id: The creature ID being requested
            
        Returns:
            bool: True if request appears legitimate
        """
        # Basic ID validation
        if not CreatureSecurityService.is_valid_creature_id(creature_id):
            return False
        
        # Check if user has any legitimate reason to access this creature
        accessible_creatures = CreatureSecurityService.get_user_accessible_creatures(user)
        return creature_id in accessible_creatures
