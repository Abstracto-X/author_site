from pathlib import Path

path = Path("styles.css")

if not path.is_file():
    raise SystemExit("styles.css was not found in the current directory.")

css = path.read_text(encoding="utf-8")
original = css


def replace_once(old: str, new: str, label: str) -> None:
    global css

    count = css.count(old)

    if count != 1:
        raise SystemExit(
            f"{label}: expected exactly one match, found {count}. "
            "The file was not changed."
        )

    css = css.replace(old, new, 1)


# Home-screen chapter rows:
# retain gradients in dark mode, use solid tier-tinted surfaces in light/sepia.
replace_once(
    """  background:linear-gradient(90deg,rgba(var(--chapter-tier-rgb),.13),rgba(var(--chapter-tier-rgb),.025) 70%);
  box-shadow:inset 3px 0 0 rgba(var(--chapter-tier-rgb),.75);
}
""",
    """  background:linear-gradient(90deg,rgba(var(--chapter-tier-rgb),.13),rgba(var(--chapter-tier-rgb),.025) 70%);
  box-shadow:inset 3px 0 0 rgba(var(--chapter-tier-rgb),.75);
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .home-chapter-row {
  background:color-mix(in srgb, var(--surface-solid) 94%, rgb(var(--chapter-tier-rgb)) 6%);
}
""",
    "Home chapter rows",
)


# View-all-chapters cards:
# give light and parchment modes an opaque surface.
replace_once(
    """.chapter-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(145deg, var(--surface) 0%, rgb(var(--surface-rgb) / 0.45) 100%);
  border: 1px solid var(--border-2);
  cursor: pointer;
  transition: transform .3s cubic-bezier(0.16, 1, 0.3, 1), border-color .3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .3s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 140px;
}
""",
    """.chapter-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(145deg, var(--surface) 0%, rgb(var(--surface-rgb) / 0.45) 100%);
  border: 1px solid var(--border-2);
  cursor: pointer;
  transition: transform .3s cubic-bezier(0.16, 1, 0.3, 1), border-color .3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .3s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 140px;
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .chapter-card {
  background:var(--surface-solid);
  box-shadow:var(--shadow-sm);
}
""",
    "Chapter-card base",
)


# Locked chapter cards have later, more-specific background declarations.
replace_once(
    """.chapter-card.locked.tier-licker:hover {
  border-color: var(--tier-key);
  box-shadow: 0 0 30px rgb(var(--tier-key-rgb) / 0.22), 0 12px 32px rgb(var(--shadow-rgb) / 0.5);
}
""",
    """.chapter-card.locked.tier-licker:hover {
  border-color: var(--tier-key);
  box-shadow: 0 0 30px rgb(var(--tier-key-rgb) / 0.22), 0 12px 32px rgb(var(--shadow-rgb) / 0.5);
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .chapter-card.locked {
  background:var(--surface-solid);
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .chapter-card.locked.tier-tyrant {
  background:color-mix(in srgb, var(--surface-solid) 94%, rgb(var(--tier-premium-rgb)) 6%);
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .chapter-card.locked.tier-licker {
  background:color-mix(in srgb, var(--surface-solid) 94%, rgb(var(--tier-key-rgb)) 6%);
}
""",
    "Locked chapter cards",
)


# Access-coded cards use !important, so their theme correction must match it.
replace_once(
    """.chapter-card.chapter-access-coded {
  --chapter-tier-rgb: 113, 113, 122;
  --chapter-tier-accent: var(--tier-standard);
  border-color: rgba(var(--chapter-tier-rgb), .42) !important;
  background: linear-gradient(145deg, rgba(var(--chapter-tier-rgb), .13), rgba(var(--chapter-tier-rgb), .035) 48%, rgb(var(--surface-rgb) / .54) 100%) !important;
  box-shadow: inset 3px 0 0 rgba(var(--chapter-tier-rgb), .78) !important;
}
""",
    """.chapter-card.chapter-access-coded {
  --chapter-tier-rgb: 113, 113, 122;
  --chapter-tier-accent: var(--tier-standard);
  border-color: rgba(var(--chapter-tier-rgb), .42) !important;
  background: linear-gradient(145deg, rgba(var(--chapter-tier-rgb), .13), rgba(var(--chapter-tier-rgb), .035) 48%, rgb(var(--surface-rgb) / .54) 100%) !important;
  box-shadow: inset 3px 0 0 rgba(var(--chapter-tier-rgb), .78) !important;
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .chapter-card.chapter-access-coded {
  background:color-mix(in srgb, var(--surface-solid) 94%, rgb(var(--chapter-tier-rgb)) 6%) !important;
  box-shadow:inset 3px 0 0 rgba(var(--chapter-tier-rgb), .78), var(--shadow-sm) !important;
}
""",
    "Access-coded chapter cards",
)


# Home feed tiles:
# use opaque surfaces in light and parchment modes.
replace_once(
    """.archive-feed-card,
.archive-gallery-card {
  position: relative;
  overflow: hidden;
  grid-column: span 1;
  grid-row: span 1;
  min-height: 214px;
  border-radius: 12px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--surface-solid) 95%, var(--chapter-tier-accent) 5%), var(--surface-solid));
}
""",
    """.archive-feed-card,
.archive-gallery-card {
  position: relative;
  overflow: hidden;
  grid-column: span 1;
  grid-row: span 1;
  min-height: 214px;
  border-radius: 12px;
  background: linear-gradient(145deg, color-mix(in srgb, var(--surface-solid) 95%, var(--chapter-tier-accent) 5%), var(--surface-solid));
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .archive-feed-card,
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .archive-gallery-card {
  background:var(--surface-solid);
  box-shadow:var(--shadow-sm);
}
""",
    "Home feed cards",
)


# Remove the continuously moving sweep and pulsing glow.
replace_once(
    """.archive-chapter-card.is-unread::after {
  content:"";
  position:absolute;
  z-index:1;
  inset:-35% auto -35% -32%;
  width:22%;
  opacity:0;
  background:linear-gradient(90deg,transparent,rgba(var(--chapter-tier-rgb),.12),transparent);
  transform:skewX(-17deg);
  animation:archiveUnreadSweep 6.5s ease-in-out infinite;
  animation-delay:var(--unread-delay,0s);
  pointer-events:none;
}
.archive-chapter-card.is-unread .archive-card-glow {
  animation:archiveUnreadPulse 2.8s ease-in-out infinite;
  animation-delay:var(--unread-delay,0s);
}
@keyframes archiveUnreadSweep {
  0%,58% { left:-32%; opacity:0; }
  64% { opacity:.7; }
  82% { left:118%; opacity:0; }
  100% { left:118%; opacity:0; }
}
@keyframes archiveUnreadPulse {
  0%,100% { box-shadow:0 0 16px 3px rgba(var(--chapter-tier-rgb),.25); }
  50% { box-shadow:0 0 25px 6px rgba(var(--chapter-tier-rgb),.48); }
}
""",
    """/* Keep unread state static: no sweep pseudo-element or pulsing glow. */
.archive-chapter-card.is-unread::after { content:none; }
.archive-chapter-card.is-unread .archive-card-glow { animation:none !important; }
""",
    "Unread tile animations",
)


# Unread home-feed tiles receive a solid, lightly tier-tinted surface.
replace_once(
    """.archive-chapter-card.is-unread {
  background:
    radial-gradient(circle at 85% 15%, rgba(var(--chapter-tier-rgb), 0.25), transparent 55%),
    linear-gradient(145deg, color-mix(in srgb, var(--surface-solid-2) 88%, rgba(var(--chapter-tier-rgb), 1) 12%), var(--surface-solid));
  border: 1px solid rgba(var(--chapter-tier-rgb), 0.55);
  box-shadow: var(--shadow-sm);
}
""",
    """.archive-chapter-card.is-unread {
  background:
    radial-gradient(circle at 85% 15%, rgba(var(--chapter-tier-rgb), 0.25), transparent 55%),
    linear-gradient(145deg, color-mix(in srgb, var(--surface-solid-2) 88%, rgba(var(--chapter-tier-rgb), 1) 12%), var(--surface-solid));
  border: 1px solid rgba(var(--chapter-tier-rgb), 0.55);
  box-shadow: var(--shadow-sm);
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .archive-chapter-card.is-unread {
  background:color-mix(in srgb, var(--surface-solid) 93%, rgb(var(--chapter-tier-rgb)) 7%);
}
""",
    "Unread home tiles",
)


# Read home-feed tiles receive a plain solid surface.
replace_once(
    """.archive-chapter-card.is-read {
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--surface-solid) 94%, rgba(var(--chapter-tier-rgb), 1) 6%), var(--surface-solid));
  border: 1px solid rgba(var(--chapter-tier-rgb), 0.25);
  box-shadow: none;
  opacity: 0.88;
}
""",
    """.archive-chapter-card.is-read {
  background:
    linear-gradient(145deg, color-mix(in srgb, var(--surface-solid) 94%, rgba(var(--chapter-tier-rgb), 1) 6%), var(--surface-solid));
  border: 1px solid rgba(var(--chapter-tier-rgb), 0.25);
  box-shadow: none;
  opacity: 0.88;
}
:is([data-theme="light"], [data-theme="sepia"], [data-theme="parchment"]) .archive-chapter-card.is-read {
  background:var(--surface-solid);
  box-shadow:var(--shadow-sm);
}
""",
    "Read home tiles",
)


backup = path.with_suffix(path.suffix + ".bak")
backup.write_text(original, encoding="utf-8")
path.write_text(css, encoding="utf-8")

print(f"Patched {path}")
print(f"Backup saved as {backup}")
