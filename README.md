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
- **Pause:** P or Esc. Clicking outside the panel pauses too. **Sound:** M, or Settings.
- Three mice getting away ends the run. Mice come out faster, and more at once, as it goes on.

## Develop

```sh
orca plugin dev load .   # load this folder into Orca; it reloads on every save
orca plugin test .       # the game rules and the shop
orca plugin validate .
```

No build step: Orca loads the TypeScript in `src/` as it is.

| File | What it has |
| --- | --- |
| `src/engine.ts` | The rules: the cat, the mice, the holes, the score. No DOM, no clock. |
| `src/shop.ts` | The coats and accessories, their prices, and buying and wearing them. |
| `src/sprites.ts`, `src/looks.ts` | The pixel art, drawn from text, and how each coat and accessory looks. |
| `src/render.ts` | The room and everything drawn in it. |
| `src/main.ts`, `src/panel.html` | The panel: the loop, input, the screens, the shop and settings, storage. |
| `src/sound.ts` | Blips made with Web Audio. |
