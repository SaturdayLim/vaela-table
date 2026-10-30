// Saturday Signature v1.0.3. Tailwind v3 preset. Generated, do not edit.
// tailwind.config.js:  module.exports = { presets: [require('./saturday/tokens/tailwind.preset.js')], ... }
module.exports = {
  theme: {
    extend: {
      colors: { sat: {
        "bg": "var(--sat-bg)",
        "mesh-1": "var(--sat-mesh-1)",
        "mesh-2": "var(--sat-mesh-2)",
        "mesh-3": "var(--sat-mesh-3)",
        "text": "var(--sat-text)",
        "muted": "var(--sat-muted)",
        "faint": "var(--sat-faint)",
        "line": "var(--sat-line)",
        "line-strong": "var(--sat-line-strong)",
        "glass-1": "var(--sat-glass-1)",
        "glass-2": "var(--sat-glass-2)",
        "glass-edge": "var(--sat-glass-edge)",
        "glass-hi": "var(--sat-glass-hi)",
        "solid-1": "var(--sat-solid-1)",
        "solid-2": "var(--sat-solid-2)",
        "well": "var(--sat-well)",
        "hover": "var(--sat-hover)",
        "accent": "var(--sat-accent)",
        "accent-fill": "var(--sat-accent-fill)",
        "accent-fill-hover": "var(--sat-accent-fill-hover)",
        "on-accent": "var(--sat-on-accent)",
        "accent-text": "var(--sat-accent-text)",
        "accent-soft": "var(--sat-accent-soft)",
        "focus": "var(--sat-focus)",
        "mark": "var(--sat-mark)",
        "pos": "var(--sat-pos)",
        "neg": "var(--sat-neg)",
        "warn": "var(--sat-warn)"
      } },
      fontFamily: {
        display: ['var(--sat-font-display)'],
        sans: ['var(--sat-font-ui)'],
        mono: ['var(--sat-font-mono)'],
      },
      fontSize: {
        "sat-caption": "var(--sat-fs-caption)",
        "sat-small": "var(--sat-fs-small)",
        "sat-body": "var(--sat-fs-body)",
        "sat-h3": "var(--sat-fs-h3)",
        "sat-h2": "var(--sat-fs-h2)",
        "sat-h1": "var(--sat-fs-h1)",
        "sat-kpi": "var(--sat-fs-kpi)",
        "sat-display": "var(--sat-fs-display)"
      },
      borderRadius: {
        "sat-xs": "var(--sat-radius-xs)",
        "sat-sm": "var(--sat-radius-sm)",
        "sat-md": "var(--sat-radius-md)",
        "sat-lg": "var(--sat-radius-lg)",
        "sat-xl": "var(--sat-radius-xl)",
        "sat-pill": "var(--sat-radius-pill)"
      },
      boxShadow: { sat: 'var(--sat-shadow)', 'sat-lg': 'var(--sat-shadow-lg)' },
      screens: {"sm":"640px","md":"1024px","lg":"1440px"},
    },
  },
};
