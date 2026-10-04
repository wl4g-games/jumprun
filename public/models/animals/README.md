# Realistic runner model sources

This directory contains fourteen source GLBs for sixteen playable runners:
Godzilla reuses `trex.glb`, Skar King reuses the chimpanzee-backed
`monkey.glb`, and every other runner (including Kong) has a dedicated source
file. The source GLBs are released under
[CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) by
[3DAssets.dev](https://3dassets.dev/). They are embedded locally so the game
does not depend on a third-party CDN at runtime.

| Runner | Local file | Source asset |
|---|---|---|
| T. rex | `trex.glb` | [tyrannosaurus](https://3dassets.dev/assets/dinosaurs-and-prehistoric-life-tyrannosaurus-394daa40) |
| Leopard | `leopard.glb` | [leopard](https://3dassets.dev/assets/savanna-wildlife-leopard-06ea5e48) |
| Rabbit | `rabbit.glb` | [house rabbit](https://3dassets.dev/assets/pets-and-companions-hd-house-rabbit-3a1d4032) |
| Lion | `lion.glb` | [adult male African lion](https://3dassets.dev/assets/exotic-wildlife-hd-african-lion-male-4417c586) |
| Elephant | `elephant.glb` | [African elephant bull](https://3dassets.dev/assets/exotic-wildlife-hd-african-elephant-bull-29d8c02f) |
| Giraffe | `giraffe.glb` | [reticulated giraffe](https://3dassets.dev/assets/exotic-wildlife-hd-reticulated-giraffe-7a2678a4) |
| Giant panda | `panda.glb` | [giant panda](https://3dassets.dev/assets/polar-tundra-and-alpine-fauna-giant-panda-6a788585) |
| Fox | `fox.glb` | [grey wolf](https://3dassets.dev/assets/exotic-wildlife-hd-grey-wolf-6a9c06f3), recoloured and proportioned as a fox in the renderer |
| Monkey | `monkey.glb` | [chimpanzee](https://3dassets.dev/assets/exotic-wildlife-hd-chimpanzee-06bf45b0), used as a naturally knuckle-running ape |
| Penguin | `penguin.glb` | [gentoo penguin](https://3dassets.dev/assets/ocean-giants-kit-gentoo-penguin-ae489c9e) |
| Tiger | `tiger.glb` | [standing Bengal tiger](https://3dassets.dev/assets/exotic-wildlife-hd-bengal-tiger-cbb738df) |
| Eagle | `eagle.glb` | [perched bald eagle](https://3dassets.dev/assets/birds-and-reptiles-hd-bald-eagle-7d265530) |
| Wild boar | `boar.glb` | [warthog](https://3dassets.dev/assets/savanna-wildlife-warthog-683fe3be), recoloured and re-proportioned as a heavy wild suid |
| Kong | `kong.glb` | [silverback gorilla](https://3dassets.dev/assets/exotic-wildlife-hd-silverback-gorilla-57a5e6e1) |

The linked 3DAssets.dev pages identify these source meshes as AI-assisted
assets. Jump Run treats them as static source poses, bakes the meshes, and uses
one runtime rigging pipeline with per-runner skeleton and appendage parameters,
species gait, jump pose, and coat-wind rendering. Coats are generated shell
layers rather than authored strand hair, and the source files do not supply the
game's skeletal run animations.

Godzilla uses the local T. rex source with a separate heavy morphology, dark
materials and a procedurally generated dorsal-plate array with restrained
secondary motion. Skar King uses the local
chimpanzee source with a lean, long-armed morphology, red-brown moving coat and
a head-bone scar detail. They do not bundle or depend on third-party
film-character models. The procedural models in
`src/animal-model.js` remain only as a fail-safe when an asset cannot be decoded.
