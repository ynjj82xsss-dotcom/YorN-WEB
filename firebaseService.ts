@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Fredoka:wght@600;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-fredoka: "Fredoka", sans-serif;
  --color-anthracite: #050505;
  --color-anthracite-light: #080808;
  --color-anthracite-border: #1A1A1A;
}

.neon-red-glow {
  color: #fffaf0; /* Warm cream/white */
  text-shadow: 
    0 0 6px rgba(255, 30, 30, 0.9), 
    0 0 15px rgba(255, 30, 30, 0.7), 
    0 0 30px rgba(255, 30, 30, 0.5), 
    0 0 60px rgba(255, 30, 30, 0.3);
}

body {
    background-color: var(--color-anthracite);
    color: #e5e5e5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
    -webkit-text-size-adjust: 100%;
}

* {
    -webkit-tap-highlight-color: transparent;
}

/* Momentum scrolling for iOS */
.overflow-y-auto {
    -webkit-overflow-scrolling: touch;
}

/* Ensure smooth touch manipulation and remove layout zooming */
input, textarea, button, [role="button"] {
    touch-action: manipulation;
}

[data-theme="light"] {
  filter: invert(1) hue-rotate(180deg);
}

[data-theme="light"] img, 
[data-theme="light"] video, 
[data-theme="light"] .keep-original-color {
  filter: invert(1) hue-rotate(180deg);
}

[data-theme="cosmic"] {
  filter: hue-rotate(280deg) saturate(1.5) contrast(1.1);
}

/* Custom minimal scrollbar */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #2a2a30;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}

/* Base utility for hiding scrollbar visually but allowing scroll */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
