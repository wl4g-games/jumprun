# Animal call audio credits

The game code is MIT licensed, but the recordings in `animal-calls/` keep the
licenses listed below. Playback uses short, level-matched excerpts; collision
feedback uses one synthesized comic jingle from `src/animal-audio.js`.

| Game animal | Local file | Recording and source | License |
|---|---|---|---|
| T. rex | `trex-alligator.ogg` | US Fish & Wildlife Service, [American alligator bellow](https://commons.wikimedia.org/wiki/File:27alligator2bellow.ogg) | Public domain, US Government work |
| Leopard | `leopard.mp3` | Günter Tembrock / Tierstimmenarchiv, [Amur leopard call series](https://suche.tierstimmenarchiv.de/search/showdetails.html?from_search=true&language=english&unique_identifier=TSA%3A1634_Amurleopard_Rufreihe) | [CC BY-SA 3.0 DE](https://creativecommons.org/licenses/by-sa/3.0/de/) |
| Rabbit | `rabbit.wav` | kessir, [Rabbit oinks and squeaks](https://commons.wikimedia.org/wiki/File:Rabbit_oinks_and_squeaks.wav) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| Lion | `lion.ogg` | த*உழவன் (Info-farmer), [Lion roaring in Tamil Nadu](https://commons.wikimedia.org/wiki/File:Lion_raring-sound1TamilNadu178.ogg) | Public domain, released by the creator |
| Elephant | `elephant.ogg` | King L, Soltis J, Douglas-Hamilton I, Savage A, and Vollrath F, [African elephant alarm call](https://commons.wikimedia.org/wiki/File:Bee-Threat-Elicits-Alarm-Call-in-African-Elephants-pone.0010346.s003.ogg) | [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/) |
| Giraffe | `giraffe.oga` | Anton Baotic, Florian Sicks, and Angela S. Stoeger, [Giraffe hum](https://commons.wikimedia.org/wiki/File:Giraffehum2.oga) | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| Giant panda | `panda-growl.mp3` | Charlton, Owen, Zhou, Zhang, and Swaisgood, [male giant panda growl, S5 Audio](https://doi.org/10.1371/journal.pone.0225772.s005) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Fox | `fox.mp3` | Günter Tembrock / Tierstimmenarchiv, [Silver fox rhythmic call series](https://suche.tierstimmenarchiv.de/search/showdetails.html?from_search=true&language=english&unique_identifier=TSA%3A1264_Silberfuchs_Faehe_rhythmische_Lautfolge) | [CC BY-SA 3.0 DE](https://creativecommons.org/licenses/by-sa/3.0/de/) |
| Monkey | `monkey.ogg` | Karim Ouattara, Alban Lemasson, and Klaus Zuberbühler, [Campbell's monkey “hok” call](https://commons.wikimedia.org/wiki/File:Campbell%27s-Monkeys-Use-Affixation-to-Alter-Call-Meaning-pone.0007808.s001.ogg) | [CC BY 2.5](https://creativecommons.org/licenses/by/2.5/) |
| Penguin | `penguin.ogg` | Benchill, [Little penguin call](https://commons.wikimedia.org/wiki/File:Little_Penguin_(Eudyptula_minor).ogg) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) |
| Tiger | `tiger.mp3` | Günter Tembrock / Tierstimmenarchiv, [Sumatran tiger long call](https://suche.tierstimmenarchiv.de/search/showdetails.html?from_search=true&language=english&unique_identifier=TSA%3A1358_Sumatratiger_Langlaute) | [CC BY-SA 3.0 DE](https://creativecommons.org/licenses/by-sa/3.0/de/) |
| Eagle | `eagle.ogg` | US National Park Service, [Bald eagle in Yellowstone](https://commons.wikimedia.org/wiki/File:Bald_Eagle_Yellowstone_National_Park.ogg) | Public domain, US Government work |
| Wild boar | `boar-grunt.mp3` | Maigrot, Hillmann, and Briefer, [wild boar grunt, Audio S1](https://doi.org/10.3390/ani8060085) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Godzilla-inspired titan | `trex-alligator.ogg` | Uses the same science-inspired alligator source as T. rex, pitch-shifted lower | Public domain, US Government work |
| Kong | `kong-gorilla.mp3` | Salmi, Szczupider, and Carrigan, [western gorilla attention call, S1 Video](https://doi.org/10.1371/journal.pone.0271871.s003) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| Skar King | `scar-orangutan.mp3` | Lameira et al., [orangutan faux-speech, S1 Audio](https://doi.org/10.1371/journal.pone.0116136.s001) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |

`rabbit.wav` is a 0.55-second excerpt (11.72–12.27 seconds) of the CC0 source,
converted from 44.1 kHz mono float WAV to 22.05 kHz mono PCM16 with short edge fades.
Four additional mobile-sized derivatives were made as follows. MP3 encoder padding means
reported duration can differ slightly between decoders:

- `panda-growl.mp3`: the complete 0.56-second S5 growl, filtered to 55–9000 Hz,
  reduced 4 dB, edge-faded, and encoded as 44.1 kHz mono MP3.
- `boar-grunt.mp3`: the complete 0.65-second Audio S1 grunt, filtered to 55–9000 Hz,
  raised 1 dB, edge-faded, and encoded as 44.1 kHz mono MP3.
- `kong-gorilla.mp3`: 38.65–39.95 seconds of the 41.60-second S1 Video, filtered
  to 55–6000 Hz, raised 10 dB, edge-faded, downmixed, and encoded as mono MP3
  (about 1.30 s). Kong is fictional; this is a real western gorilla stand-in.
- `scar-orangutan.mp3`: 4.65–5.65 seconds of S1 Audio, filtered to 55–6500 Hz,
  reduced 3 dB, edge-faded, and encoded as mono MP3 (about 1.00 s). Skar King
  is fictional; this is a real orangutan stand-in.

The remaining local files retain their downloaded bitstreams; the game selects excerpts at playback.

No authentic T. rex recording can exist. Its in-game voice is explicitly a
science-inspired stand-in using the public-domain alligator recording, reflecting
living archosaur relatives rather than claiming to reconstruct the dinosaur's
actual call.
