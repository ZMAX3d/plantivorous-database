#!/usr/bin/env node
/**
 * Generate the botanical SVG illustration plates used across the database.
 *
 * These are original, hand-built vector drawings (no external assets) so the
 * site stays self-contained, offline-friendly and free of licensing issues.
 *
 * Output: assets/img/genera/*.svg
 *
 * Usage: node scripts/generate-illustrations.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "assets", "img", "genera");
const INK = "#2f4a35";
const SOFT = "#6b8570";

const leaf = (d, fill = "none", opacity = 1) =>
  `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" opacity="${opacity}"/>`;

const stem = (d, width = 1.8, color = INK) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;

const dew = (cx, cy, r = 2.1) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#eaf4f7" stroke="${SOFT}" stroke-width=".7"/><circle cx="${cx - r * 0.28}" cy="${cy - r * 0.3}" r="${r * 0.32}" fill="#ffffff" opacity=".9"/>`;

function flower(cx, cy, r, petals, fill, center, rotation = 0) {
  const lobes = Array.from({ length: petals }, (_, i) => {
    const angle = (360 / petals) * i;
    return `<ellipse cx="0" cy="${(-r * 0.62).toFixed(1)}" rx="${(r * 0.34).toFixed(1)}" ry="${(r * 0.64).toFixed(1)}" fill="${fill}" stroke="${INK}" stroke-width="1.15" transform="rotate(${angle.toFixed(1)})"/>`;
  }).join("");
  return `<g transform="translate(${cx} ${cy}) rotate(${rotation})">${lobes}<circle r="${(r * 0.24).toFixed(1)}" fill="${center}" stroke="${INK}" stroke-width="1"/></g>`;
}

function shadow(cx = 200, cy = 258, rx = 88) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="9" fill="${INK}" opacity=".08"/>`;
}

function wrap(accent, label, body, backdrop = true) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" role="img" aria-label="${label}">
${backdrop ? `<circle cx="200" cy="148" r="124" fill="${accent}" opacity=".065"/>` : ""}
<g stroke-linecap="round" stroke-linejoin="round">
${body}
</g>
</svg>
`;
}

/* ------------------------------------------------------------------ */
/* Drosera — rosette of dewy tentacled leaves                          */
/* ------------------------------------------------------------------ */
function drosera() {
  const leaves = [-78, -58, -39, -20, 0, 20, 39, 58, 78].map((angle, index) => {
    const length = index === 4 ? 104 : 92 - Math.abs(angle) * 0.18;
    const halfWidth = index === 4 ? 15 : 13;
    const path = `M0 0 C${-halfWidth} ${-length * 0.38} ${-halfWidth} ${-length * 0.78} 0 ${-length} C${halfWidth} ${-length * 0.78} ${halfWidth} ${-length * 0.38} 0 0Z`;
    let tentacles = "";
    for (let t = 0.16; t < 0.96; t += 0.09) {
      const y = -length * t;
      const width = halfWidth * Math.sin(Math.PI * t) ** 0.72;
      const tilt = 6 + t * 4;
      tentacles += `<path d="M${-width} ${y} l${-tilt} ${-tilt * 0.55}" stroke="#b4553f" stroke-width="1.1"/><circle cx="${-width - tilt}" cy="${y - tilt * 0.55}" r="1.5" fill="#c9624a"/>`;
      tentacles += `<path d="M${width} ${y} l${tilt} ${-tilt * 0.55}" stroke="#b4553f" stroke-width="1.1"/><circle cx="${width + tilt}" cy="${y - tilt * 0.55}" r="1.5" fill="#c9624a"/>`;
    }
    return `<g transform="translate(200 240) rotate(${angle})">${leaf(path, "#cfe3bd")}${tentacles}</g>`;
  }).join("");

  const scapes = [
    { d: "M200 236 C186 190 174 150 158 112", fx: 154, fy: 100, rot: -18 },
    { d: "M200 236 C216 194 228 158 244 122", fx: 248, fy: 110, rot: 16 },
  ].map(({ d, fx, fy, rot }) =>
    `${stem(d, 1.4)}${flower(fx, fy, 11, 5, "#fbfaf3", "#d7b94a", rot)}`
  ).join("");

  return wrap("#2BA84A", "Sundew (Drosera) rosette illustration",
    `${shadow(200, 250, 92)}${scapes}${leaves}`);
}

/* ------------------------------------------------------------------ */
/* Dionaea — Venus flytrap rosette with open traps                     */
/* ------------------------------------------------------------------ */
function dionaea() {
  const petioles = [-72, -48, -24, 24, 48, 72].map((angle) => {
    const transform = `translate(200 238) rotate(${angle})`;
    return `<g transform="${transform}">${leaf("M0 0 C-11 -24 -13 -52 0 -74 C13 -52 11 -24 0 0Z", "#cfe3bd")}${stem("M0 -46 L0 -74", 1.2, SOFT)}</g>`;
  }).join("");

  function trap(cx, cy, scale, rotation) {
    let teeth = "";
    const rim = [
      { from: [-76, -34], to: [-20, -58], bend: -50 },
      { from: [-20, -58], to: [0, -30], bend: -18 },
    ];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i += 1) {
        const t = i / 8;
        const x = side * (18 + t * 60);
        const y = -34 - Math.sin(t * Math.PI) * 26;
        teeth += `<path d="M${x} ${y} l${side * 3} -9" stroke="${INK}" stroke-width="1.5"/>`;
      }
    }
    return `<g transform="translate(${cx} ${cy}) rotate(${rotation}) scale(${scale})">
      <path d="M-88 6 C-78 -42 -40 -64 0 -46 C-24 -22 -46 8 -34 34 C-58 40 -82 28 -88 6Z" fill="#a9cf8d" stroke="${INK}" stroke-width="1.7"/>
      <path d="M88 6 C78 -42 40 -64 0 -46 C24 -22 46 8 34 34 C58 40 82 28 88 6Z" fill="#a9cf8d" stroke="${INK}" stroke-width="1.7"/>
      <path d="M-70 -8 C-56 -38 -26 -48 -2 -40 C-30 -22 -50 2 -46 26 C-62 18 -70 6 -70 -8Z" fill="#c4553f" opacity=".55"/>
      <path d="M70 -8 C56 -38 26 -48 2 -40 C30 -22 50 2 46 26 C62 18 70 6 70 -8Z" fill="#c4553f" opacity=".55"/>
      ${teeth}
      <path d="M0 -46 L0 -18" stroke="${INK}" stroke-width="1.2"/>
      <g stroke="#7c2f24" stroke-width="1.2"><path d="M-34 -12 l-10 -10"/><path d="M-44 2 l-14 -4"/><path d="M34 -12 l10 -10"/><path d="M44 2 l14 -4"/></g>
    </g>`;
  }

  return wrap("#2BA84A", "Venus flytrap (Dionaea) illustration",
    `${shadow(200, 250, 96)}${petioles}
     <path d="M200 238 C196 190 188 152 178 118" fill="none" stroke="${INK}" stroke-width="1.5"/>
     ${trap(158, 128, 0.78, -16)}
     ${trap(244, 140, 0.68, 18)}`);
}

/* ------------------------------------------------------------------ */
/* Nepenthes — hanging tropical pitchers                               */
/* ------------------------------------------------------------------ */
function nepenthes() {
  const pitchers = [
    { x: 138, y: 196, s: 0.9, tilt: -8, lid: -22 },
    { x: 228, y: 214, s: 1.05, tilt: 7, lid: 20 },
    { x: 300, y: 176, s: 0.62, tilt: -12, lid: -26 },
  ].map(({ x, y, s, tilt, lid }) => `<g transform="translate(${x} ${y}) rotate(${tilt}) scale(${s})">
      <path d="M0 -54 C-26 -44 -36 -8 -30 34 C-26 68 26 68 30 34 C36 -8 26 -44 0 -54Z" fill="#e3c9ac" stroke="${INK}" stroke-width="1.7"/>
      <path d="M-30 20 C-16 14 16 14 30 20" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".65"/>
      <path d="M-26 -30 C-10 -36 10 -36 26 -30" fill="none" stroke="#9b5a3c" stroke-width="4.2" opacity=".65"/>
      <ellipse cx="0" cy="-48" rx="27" ry="8" fill="#8f4a33" stroke="${INK}" stroke-width="1.4"/>
      <g transform="rotate(${lid} 0 -48)">
        <path d="M-24 -48 C-28 -66 -10 -77 4 -72 C20 -67 26 -54 22 -46 Z" fill="#c8875f" stroke="${INK}" stroke-width="1.5"/>
      </g>
      <path d="M-30 16 l-7 8" stroke="#9b5a3c" stroke-width="1.1"/><path d="M30 16 l7 8" stroke="#9b5a3c" stroke-width="1.1"/>
      <g fill="#a65b3e" opacity=".65"><circle cx="-12" cy="-4" r="2"/><circle cx="8" cy="8" r="1.7"/><circle cx="16" cy="-16" r="1.5"/><circle cx="-19" cy="24" r="1.6"/><circle cx="4" cy="38" r="1.8"/></g>
    </g>`).join("");

  return wrap("#A64B2A", "Tropical pitcher plant (Nepenthes) illustration",
    `${stem("M96 26 C150 62 168 104 202 148 C236 192 276 192 306 150", 2.6, "#6d5237")}
     ${leaf("M118 40 C146 36 166 48 176 64 C154 74 132 68 118 40Z", "#9fbf7a")}
     ${leaf("M206 154 C232 148 250 158 258 176 C238 184 216 176 206 154Z", "#9fbf7a")}
     ${stem("M176 64 C190 88 186 118 164 142", 1.2, SOFT)}
     ${stem("M306 150 C300 156 296 166 300 176", 1.2, SOFT)}
     ${stem("M202 148 C214 166 222 184 228 214", 1.2, SOFT)}
     ${stem("M258 176 C246 190 238 204 238 216", 1.2, SOFT)}
     ${pitchers}${shadow(215, 268, 118)}`);
}

/* ------------------------------------------------------------------ */
/* Sarracenia — tall North American trumpets                           */
/* ------------------------------------------------------------------ */
function sarracenia() {
  const trumpet = (x, baseY, topY, width, lean, hoodSide) => {
    const top = topY;
    const mouthY = top + 14;
    return `<g>
      <path d="M${x} ${baseY} C${x - width * 0.3} ${baseY - 40} ${x - width * 0.4 + lean} ${top + 60} ${x - width + lean} ${top + 18} L${x - width * 0.6 + lean} ${top} C${x + width * 0.4 + lean} ${top - 12} ${x + width * 0.9 + lean} ${top + 20} ${x + width + lean} ${mouthY} C${x + width * 0.4} ${top + 60} ${x + width * 0.2} ${baseY - 40} ${x} ${baseY}Z" fill="#d8c7a4" stroke="${INK}" stroke-width="1.7"/>
      <ellipse cx="${x + lean}" cy="${mouthY - 6}" rx="${width * 0.82}" ry="9" fill="#7d3d44" stroke="${INK}" stroke-width="1.4" transform="rotate(${hoodSide * 4} ${x + lean} ${mouthY - 6})"/>
      <path d="M${x - width + lean * 0.9} ${top + 20} C${x - width * 1.35 + lean + hoodSide * 24} ${top - 2} ${x + lean + hoodSide * 42} ${top - 22} ${x + width * 1.12 + lean + hoodSide * 14} ${top + 6} C${x + width * 0.4 + lean} ${top + 12} ${x - width * 0.5 + lean} ${top + 14} ${x - width + lean * 0.9} ${top + 20}Z" fill="#b8cf8b" stroke="${INK}" stroke-width="1.5"/>
      <path d="M${x - width * 0.45} ${baseY - 30} C${x - width * 0.2} ${top + 80} ${x - width * 0.4 + lean} ${top + 34} ${x - width * 0.5 + lean} ${top + 8}" fill="none" stroke="#8a6a4f" stroke-width="1.1" opacity=".6"/>
    </g>`;
  };

  return wrap("#7A3E52", "North American pitcher plant (Sarracenia) illustration",
    `${shadow(198, 258, 104)}
     ${trumpet(150, 250, 92, 26, -6, -1)}
     ${trumpet(194, 250, 68, 30, 4, 1)}
     ${trumpet(242, 250, 96, 25, 8, 1)}
     ${trumpet(276, 250, 130, 20, -4, -1)}
     ${stem("M212 250 C226 204 244 168 258 132", 2.2)}
     ${stem("M258 132 C256 116 252 106 250 96", 1.6)}
     ${flower(250, 82, 16, 5, "#a34d5c", "#e0c063", -12)}
     <path d="M242 92 C230 104 228 116 232 126" fill="none" stroke="${INK}" stroke-width="1.4"/>`);
}

/* ------------------------------------------------------------------ */
/* Darlingtonia — cobra lily                                           */
/* ------------------------------------------------------------------ */
function darlingtonia() {
  const cobra = (x, scale, flip) => `<g transform="translate(${x} 252) scale(${flip} ${scale})">
    <path d="M0 0 C-6 -50 6 -104 26 -138 C42 -164 62 -172 78 -160 C94 -148 98 -124 88 -106 C80 -90 62 -82 46 -88 C26 -96 18 -116 24 -132" fill="#cfe0ae" stroke="${INK}" stroke-width="1.8"/>
    <path d="M46 -88 C58 -92 74 -86 84 -74 C66 -66 50 -72 46 -88Z" fill="#8a5a4a" stroke="${INK}" stroke-width="1.3"/>
    <path d="M84 -74 C94 -80 104 -92 108 -104 C98 -92 94 -82 84 -74Z" fill="#8a5a4a" stroke="${INK}" stroke-width="1.3"/>
    <path d="M28 -132 C44 -142 62 -140 74 -128" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".7"/>
    <g fill="#f4efd9" stroke="${SOFT}" stroke-width=".7" opacity=".9"><circle cx="54" cy="-120" r="2.4"/><circle cx="66" cy="-112" r="2"/><circle cx="44" cy="-110" r="1.8"/><circle cx="60" cy="-100" r="1.6"/></g>
    <path d="M88 -106 C92 -96 90 -86 84 -78" fill="none" stroke="${INK}" stroke-width="1.3"/>
    <path d="M0 0 C-8 -34 -22 -62 -34 -78" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".7"/>
  </g>`;
  return wrap("#6E8F3A", "Cobra lily (Darlingtonia) illustration",
    `${shadow(206, 258, 94)}
     ${cobra(132, 0.82, -1)}
     ${cobra(196, 1, 1)}
     ${cobra(270, 0.7, -1)}`);
}

/* ------------------------------------------------------------------ */
/* Heliamphora — sun pitchers                                          */
/* ------------------------------------------------------------------ */
function heliamphora() {
  const pitcher = (x, h, w, lid) => `<g>
    <path d="M${x} 250 C${x - w * 0.5} 220 ${x - w} 190 ${x - w * 0.7} ${250 - h + 18} L${x - w * 0.32} ${250 - h} C${x} ${250 - h - 10} ${x + w * 0.36} ${250 - h - 6} ${x + w * 0.66} ${250 - h + 20} C${x + w} 190 ${x + w * 0.5} 220 ${x} 250Z" fill="#e6d6c6" stroke="${INK}" stroke-width="1.6"/>
    <ellipse cx="${x}" cy="${250 - h + 8}" rx="${w * 0.48}" ry="7" fill="#9a4d48" stroke="${INK}" stroke-width="1.2"/>
    <path d="M${x - w * 0.34} ${250 - h + 2} C${x - w * 0.7} ${250 - h - 22} ${x + w * 0.1} ${250 - h - 32} ${x + w * 0.52} ${250 - h - 14} C${x + w * 0.2} ${250 - h - 6} ${x - w * 0.1} ${250 - h} ${x - w * 0.34} ${250 - h + 2}Z" fill="#b9cf94" stroke="${INK}" stroke-width="1.3"/>
    <path d="M${x - w * 0.3} 246 L${x - w * 0.55} ${250 - h + 28}" stroke="#a9605a" stroke-width="1" opacity=".7"/>
    <path d="M${x + w * 0.18} 246 L${x + w * 0.42} ${250 - h + 34}" stroke="#a9605a" stroke-width="1" opacity=".7"/>
  </g>`;
  return wrap("#B44A5A", "Sun pitcher (Heliamphora) illustration",
    `${shadow(200, 257, 90)}
     ${pitcher(148, 126, 28, 1)}
     ${pitcher(202, 158, 32, -1)}
     ${pitcher(254, 118, 25, 1)}
     ${pitcher(292, 92, 20, -1)}`);
}

/* ------------------------------------------------------------------ */
/* Cephalotus — Albany pitcher plant                                   */
/* ------------------------------------------------------------------ */
function cephalotus() {
  const pitcher = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
    <path d="M0 -18 C-25 -14 -32 6 -28 28 C-24 50 24 50 28 28 C32 6 25 -14 0 -18Z" fill="#d8b28f" stroke="${INK}" stroke-width="1.7"/>
    <path d="M-27 18 C-10 12 10 12 27 18" fill="none" stroke="${INK}" stroke-width="1.2"/>
    <g stroke="#9b6a4a" stroke-width="1" opacity=".7"><path d="M-18 26 L-20 44"/><path d="M-6 28 L-6 47"/><path d="M8 28 L8 47"/><path d="M20 26 L22 43"/></g>
    <ellipse cx="0" cy="-12" rx="22" ry="6" fill="#7d3b32" stroke="${INK}" stroke-width="1.2"/>
    <g transform="rotate(-20 0 -12)"><path d="M-19 -12 C-22 -32 -6 -42 8 -38 C22 -34 26 -22 20 -12 Z" fill="#9fae6a" stroke="${INK}" stroke-width="1.4"/><g fill="#6d3f2c"><circle cx="-8" cy="-28" r="1.6"/><circle cx="4" cy="-31" r="1.4"/><circle cx="13" cy="-24" r="1.3"/></g></g>
    <path d="M-28 22 l-6 7" stroke="#9b6a4a" stroke-width="1.1"/><path d="M28 22 l6 7" stroke="#9b6a4a" stroke-width="1.1"/>
  </g>`;
  return wrap("#8C5A3C", "Albany pitcher plant (Cephalotus) illustration",
    `${shadow(200, 256, 90)}
     ${stem("M200 248 C210 216 214 188 208 160", 1.5, "#7b5b3c")}
     ${stem("M208 160 C206 142 202 128 198 116", 1.2)}
     ${flower(196, 104, 9, 6, "#f6f1e2", "#c9a227")}
     ${flower(212, 118, 7, 6, "#f6f1e2", "#c9a227")}
     ${pitcher(154, 246, 0.9, -12)}
     ${pitcher(200, 250, 1.05, 2)}
     ${pitcher(246, 242, 0.8, 14)}
     ${pitcher(282, 250, 0.62, 22)}`);
}

/* ------------------------------------------------------------------ */
/* Pinguicula — butterwort rosette                                     */
/* ------------------------------------------------------------------ */
function pinguicula() {
  const leaves = Array.from({ length: 10 }, (_, i) => {
    const angle = (360 / 10) * i + 8;
    const length = i % 2 ? 68 : 82;
    return `<g transform="translate(200 226) rotate(${angle})">
      <path d="M0 0 C-18 -18 -22 -${length * 0.55} 0 -${length} C22 -${length * 0.55} 18 -18 0 0Z" fill="#d6e6b6" stroke="${INK}" stroke-width="1.5"/>
      <path d="M0 -8 C-5 -${length * 0.4} -4 -${length * 0.7} 0 -${length - 6}" fill="none" stroke="${SOFT}" stroke-width=".9" opacity=".8"/>
    </g>`;
  }).join("");
  return wrap("#8C6BB1", "Butterwort (Pinguicula) illustration",
    `${shadow(200, 250, 86)}
     ${stem("M200 222 C192 178 184 142 174 112", 1.6)}
     ${flower(170, 92, 15, 5, "#b58cc9", "#e6c34c", -16)}
     <path d="M174 112 C168 116 162 118 156 116" fill="none" stroke="${INK}" stroke-width="1.2"/>
     ${leaves}`);
}

/* ------------------------------------------------------------------ */
/* Utricularia — bladderwort                                           */
/* ------------------------------------------------------------------ */
function utricularia() {
  const waterLine = `<path d="M20 148 C60 144 92 152 130 148 C168 144 196 152 232 148 C268 144 300 152 340 148 C360 146 376 148 384 148" fill="none" stroke="#7fa3ad" stroke-width="1.4" opacity=".8"/>`;
  const ripples = `<g fill="none" stroke="#7fa3ad" stroke-width="1" opacity=".45"><path d="M48 162 C70 158 92 162 112 160"/><path d="M268 164 C290 160 312 164 332 162"/></g>`;
  const stems = [
    "M118 236 C132 206 150 184 168 160",
    "M190 240 C196 208 204 184 212 158",
    "M262 238 C254 208 246 184 240 160",
  ].map((d) => stem(d, 1.3, "#6f8d5a")).join("");
  const bladders = [
    [130, 220, -20], [152, 196, 15], [176, 174, -10], [198, 224, 20],
    [214, 196, -15], [232, 176, 10], [268, 216, 18], [252, 194, -20],
  ].map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})"><ellipse cx="0" cy="0" rx="9" ry="5.5" fill="#d9e6b6" stroke="${INK}" stroke-width="1.1"/><path d="M-9 0 l-7 -1 M9 0 l7 1" stroke="${INK}" stroke-width="1"/><path d="M0 -5.5 L0 -9" stroke="${SOFT}" stroke-width=".9"/></g>`).join("");
  const branchlets = Array.from({ length: 10 }, (_, i) => {
    const x = 128 + i * 17;
    const y = 190 + Math.sin(i * 1.7) * 26;
    return `<path d="M${x} ${y} l${i % 2 ? 10 : -10} ${6 + (i % 3) * 4}" stroke="#6f8d5a" stroke-width=".9"/>`;
  }).join("");
  return wrap("#C9A227", "Bladderwort (Utricularia) illustration",
    `${waterLine}${ripples}
     ${stems}${branchlets}${bladders}
     ${stem("M168 160 C158 128 152 104 146 84", 1.4)}
     ${flower(144, 66, 12, 5, "#e6c34c", "#b9792f", -10)}
     ${stem("M240 160 C244 126 248 104 254 84", 1.4)}
     ${flower(256, 66, 13, 5, "#e6c34c", "#b9792f", 12)}
     ${shadow(200, 246, 92)}`);
}

/* ------------------------------------------------------------------ */
/* Genlisea — corkscrew plant with soil cutaway                        */
/* ------------------------------------------------------------------ */
function genlisea() {
  const soil = `<path d="M44 206 C120 200 280 200 356 206 L356 280 L44 280Z" fill="#e8e0cd" opacity=".65"/><path d="M44 206 C120 200 280 200 356 206" fill="none" stroke="#a08d6b" stroke-width="1.2"/><g fill="#b3a17f" opacity=".55"><circle cx="92" cy="228" r="1.4"/><circle cx="130" cy="248" r="1.2"/><circle cx="268" cy="236" r="1.4"/><circle cx="312" cy="258" r="1.2"/><circle cx="230" cy="266" r="1.3"/></g>`;
  let spiral = "";
  for (const side of [-1, 1]) {
    const points = [];
    for (let i = 0; i <= 60; i += 1) {
      const t = i / 60;
      const x = 200 + side * (6 + t * 54) + Math.sin(t * Math.PI * 6) * 9;
      const y = 206 + t * 64 + Math.cos(t * Math.PI * 6) * 5;
      points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    spiral += `<path d="M${points.join(" L")}" fill="none" stroke="#8f7b55" stroke-width="1.3"/>`;
  }
  const leaves = [-62, -38, -14, 14, 38, 62].map((angle) => `<g transform="translate(200 208) rotate(${angle})">${leaf("M0 0 C-10 -14 -12 -34 0 -46 C12 -34 10 -14 0 0Z", "#cfe3bd")}</g>`).join("");
  return wrap("#8C6BB1", "Corkscrew plant (Genlisea) illustration",
    `${soil}
     ${stem("M200 206 C198 172 194 140 188 116", 1.5)}
     ${flower(186, 96, 13, 5, "#e6c34c", "#b9792f", -8)}
     ${leaves}${spiral}
     <path d="M186 206 l-4 10 M204 206 l4 10" stroke="${INK}" stroke-width="1.1"/>`);
}

/* ------------------------------------------------------------------ */
/* Byblis — rainbow plant                                              */
/* ------------------------------------------------------------------ */
function byblis() {
  const stems = [
    { d: "M178 246 C168 200 160 158 150 110 C144 82 140 58 136 40", top: [136, 34] },
    { d: "M206 248 C216 206 228 168 238 124 C244 100 250 78 254 56", top: [255, 50] },
    { d: "M226 250 C244 222 262 198 280 176", top: [283, 172] },
  ];
  const foliage = stems.map(({ d }) => {
    const start = d.match(/M(\d+) (\d+)/);
    const baseX = Number(start[1]);
    let threads = "";
    for (let i = 0; i < 16; i += 1) {
      const y = 236 - i * 12;
      const x = baseX + Math.sin(i * 0.7) * 16;
      const dir = i % 2 ? 1 : -1;
      threads += `<path d="M${x} ${y} C${x + dir * 16} ${y - 6} ${x + dir * 30} ${y - 2} ${x + dir * 40} ${y - 12}" fill="none" stroke="#7f9a5a" stroke-width=".95"/>`;
      threads += dew(x + dir * 40, y - 12, 1.5);
      threads += `<path d="M${x} ${y} C${x - dir * 8} ${y + 4} ${x - dir * 18} ${y + 6} ${x - dir * 24} ${y + 14}" fill="none" stroke="#7f9a5a" stroke-width=".9"/>`;
      threads += dew(x - dir * 24, y + 14, 1.3);
    }
    return stem(d, 1.5, "#7d6a44") + threads;
  }).join("");
  return wrap("#AACC44", "Rainbow plant (Byblis) illustration",
    `${shadow(206, 254, 84)}
     ${foliage}
     ${flower(136, 22, 11, 5, "#c99cc0", "#d9b94a", -14)}
     ${flower(256, 36, 12, 5, "#c99cc0", "#d9b94a", 10)}
     <path d="M280 176 C288 160 294 148 298 136" fill="none" stroke="#7d6a44" stroke-width="1.2"/>`);
}

/* ------------------------------------------------------------------ */
/* Drosophyllum — dewy pine                                            */
/* ------------------------------------------------------------------ */
function drosophyllum() {
  const branches = [
    "M200 252 C196 218 190 192 178 166",
    "M200 252 C208 218 220 192 236 168",
    "M200 252 C202 216 204 184 206 148",
  ].map((d) => stem(d, 2, "#7d5b3c")).join("");
  const leaves = [];
  const tips = [[178, 166, -0.5], [236, 168, 0.5], [206, 148, 0], [160, 190, -0.9], [252, 190, 0.9]];
  for (const [x, y, lean] of tips) {
    for (let i = 0; i < 7; i += 1) {
      const angle = -150 + i * 22 + lean * 30;
      const rad = (angle * Math.PI) / 180;
      const len = 74 + (i % 3) * 9;
      const ex = x + Math.cos(rad) * len;
      const ey = y + Math.sin(rad) * len * 0.7 + 10;
      const cx1 = x + Math.cos(rad) * len * 0.5;
      const cy1 = y + Math.sin(rad) * len * 0.35 - 10;
      leaves.push(`<path d="M${x} ${y} Q${cx1} ${cy1} ${ex} ${ey}" fill="none" stroke="#7f9a5a" stroke-width="1.4"/>`);
      for (let t = 0.25; t < 1; t += 0.16) {
        const px = x + (ex - x) * t;
        const py = y + (ey - y) * t - Math.sin(t * Math.PI) * 8;
        const side = i % 2 ? 1 : -1;
        leaves.push(`<path d="M${px} ${py} l${side * 3} ${-4}" stroke="#b4553f" stroke-width=".9"/>`);
        leaves.push(dew(px + side * 3, py - 5, 1.2));
      }
    }
  }
  return wrap("#C9A227", "Dewy pine (Drosophyllum) illustration",
    `${shadow(204, 258, 86)}${branches}${leaves.join("")}
     ${stem("M206 148 C204 128 202 112 200 100", 1.2)}
     ${flower(198, 84, 13, 5, "#e8c74f", "#b9792f", -8)}
     ${flower(214, 110, 10, 5, "#e8c74f", "#b9792f", 14)}`);
}

/* ------------------------------------------------------------------ */
/* Roridula — dewstick shrub                                           */
/* ------------------------------------------------------------------ */
function roridula() {
  const branches = [
    "M200 254 C198 220 192 190 178 164",
    "M200 254 C206 216 214 186 228 158",
    "M200 254 C202 218 202 186 200 152",
    "M178 164 C168 148 158 136 146 128",
    "M228 158 C240 144 252 134 264 130",
  ].map((d) => stem(d, 1.7, "#7d5b3c")).join("");
  const tips = [[146, 128], [178, 164], [200, 152], [228, 158], [264, 130]];
  let leaves = "";
  for (const [x, y] of tips) {
    for (let i = 0; i < 9; i += 1) {
      const angle = -160 + i * 20;
      const rad = (angle * Math.PI) / 180;
      const len = 46 + (i % 3) * 8;
      const ex = x + Math.cos(rad) * len;
      const ey = y + Math.sin(rad) * len * 0.75;
      leaves += `<path d="M${x} ${y} Q${(x + ex) / 2} ${(y + ey) / 2 - 6} ${ex} ${ey}" fill="none" stroke="#7f9a5a" stroke-width="1.25"/>`;
      for (let t = 0.3; t < 1; t += 0.2) {
        leaves += dew(x + (ex - x) * t, y + (ey - y) * t - Math.sin(t * Math.PI) * 5, 1.5);
      }
    }
  }
  return wrap("#8C5A3C", "Dewstick (Roridula) illustration",
    `${shadow(202, 258, 88)}${branches}${leaves}
     ${flower(160, 116, 9, 5, "#d3a3c4", "#d9b94a", -12)}
     ${flower(258, 118, 8, 5, "#d3a3c4", "#d9b94a", 12)}`);
}

/* ------------------------------------------------------------------ */
/* Aldrovanda — waterwheel plant                                       */
/* ------------------------------------------------------------------ */
function aldrovanda() {
  const water = `<path d="M24 196 C64 192 100 200 140 196 C180 192 216 200 256 196 C296 192 332 200 376 196" fill="none" stroke="#7fa3ad" stroke-width="1.3" opacity=".75"/><g fill="none" stroke="#7fa3ad" stroke-width="1" opacity=".4"><path d="M62 210 C86 206 108 210 128 208"/><path d="M274 212 C296 208 318 212 338 210"/></g>`;
  const traps = Array.from({ length: 8 }, (_, i) => {
    const angle = (360 / 8) * i - 90;
    const rad = (angle * Math.PI) / 180;
    const x = 200 + Math.cos(rad) * 58;
    const y = 142 + Math.sin(rad) * 34;
    return `<g transform="translate(${x} ${y}) rotate(${angle + 90})">
      <path d="M0 -10 C-7 -12 -8 -20 0 -22 C8 -20 7 -12 0 -10Z" fill="#b7cf92" stroke="${INK}" stroke-width="1.1"/>
      <path d="M-5 -21 C-3 -26 3 -26 5 -21" fill="none" stroke="${INK}" stroke-width=".8"/>
      <path d="M-3 -15 l-2 4 M3 -15 l2 4" stroke="#b4553f" stroke-width=".8"/>
    </g>`;
  }).join("");
  const spokes = Array.from({ length: 8 }, (_, i) => {
    const angle = (360 / 8) * i - 90;
    const rad = (angle * Math.PI) / 180;
    return `<path d="M200 142 L${(200 + Math.cos(rad) * 52).toFixed(1)} ${(142 + Math.sin(rad) * 30).toFixed(1)}" stroke="#6f8d5a" stroke-width="1.2"/>`;
  }).join("");
  return wrap("#4F8A6A", "Waterwheel plant (Aldrovanda) illustration",
    `${water}
     <g transform="translate(0 10)">${spokes}<circle cx="200" cy="142" r="6" fill="#cfe3bd" stroke="${INK}" stroke-width="1.3"/>${traps}</g>
     <path d="M200 178 C198 188 196 194 192 200" fill="none" stroke="#6f8d5a" stroke-width="1.1"/>
     <g fill="none" stroke="#7fa3ad" stroke-width="1" opacity=".5"><ellipse cx="200" cy="146" rx="92" ry="52"/><ellipse cx="200" cy="146" rx="112" ry="64"/></g>`);
}

/* ------------------------------------------------------------------ */
/* Liana — Triphyophyllum / Dioncophyllum vine                         */
/* ------------------------------------------------------------------ */
function liana() {
  const vine = stem("M70 262 C120 226 118 180 158 148 C198 116 190 78 226 54 C252 36 288 34 316 44", 2.4, "#7d5b3c");
  const leaves = [[96, 238, -40], [128, 200, 30], [154, 156, 62], [188, 126, 18], [210, 92, -28], [244, 66, 24], [284, 50, -12]]
    .map(([x, y, angle], i) => `<g transform="translate(${x} ${y}) rotate(${angle})">
      ${leaf("M0 0 C-14 -10 -22 -26 -18 -44 C-4 -38 10 -22 12 -6 C8 -2 4 0 0 0Z", i % 2 ? "#b9cf94" : "#cfe3bd")}
      <path d="M0 0 C-2 -14 0 -28 10 -40" fill="none" stroke="${SOFT}" stroke-width=".9"/>
      ${Array.from({ length: 5 }, (_, j) => `<circle cx="${-4 + j * 3}" cy="${-12 - j * 5}" r=".9" fill="#b4553f"/>`).join("")}
    </g>`).join("");
  const tendrils = `<path d="M158 148 C142 140 128 144 120 156 C132 160 146 156 152 148" fill="none" stroke="#7d5b3c" stroke-width="1.3"/><path d="M226 54 C240 48 254 50 262 60" fill="none" stroke="#7d5b3c" stroke-width="1.3"/><path d="M262 60 C268 52 276 50 282 54" fill="none" stroke="#7d5b3c" stroke-width="1.1"/>`;
  return wrap("#4F7A3A", "Liana (Triphyophyllum group) illustration",
    `${vine}${tendrils}${leaves}${shadow(200, 266, 92)}`);
}

/* ------------------------------------------------------------------ */
/* Devil's claw — Proboscidea / Martynia                               */
/* ------------------------------------------------------------------ */
function devilsClaw() {
  const leaves = [[150, 244, -28], [178, 250, -10], [222, 250, 12], [252, 244, 30]]
    .map(([x, y, r]) => `<g transform="translate(${x} ${y}) rotate(${r})">
      ${leaf("M0 0 C-24 -16 -30 -46 -14 -62 C2 -50 10 -24 0 0Z", "#b9cf94")}
      <path d="M0 0 C-2 -20 -6 -40 -14 -58" fill="none" stroke="${SOFT}" stroke-width=".9"/>
    </g>`).join("");
  const pod = (x, y, rot, scale) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">
    <path d="M0 0 C-18 8 -24 34 -10 50 C0 60 14 56 18 44 C24 26 18 8 0 0Z" fill="#a9bf86" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-5 6 C-14 8 -18 20 -14 32" fill="none" stroke="${SOFT}" stroke-width=".9"/>
    <path d="M-8 48 C-16 62 -18 78 -12 92 C-8 80 -2 68 4 58" fill="none" stroke="#7d5b3c" stroke-width="2"/>
    <path d="M4 48 C12 60 18 74 18 88 C12 78 8 70 4 64" fill="none" stroke="#7d5b3c" stroke-width="1.8"/>
    <path d="M-2 50 C-2 66 0 78 2 88" fill="none" stroke="#7d5b3c" stroke-width="1.4"/>
  </g>`;
  return wrap("#B07A45", "Devil's claw (Proboscidea) illustration",
    `${shadow(200, 258, 82)}${leaves}
     ${stem("M200 250 C198 214 196 188 194 164", 1.6)}
     ${flower(192, 146, 14, 5, "#c98fa6", "#e0c063", -10)}
     ${pod(146, 180, -18, 0.95)}
     ${pod(254, 186, 20, 1.1)}`);
}

/* ------------------------------------------------------------------ */

const plates = {
  "aldrovanda.svg": ["Aldrovanda", aldrovanda],
  "byblis.svg": ["Byblis", byblis],
  "cephalotus.svg": ["Cephalotus", cephalotus],
  "devils-claw.svg": ["Martyniaceae", devilsClaw],
  "darlingtonia.svg": ["Darlingtonia", darlingtonia],
  "dionaea.svg": ["Dionaea", dionaea],
  "liana.svg": ["Dioncophyllaceae", liana],
  "drosera.svg": ["Drosera", drosera],
  "drosophyllum.svg": ["Drosophyllum", drosophyllum],
  "genlisea.svg": ["Genlisea", genlisea],
  "heliamphora.svg": ["Heliamphora", heliamphora],
  "nepenthes.svg": ["Nepenthes", nepenthes],
  "pinguicula.svg": ["Pinguicula", pinguicula],
  "roridula.svg": ["Roridula", roridula],
  "sarracenia.svg": ["Sarracenia", sarracenia],
  "utricularia.svg": ["Utricularia", utricularia],
};

await mkdir(OUT, { recursive: true });
let total = 0;
for (const [file, [label, render]] of Object.entries(plates)) {
  const svg = render();
  await writeFile(join(OUT, file), svg, "utf8");
  total += Buffer.byteLength(svg);
  console.log(`  ${file.padEnd(20)} ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
}
console.log(`\nWrote ${Object.keys(plates).length} illustrations (${(total / 1024).toFixed(1)} KB total)`);
