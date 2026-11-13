# Whystle Animations — channel art

Drawn with the same engine and the same character as the episodes (`shorts-studio/src/art/`), so the profile
picture and banner are unmistakably the same kid the videos are built on. Re-render everything after a tweak:

```bash
cd shorts-studio
node ..\scripts\channel-art.mjs
```

## Pick and upload (desktop browser)

1. **Profile picture — choose one** of `avatar-1-happy.png`, `avatar-2-zoom.png`, `avatar-3-cool.png`
   (800 x 800). YouTube Studio -> Your profile circle (top right) -> Settings / Customisation -> Branding ->
   **Picture -> Upload**. YouTube cuts it to a circle itself; `preview/avatar-N-circle.png` is exactly the crop
   it will show.
2. **Banner — choose one** of `banner-1-dusk.png`, `banner-2-night.png` (2560 x 1440). Same Branding page ->
   **Banner image -> Upload**. A computer shows only the centre strip; `preview/banner-N-desktop.png` is exactly
   that strip — the wordmark and the character are all inside it, so nothing gets sliced.
3. Save. Changes can take a minute to appear.

## The files

| File | What it is |
|---|---|
| `avatar-1-happy.png` | Dusk-sky portrait, smiling — the friendly default |
| `avatar-2-zoom.png` | Face fills the circle — boldest at feed size |
| `avatar-3-cool.png` | Shades + smirk on a night background — the "puzzle" look |
| `banner-1-dusk.png` | Sunset canyon, wordmark **WHYSTLE ANIMATIONS / WHAT IF…? / BIG QUESTIONS. TINY CARTOONS.**, the kid pointing at the "?", a setting sun |
| `banner-2-night.png` | Same layout at night — moon, stars, cool-blue rim light |
| `preview/avatar-N-circle.png` | How YouTube crops each avatar (circle) |
| `preview/banner-N-desktop.png` | What a computer shows of each banner (the 1546 x 423 band) |

## Specs, for reference

- Avatar: square, 800 x 800 recommended, always shown as a circle — the head sits inside a centred circle of
  radius 392, so it survives every size down to 98 px.
- Banner: min 2048 x 1152, max 6 MB — ours is 2560 x 1440 (about 1 MB). The visible-on-every-device zone is the
  centred 1546 x 423 band; all wordmark lines and the character live inside it, the sky/sun/moon and extra "?"s
  spread wider for TV.
- Both are plain PNGs, original artwork of our own character, no text logos borrowed from anyone.
