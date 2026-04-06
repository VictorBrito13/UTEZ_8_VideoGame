import urllib.request
import os

print("Iniciando descarga de sprites originales...")

avatars_dir = os.path.join(os.path.dirname(__file__), 'public', 'avatars')
os.makedirs(avatars_dir, exist_ok=True)

urls = {
    'red.png': 'https://play.pokemonshowdown.com/sprites/trainers/red.png',
    'blue.png': 'https://play.pokemonshowdown.com/sprites/trainers/blue.png',
    'leaf.png': 'https://play.pokemonshowdown.com/sprites/trainers/leaf.png',
    'ethan.png': 'https://play.pokemonshowdown.com/sprites/trainers/ethan.png',
    'lyra.png': 'https://play.pokemonshowdown.com/sprites/trainers/lyra.png',
    'brendan.png': 'https://play.pokemonshowdown.com/sprites/trainers/brendan.png',
    'may.png': 'https://play.pokemonshowdown.com/sprites/trainers/may.png',
    'silver.png': 'https://play.pokemonshowdown.com/sprites/trainers/silver.png',
}

for name, url in urls.items():
    print(f"Descargando {name}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response, open(os.path.join(avatars_dir, name), 'wb') as out_file:
            data = response.read()
            out_file.write(data)
    except Exception as e:
        print(f"Error descargando {name}: {e}")

print("¡Descarga de sprites completada!")
