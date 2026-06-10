# Dreamstone Field Guide

An offline capture guide and progress tracker for **Pokémon Dreamstone Mysteries**. Wild encounters,
maps, base stats, moves, abilities, and learners come from Pokerex's ROM extraction; gift, special, Mega
Evolution, and item notes come from `Dreamstone Mysteries _ Dex (temporary).xlsx`.

**Live guide:** https://jimineybillybob1.github.io/pokemon-dreamstone-field-guide/

Open `index.html` in a browser. The guide includes:

- A searchable and filterable 315-entry curated Pokédex
- A 327-entry caught collection including 12 wild entries missing from the temporary dex
- 38 active Dreamstone encounter maps with exact methods, rates, levels, and time-of-day tables
- ROM-extracted base stats and BST bars on every curated Dex card
- A searchable 934-move catalogue with move details, learner compatibility, and all 19 move tutors
- A searchable 310-ability catalogue with descriptions and linked Pokémon users
- A persistent six-slot team builder with searchable Pokémon pickers, compatible moves, and retain-on-evolution movesets
- A Gym Leaders guide with opponent teams, badge tracking, trainer portraits, and selected-team weakness coverage
- A journey dashboard for capture progress, obtained badges, and the current team
- Persistent Team Builder ability selection with ability descriptions
- Live Dex-card coverage showing super-effective damage moves selected in the Team Builder
- Pokémon types and clickable direct evolution links
- Persistent light and dark themes
- Sticky search and quick location filters ordered to match the encounter atlas
- Clickable Pokémon-card locations that open the matching encounter map
- A route-by-route capture view with local map thumbnails
- Persistent caught tracking using browser local storage
- Portable versioned save-file export and import
- Optional encrypted UUID-based cloud sync across devices
- Field notes visible by default, with an optional notes-hidden toggle
- Mega Evolution choices and important-item locations from the workbook
- Local sprites, so the guide works offline
- Links to Pokerex's full-resolution maps
- iOS/iPadOS Home Screen icon and standalone web-app metadata
- Dreamstone masthead, official logo, and share preview artwork from SteamGridDB

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
sprites downloaded from `PokeAPI/sprites`. Place the public Pokerex Dreamstone export at
`tmp/pokerex-dreamstone-data.json` before rebuilding so each Dex entry receives its ROM-extracted
base stats and BST. Koraidon is absent from the extraction and uses canonical stats.

## Regenerate Pokerex Data

Place the public Pokerex Dreamstone export at `tmp/pokerex-dreamstone-data.json`, then run:

```powershell
& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'scripts\download-pokerex-assets.mjs'

& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'scripts\build-pokerex-encounters.mjs'

& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'scripts\build-pokerex-moves.mjs'

& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' `
  'scripts\build-pokerex-abilities.mjs'
```

Only Dreamstone's active custom map groups are imported into the encounter atlas. Inaccessible
inherited Emerald encounter tables are intentionally excluded; the Moves tab mirrors Pokerex's full
ROM move, learner, ability, and tutor-location extraction.

## Regenerate App Icons

Replace `assets/icons/app-icon-master.png`, then run:

```powershell
& 'C:\Users\james\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' `
  'scripts\generate-app-icons.py'
```

## Enable Encrypted Cloud Sync

The guide works without a backend: export and import are always available. Cloud sync uses the
Worker in `sync-worker/`, stores only browser-encrypted save data, and treats the UUID as the private
recovery key. Losing the UUID means losing access to that cloud save. Cloud saves expire after 400
days without a new upload.

One-time setup:

1. Create a [Cloudflare account](https://dash.cloudflare.com/) and enable a `workers.dev` subdomain
   if prompted.
2. In Cloudflare, create a Workers KV namespace named `dreamstone-field-guide-saves` and copy its
   namespace ID.
3. Create a Cloudflare API token using the **Edit Cloudflare Workers** template. It needs permission
   to deploy Workers and edit Workers KV.
4. Copy the Cloudflare account ID from the dashboard.
5. In the GitHub repository, open **Settings > Secrets and variables > Actions** and add:
   - Secret `CLOUDFLARE_API_TOKEN`
   - Secret `CLOUDFLARE_ACCOUNT_ID`
   - Variable `CLOUDFLARE_KV_NAMESPACE_ID`
6. Run the **Deploy sync Worker** workflow from the GitHub Actions tab.
7. Copy the deployed Worker URL, such as
   `https://dreamstone-field-guide-sync.<your-subdomain>.workers.dev`.
8. Add that URL as the GitHub Actions variable `DREAMSTONE_SYNC_ENDPOINT`.
9. Run the **Deploy GitHub Pages** workflow. The live guide will then enable its cloud buttons.

Relevant Cloudflare documentation:

- [Workers KV getting started](https://developers.cloudflare.com/kv/get-started/)
- [Deploy Workers with GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)

## Credits

- Wild encounters, maps, Pokémon base stats, moves, abilities, learners, and tutor locations: [Pokerex](https://pokerex.io/dreamstone-mysteries/v1.0/abilities)
- Gym rosters: [PokemonCoders](https://www.pokemoncoders.com/pokemon-dreamstone-mysteries-gym-leaders-guide/)
- Gym leader trainer sprites: [Dreamstone Mysteries source](https://github.com/dsmyst/dreamstone-mysteries)
- Gift, special, Mega Evolution, and item notes: the supplied Dreamstone Mysteries temporary dex
- Type and direct evolution metadata: [PokéAPI](https://pokeapi.co/)
- Box sprites: [msikma/pokesprite](https://github.com/msikma/pokesprite)
- Team matchup type chart: [Pokemon Database](https://pokemondb.net/type)
- Masthead, official logo, and social preview artwork: [SteamGridDB](https://www.steamgriddb.com/game/5494497), uploaded by sirensongss
- Gen 9 fallback sprites: [PokeAPI/sprites](https://github.com/PokeAPI/sprites)

Pokémon images are © Nintendo / Creatures Inc. / GAME FREAK Inc.
