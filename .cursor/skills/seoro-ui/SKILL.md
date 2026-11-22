---
name: seoro-ui
description: >-
  SEORO (서로) web UI visual system: light surfaces with a single blue accent.
  Use when editing apps/web UI, globals.css, components, onboarding, diary,
  promises, home, or any frontend visual/layout work.
---

# SEORO UI

## Direction

Clean **light mobile web UI** with **one blue accent**. Hierarchy comes from
typography, cards, and whitespace — not multi-color chrome.

## Tokens (`apps/web/src/app/globals.css`)

| Token | Role |
|-------|------|
| `--ink` `#1A1D26` | Primary text |
| `--muted` `#6B7280` | Secondary text |
| `--bg` `#F5F7FB` | Page background |
| `--bg-subtle` `#EEF2F8` | Subtle surfaces |
| `--line` `#E5E9F0` | Borders |
| `--accent` `#2F6BFF` | Only brand accent (CTA, active, links) |
| `--accent-deep` `#1F54E0` | Pressed / strong accent |
| `--accent-soft` `#EAF0FF` | Soft accent wash (sparingly) |
| `--blush` / `--blush-deep` | Aliases of accent (legacy compat) |

## Layout

- Mobile shell `max-width: 430px`, centered.
- Generous padding; one job per section.
- Soft card shadows OK on hub surfaces (app home).
- Bottom nav: white bar, hairline top border; **active = `--accent`**, inactive = muted. Icons + labels.

## Components

- **Primary button:** solid `--accent`, white text, no multi-stop gradients.
- **Secondary:** white + `--line` border + `--ink` text.
- **Ghost:** text only, muted or ink.
- **Cards:** white surface, light border, soft shadow on hub cards.
- **Inputs:** neutral border; focus ring uses accent at low opacity.
- **Brand wordmark:** accent-colored `SEORO` / `서로`.

## Composition & Motion

- **App home:** Hero headline + progress card (ring + 4 steps) + promise row + space card.
- **Promises / document screens:** Prefer `promise-sheet` over nested card stacks where already applied.
- **Diary calendar:** Month grid as hero; selected day uses emotion orbs + trigger chips.
- **Motion budget:** Soft enter, stamp/slider where present. Honor `prefers-reduced-motion`.

## Do

- Keep emotion diary **emotion color dots** as content colors (not chrome).
- Preserve existing React structure and copy unless redesigning that screen.
- Match the home reference: clear progress, pill CTAs, icon bottom nav.

## Don't

- Rose/coral as brand accent (legacy — replaced by blue).
- Purple or multi-accent themes.
- Heavy glow / neon effects.
- Decorating every surface with accent — accent is for action/state only.
