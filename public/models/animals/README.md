# Realistic runner model sources

The ten source GLB files in this directory are released under
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
| Fox | `fox.glb` | [arctic fox](https://3dassets.dev/assets/polar-tundra-and-alpine-fauna-arctic-fox-1256dd85), recoloured in the renderer |
| Monkey | `monkey.glb` | [howler monkey](https://3dassets.dev/assets/rainforest-and-jungle-fauna-howler-monkey-3da5d75c) |
| Penguin | `penguin.glb` | [gentoo penguin](https://3dassets.dev/assets/ocean-giants-kit-gentoo-penguin-ae489c9e) |

The catalogue identifies these source meshes as AI-assisted assets. The source
files contain static poses, no rig or animation. Jump Run adds its own generated
skin weights, skeleton, species-specific gait, jump pose, and coat-wind rendering
at runtime. The procedural models in `src/animal-model.js` remain only as a
fail-safe when an asset cannot be decoded.
