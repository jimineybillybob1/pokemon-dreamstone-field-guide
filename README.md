# Dreamstone Field Guide

An offline capture guide and progress tracker for **Pokémon Dreamstone Mysteries**, generated from
`Dreamstone Mysteries _ Dex (temporary).xlsx`.

**Live guide:** https://jimineybillybob1.github.io/pokemon-dreamstone-field-guide/

Open `index.html` in a browser. The guide includes:

- A searchable and filterable 315-entry Pokédex
- Pokémon types and clickable direct evolution links
- Persistent light and dark themes
- Sticky search and quick location filters
- A route-by-route capture view
- Persistent caught tracking using browser local storage
- Notes hidden by default for a more spoiler-conscious first playthrough
- Mega Evolution choices and important-item locations from the workbook
- Local sprites, so the guide works offline

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

## Credits

- Encounter data: the supplied Dreamstone Mysteries temporary dex
- Type and direct evolution metadata: [PokéAPI](https://pokeapi.co/)
- Box sprites: [msikma/pokesprite](https://github.com/msikma/pokesprite)
- Gen 9 fallback sprites: [PokeAPI/sprites](https://github.com/PokeAPI/sprites)

Pokémon images are © Nintendo / Creatures Inc. / GAME FREAK Inc.
