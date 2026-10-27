# 💣 MineBomb

A pixel-art god sandbox that runs entirely in your browser. Islands float on a tiny Earth; little civilizations
grow from huts to skyscrapers, trade, fight, colonize other islands and launch rockets. You hover above with a
hotbar full of **900+ abilities** — rain clouds, tornadoes, bombs, nukes, dragons, blessings, kaiju, candy rain,
black holes, cupid, sharknados... — and decide whether to be a kind god or a cruel one.

**Play it:** open `index.html` in any modern browser (no build step, no server needed). Or host the folder on
GitHub Pages / any static host.

## Features

- **Procedural island worlds** – seeds, sizes (tiny → colossal), shapes (earth, continents, archipelago, pangea, ring), climates.
- **Living civilizations** – population, food, wood, stone, iron, gold, science, culture, faith, happiness.
  10 eras from the Stone Age to the Singularity. 60+ building types: huts → straw houses → wooden houses → stone houses
  → townhouses → apartments → tower blocks → skyscrapers → arcologies, plus farms, mines in the hills, docks, factories,
  power plants, castles, missile silos, rocket pads and wonders.
- **Diplomacy & war** – relations, alliances, wars, invasions, naval colonization of other islands, secession, revolutions,
  plagues, golden ages, random events, nuclear missiles (if you let them).
- **Ecosystem** – 60+ animals with predators/prey/breeding, 70+ monsters, 30+ mythical beings, fire that spreads, lava that
  flows, rain that greens deserts, pollution, radiation, corruption, seasons, day/night, weather.
- **900+ abilities** in 14 categories (Weather, Terrain, Nature, Creatures, Monsters, People, Civilization, Destruction,
  Blessings, Magic, Technology, Global, Fun, Tools). Inventory with search, favorites, loadouts and a 10-slot hotbar.
- **Creative or Challenge mode** – abilities are free, or cost divine power that worshipping civs replenish.
- **Multiple worlds** saved to `localStorage`, autosave, **export/import worlds as JSON**, screenshots, achievements.
- **Chronicle** of everything that happens, civilization inspector, statistics with population graphs, data overlays.

## Controls

| Input | Action |
| --- | --- |
| Left click / drag | Use selected ability (paint abilities repeat while held) |
| Right drag / middle drag | Pan |
| Right click (no drag), Shift+click | Inspect tile / creature / civilization |
| Scroll | Zoom · Shift+scroll or `[` `]` brush size |
| `1`-`9`, `0` | Hotbar slots · `E` abilities · `C` civs · `L` chronicle · `H` help |
| `Space` | Pause · `+`/`-` speed · `Tab` next capital · `F` stop following |
| `G` `B` `N` `O` | Grid / borders / names / data overlay · `M` mute · `P` screenshot |
| `Ctrl+S` | Save · `Ctrl+Z` restore snapshot · `Esc` close panel / world menu |
| Touch | Tap to use, drag to pan, pinch to zoom |

## Project layout

```
index.html        page shell
css/style.css     UI
js/util.js        RNG, noise, names, helpers
js/tiles.js       terrain definitions
js/sprites.js     pixel sprites
js/world.js       world generation, layers, environment simulation, save format
js/entities.js    creature definitions
js/ai.js, js/ai_special.js   creature behaviours
js/civs.js, js/civs_sim.js   civilization data + simulation
js/lib.js         shared effects (explosions, earthquakes, projectiles ...)
js/fx.js          particles
js/render.js      chunked pixel renderer, minimap
js/abilities*.js  the ability catalog
js/audio.js       synthesized sound effects
js/storage.js     localStorage + JSON import/export
js/ui.js          panels, hotbar, inspector
js/main.js        game loop, input, achievements
```

Everything is plain JavaScript with no dependencies.
