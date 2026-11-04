AmenoRica — local preview candidate, 2026-11-05

Preview:
  python3 -m http.server 8765 --bind 127.0.0.1
  Open http://127.0.0.1:8765/ from this folder.

No install or build is required. index.html, style.css, motion.js, patterns.js, background.js and assets/
are the deployable files. The canonical address is https://ameno.cc/.
Nothing has been published, committed or pushed.

Behavior:
- Name and role erase/retype at 80ms per letter. After the role is complete,
  hold for about one second, draw one background strip over 2.2 seconds (designer ink: 0.9 seconds),
  then begin the next name/role pair. Only one text line types at a time.
- Role font pairs alternate each round:
  developer: IBM Plex Mono / Space Grotesk
  designer: DM Sans / Unbounded
  composer: Instrument Serif / Bodoni Moda
  artist: Cormorant Garamond / Italiana
  project manager: Syne / Playfair Display
- Strips run from left to right with a gently randomized slope.
- Role patterns: syntax-colored rune words with paired brackets; one rough dry-brush ink stroke for designer;
  gray staff with scattered notes; historical-art collage (Met CC0 and additional Commons sources); plain colored square sticky notes and clocks (two notes per clock).
  Photo sources and CC0 evidence: assets/photos/SOURCES.txt.
- After all five roles, erase the entire subtitle, type And…?, hold briefly,
  then pour black ink down over the background in 1.8 seconds while erasing the name.
  Text and links always stay above the ink. Once the marks are cleared, erase And…?,
  then retype the name followed by the full subtitle, starting at developer with the alternate font pair.
- Finished marks accumulate in a single canvas bitmap within each five-role cycle.
  A fixed 4096px-or-larger canvas is centered behind the viewport. Resize
  changes only the crop, never the source bitmap; no stretching of existing marks.
  Windows larger than the initial canvas can expose its outer bounds.
  Pixel density is capped at 1.5 to limit memory usage.
- Reduced motion also disables background drawing; pause and background-tab
  suspension freeze both typing and any currently drawing strip.
- Name and role transitions alternate on one timer; they never type together.
- The blinking cursor appears only on the currently edited line.
- The vertical rule and left-aligned text form one group shifted slightly right of center within the viewport.
  All ten fonts reserve their full width; the widest keeps the rule fixed.
- Text has no shadows. The footer shows the AmenoFuri wordmark on the left
  with ugcatalog and bukichi.fans stacked tightly on the right (24px link rows),
  topped by a transparent, AI-edited cutout based on a CC0 fish-market squid photo,
  overlapping below the centered Splatoon / Fan site wordmark in Syne ExtraBold.
  The squid, wordmark, and both links share one center axis. No official Splatoon logo is used.
  The logo uses the official Instrument Serif font and blue overline from furi.ameno.cc.
  Its font is stored locally as assets/fonts/amenofuri-logo.ttf (Instrument Serif OFL).
- The subtitle is enlarged to 18–30px across screen sizes.
- Five roles erase and retype at 80ms per letter.
  Fun-driven stays fixed during role changes, then erases for the ending.
  The longest role reserves the layout width, including during the ending.
  The fixed prefix uses the same literal-space spacing as the full-line ending,
  preventing a sideways jump when deletion becomes possible.
- Reduced motion disables both cycles and cursor blinking, restores the
  full name and displays developer.
- Tab reveals Pause animation; Space toggles pause/resume.
- Background tabs suspend timers. Without JavaScript, the first view and all
  three links remain usable.
- The font files are subsets for AmenoRica only. Their OFL licenses are in
  assets/fonts/. Replace the subsets if changing the name.

Verification:
- node motion.test.cjs: 10 font/role pairings, sequential typing, paint gate,
  five-role ending/reset, pause/resume, visibility, reduced motion and failed fonts.
- node patterns.test.cjs: 3,000 left-to-right rays; focal-point square crops, restrained effects and least-density placement.
- node background.test.cjs: 50 commits, pause/resume, unchanged source on resize, cancellation and ink/reset completion.
- In-app browser: page rendered, 320px viewport had no horizontal overflow,
  keyboard pause/resume worked, no console errors observed.
- Paused desktop -> 320px -> desktop screenshots were byte-identical.
- Physical phones and other browser engines were not tested.

Future work:
Add an SSG blog after choosing the generator, content format, routes and
navigation behavior with the owner. Current HTML/CSS/JS can be reused.
No blog framework or blog navigation has been added yet.

Art source set: Theodor de Bry horned-mask dagger design, Heinrich Aldegrever
grotesque ornament, Vincent van Gogh self-portrait, Katsushika Hokusai Great Wave.
44–52px square detail crops target curated faces, masks and wave crests.
Rotation and color effects are restrained; adjacent tiles overlap minimally.
A fixed 32px coverage grid records completed strips. Each new stroke samples
96 candidate paths and selects the least occupied visible route, including
spacing around each strip. After the screen fills, accumulation continues
on the least occupied route until the end-of-cycle ink reset.

Additional works: Duchamp Fountain (1917 photograph by Alfred Stieglitz),
The Dark Side of the Moon (1973 cover), Kandinsky Composition VIII (1923),
Malevich Black Square (1915), Mondrian Composition II in Red, Blue and Yellow (1930).
The album cover and three abstract paintings use full-image aspect-fit with
original colors, no rotation or cropping; scene darkening still applies.
Individual image source assessments are recorded in assets/photos/SOURCES.txt.

Pattern checks cover token-level rune colors and balanced brackets, plain sticky-note
paper colors with clocks, and textured ink rendering for designer.

Project presentation:
- Native scroll snap with the same live project marks moving into the description layout.
- Desktop: marks on the left; descriptions on the right. Mobile: marks above descriptions.
- Reduced motion switches positions without interpolation.
- Project descriptions use owner-provided Korean copy.
- Run node --test *.test.cjs to check animation, patterns, background, and scroll progress.

Adding project groups:
Append each new .project-row inside the first .projects-screen in index.html.
Each row is one group, even if it contains multiple sites like Splatoon Fan Sites.
scroll.js keeps the first two groups on that screen and moves each next pair into
another full-height scroll-snap section, preserving order. An odd final group
gets its own section. Tall sections remain scrollable on smaller screens.
For a new group, put its logo/link directly inside its .project-slot; put its
heading and description in the adjacent .project-description article.
The three home-page marks (AmenoFuri, Splatoon Fan Sites, toys) morph into their respective introduction screens.
Home logos link to introduction headings; each heading has an external site link.
For another home-page mark, add a matching .home-slot and .project-dock .project-mark in group order, leaving its project-slot empty.

Contact & Links:
The first-screen shortcut smoothly scrolls to #contact with a native anchor; reduced motion uses an instant jump.
The contact screen stays after all automatically generated project screens.
Contact links: owner-provided email, X, Discord user profile, and GitHub.
Add each actual destination as an li > a inside .contact-links.

On screens up to 600px, home logos form a horizontal, manually scrollable loop at 22px/s.
Touch/hover/focus pauses it; wheel/touch release pauses for 1.5 seconds.
Reduced motion disables automatic movement and duplicate cycles; the animation pause button also pauses the loop.

Trackpad/mouse wheel navigation uses native browser scrolling with mandatory snapping at section boundaries.
No input lockout or one-screen-per-gesture limit. Long sections scroll freely; logo morphing follows scroll position.
Release update: Pretendard default text and native scrolling with mandatory section snapping.
