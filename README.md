# Dreamstone Field Guide

An offline capture guide and progress tracker for **Pokémon Dreamstone Mysteries**. Wild encounter
details and maps come from Pokerex's ROM extraction; gift, special, Mega Evolution, and item notes
come from `Dreamstone Mysteries _ Dex (temporary).xlsx`.

**Live guide:** https://jimineybillybob1.github.io/pokemon-dreamstone-field-guide/

Open `index.html` in a browser. The guide includes:

- A searchable and filterable 315-entry curated Pokédex
- A 327-entry caught collection including 12 wild entries missing from the temporary dex
- 38 active Dreamstone encounter maps with exact methods, rates, levels, and time-of-day tables
- Pokémon types and clickable direct evolution links
- Persistent light and dark themes
- Sticky search and quick location filters ordered to match the encounter atlas
- Clickable Pokémon-card locations that open the matching encounter map
- A route-by-route capture view with local map thumbnails
- Persistent caught tracking using browser local storage
- Field notes visible by default, with an optional notes-hidden toggle
- Mega Evolution choices and important-item locations from the workbook
- Local sprites, so the guide works offline
- Links to Pokerex's full-resolution maps
- iOS/iPadOS Home Screen icon and standalone web-app metadata

## Regenerate From The Workbook

The generator requires the cloned `msikma/pokesprite` repository at `vendor/pokesprite` and the
workspace Node dependencies linked at `node_modules`.

```powershell
& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'scripts\fetch-pokemon-metadata.mjs'

& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'scripts\build-guide-data.mjs' `
  'C:\path\to\Dreamstone Mysteries _ Dex (temporary).xlsx'
```

PokéSprite supplies the Gen 8-style box sprites. Species introduced after Gen 8 use local fallback
sprites downloaded from `PokeAPI/sprites`.

## Regenerate Pokerex Encounters

Place the public Pokerex Dreamstone export at `tmp/pokerex-dreamstone-data.json`, then run:

```powershell
& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'scripts\download-pokerex-assets.mjs'

& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'scripts\build-pokerex-encounters.mjs'
```

Only Dreamstone's active custom map groups are imported. Inaccessible inherited Emerald encounter
tables are intentionally excluded.

## Regenerate App Icons

Replace `assets/icons/app-icon-master.png`, then run:

```powershell
& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  'scripts\generate-app-icons.py'
```

## Credits

- Wild encounters and maps: [Pokerex](https://pokerex.io/dreamstone-mysteries/v1.0/locations)
- Gift, special, Mega Evolution, and item notes: the supplied Dreamstone Mysteries temporary dex
- Type and direct evolution metadata: [PokéAPI](https://pokeapi.co/)
- Box sprites: [msikma/pokesprite](https://github.com/msikma/pokesprite)
- Gen 9 fallback sprites: [PokeAPI/sprites](https://github.com/PokeAPI/sprites)

Pokémon images are © Nintendo / Creatures Inc. / GAME FREAK Inc.
