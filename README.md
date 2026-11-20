# Kittens Arcade

Pixel art games played by kittens, for [Orca](https://github.com/stablyai/orca), for the wait
between agents. They run in a sandboxed panel in Orca's right sidebar, which asks only for its own
storage: best scores, coins, what you bought and whether the sound is on.

## Catching Kittens

The first game. Your kitten catches the mice that run between the holes in the wall before they
get away; each mouse is a coin, a golden one is worth five, and the coins buy new coats, hats and
collars in the shop.

### Play

- **Move:** the mouse pointer, or the arrow keys / WASD.
- **Pounce:** click or Space, a short leap with a moment to cool down.
- **Pause:** the II button at the top, P or Esc, in every game; the pause card leads back to the arcade.
  Clicking outside the panel pauses too. **Sound:** M, or Settings.
- Three mice getting away ends the run. Mice come out faster, and more at once, as it goes on.

## Kitten Pairs

Turn two cards at a time and find the matching kittens: 25 different kittens (five coats, five
hats), dealt in seven levels from 8 to 50 cards. A level opens once the one before it is done. The
clock starts with the first card and stops while the game is paused, when the cards hide; the
three fastest times of each level are kept. Each pair is a coin.

## Kitten Maze

Walk your kitten from the top-left corner to its fish in the bottom-right one. Seven levels, from
6×8 to 18×26 squares, each always the same maze so its times can be compared. Arrows or WASD take
a step (hold them to keep walking); a click on a square in line with the kitten runs it there. The
clock starts with the first step, the maze hides while paused, and the three fastest times of each
level are kept. A level is worth two coins per level number.

## Develop

```sh
orca plugin dev load .   # load this folder into Orca; it reloads on every save
orca plugin test .       # the rules of each game, the levels and the shop
orca plugin validate .
```

No build step: Orca loads the TypeScript in `src/` as it is.

| File | What it has |
| --- | --- |
| `src/main.ts`, `src/panel.html` | The arcade: its first screen, the shop, the settings, storage and the room's size. |
| `src/arcade.ts` | What the arcade gives each game, and small helpers for their screens. |
| `src/catching/` | Catching Kittens: the rules (`engine.ts`), the room and what is drawn in it, and its screen. |
| `src/pairs/` | Kitten Pairs: the deck and the rules (`engine.ts`), and its screen. |
| `src/maze/` | Kitten Maze: the mazes and the rules (`engine.ts`), and its screen. |
| `src/progress.ts`, `src/levels.ts` | Levels against the clock: which are open, their three fastest times, and their buttons and result card. |
| `src/stopwatch.ts`, `src/random.ts` | The clock of a timed level, and the seeded random numbers behind decks and mazes. |
| `src/shop.ts` | The coats and accessories, their prices, and buying and wearing them. |
| `src/sprites.ts`, `src/looks.ts` | The pixel art, drawn from text, and how each coat and accessory looks. |
| `src/sound.ts` | Blips made with Web Audio. |

[MIT licence](LICENSE).
