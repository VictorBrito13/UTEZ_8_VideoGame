import os
import django
import requests

# Set environment and setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'videogame_back.settings')
django.setup()

from creatures.models import Pokemon, EvolutionChain

def normalize_stats(stats_dict, target_bst=500):
    original_bst = sum(stats_dict.values())
    if original_bst == 0:
        return stats_dict
    
    multiplier = target_bst / original_bst
    normalized = {k: round(v * multiplier) for k, v in stats_dict.items()}
    
    # Adjust for rounding errors to ensure exact sum
    current_sum = sum(normalized.values())
    diff = target_bst - current_sum
    if diff != 0:
        # Add the difference to the highest stat to minimize impact
        highest_stat = max(normalized, key=normalized.get)
        normalized[highest_stat] += diff
        
    return normalized

def populate_pokemon():
    print("Starting Pokemon population (IDs 1-100)...")
    
    for i in range(1, 101):
        try:
            response = requests.get(f"https://pokeapi.co/api/v2/pokemon/{i}")
            data = response.json()
            
            # Extract stats
            stats = {s['stat']['name']: s['base_stat'] for s in data['stats']}
            # Map PokeAPI names to our model names
            mapped_stats = {
                'hp': stats['hp'],
                'attack': stats['attack'],
                'defense': stats['defense'],
                'special_attack': stats['special-attack'],
                'special_defense': stats['special-defense'],
                'speed': stats['speed']
            }
            
            # Normalize
            normalized = normalize_stats(mapped_stats)
            
            # Sprites (Gen 5 Animated)
            gen5_animated = data['sprites']['versions']['generation-v']['black-white']['animated']
            front = gen5_animated['front_default'] or data['sprites']['front_default']
            back = gen5_animated['back_default'] or data['sprites']['back_default']
            
            # Create or update Pokemon
            pokemon, created = Pokemon.objects.update_or_create(
                pokedex_id=i,
                defaults={
                    'name': data['name'].capitalize(),
                    'hp': normalized['hp'],
                    'attack': normalized['attack'],
                    'defense': normalized['defense'],
                    'special_attack': normalized['special_attack'],
                    'special_defense': normalized['special_defense'],
                    'speed': normalized['speed'],
                    'type_1': data['types'][0]['type']['name'],
                    'type_2': data['types'][1]['type']['name'] if len(data['types']) > 1 else None,
                    'front_sprite': front,
                    'back_sprite': back,
                }
            )
            print(f"[{i}] {'Created' if created else 'Updated'} {pokemon.name}")
            
        except Exception as e:
            print(f"Error fetching Pokemon {i}: {e}")

def populate_evolutions():
    print("\nStarting Evolution population...")
    for i in range(1, 101):
        try:
            # We fetch the species to get the evolution chain URL
            species_resp = requests.get(f"https://pokeapi.co/api/v2/pokemon-species/{i}")
            species_data = species_resp.json()
            chain_url = species_data['evolution_chain']['url']
            
            chain_resp = requests.get(chain_url)
            chain_data = chain_resp.json()
            
            # Recursive function to parse the chain
            def parse_chain(node):
                from_name = node['species']['name']
                for evolution in node['evolves_to']:
                    to_name = evolution['species']['name']
                    
                    try:
                        pk_from = Pokemon.objects.get(name__iexact=from_name)
                        pk_to = Pokemon.objects.get(name__iexact=to_name)
                        
                        # Only within 100
                        if pk_from.pokedex_id <= 100 and pk_to.pokedex_id <= 100:
                            obj, created = EvolutionChain.objects.get_or_create(
                                from_pokemon=pk_from,
                                to_pokemon=pk_to
                            )
                            if created:
                                print(f"Registered evolution: {from_name} -> {to_name}")
                    except Pokemon.DoesNotExist:
                        pass
                    
                    parse_chain(evolution)
            
            parse_chain(chain_data['chain'])
            
        except Exception as e:
            # Species might not exist or other API issues
            pass

if __name__ == "__main__":
    populate_pokemon()
    populate_evolutions()
    print("\nDone!")
