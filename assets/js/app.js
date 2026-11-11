/* ==========================================================================
   Plantivorous Carnivorous Plant Database — static hash-routed SPA
   No dependencies. Data comes from assets/js/data.js and world-map.js.
   ========================================================================== */

(() => {
  "use strict";

  const DB = window.PLANTIVOROUS;
  const WORLD = window.PLANTIVOROUS_WORLD;
  const app = document.getElementById("main-content") || document.getElementById("app");

  if (!DB || !WORLD) {
    if (app) app.innerHTML = `
      <div class="container not-found">
        <h1>Database unavailable</h1>
        <p>The data bundle could not be loaded. Check that <code>assets/js/data.js</code> and
        <code>assets/js/world-map.js</code> are present next to this page.</p>
      </div>`;
    return;
  }

  /* ---------------------------------------------------------------- helpers */

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  const fmt = (value) => Number(value || 0).toLocaleString("en-ZA");
  const slug = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const unique = (values) => Array.from(new Set(values));
  const debounce = (fn, delay = 180) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const iconPaths = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    heart: '<path d="M12 20.3 4.6 13a4.8 4.8 0 0 1 6.8-6.8l.6.6.6-.6A4.8 4.8 0 0 1 19.4 13Z"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.3 3.5 8.5S14.3 18.1 12 20.5C9.7 18.1 8.5 15.2 8.5 12S9.7 5.9 12 3.5Z"/>',
    external: '<path d="M14 4h6v6M20 4l-8 8"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    zoomIn: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8.5 11h5M11 8.5v5"/>',
    zoomOut: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M8.5 11h5"/>',
    reset: '<path d="M4 4v6h6"/><path d="M4.5 15a8 8 0 1 0 1.3-7.6L4 10"/>',
    pin: '<path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z"/><circle cx="12" cy="11" r="2.2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>',
    water: '<path d="M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3Z"/>',
    soil: '<path d="M4 19h16M6 19c0-4.5 2.7-8 6-8s6 3.5 6 8"/><path d="M12 11V6M12 8c-2.5 0-4-1.5-4-3.5C10.5 4.5 12 6 12 8ZM12 8c2.5 0 4-1.5 4-3.5C13.5 4.5 12 6 12 8Z"/>',
    temp: '<path d="M10 13.5V5a3 3 0 0 1 6 0v8.5a5 5 0 1 1-6 0Z"/><path d="M13 8v7"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8.3 8.3 0 1 0 10.5 10.5Z"/>',
    feed: '<path d="M5 12h14M12 5v14"/><circle cx="12" cy="12" r="8.5"/>',
    propagate: '<path d="M12 21V10M12 14c-4 0-7-2.5-7-7 4 0 7 2.5 7 7ZM12 12c4 0 7-2.5 7-7-4 0-7 2.5-7 7Z"/>',
    warning: '<path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4.5M12 16.5h.01"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"/>',
    leaf: '<path d="M20 4C10 4 4 9 4 16c0 2 .7 3.4 1.5 4C7 13 12 9.5 18 8c-5 2.5-9 6-11 12 8 1 13-4 13-16Z"/>',
    snow: '<path d="M12 2v20M3.5 7l17 10M20.5 7l-17 10"/><path d="m9 4 3 3 3-3M9 20l3-3 3 3M4 10l4 1-1-4M20 14l-4-1 1 4M20 10l-4 1 1-4M4 14l4-1-1 4"/>',
    drop: '<path d="M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3Z"/>',
    mountain: '<path d="m3 19 6-11 4 7 2-4 6 8H3Z"/><path d="m7.5 11 1.5 2 1.5-2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"/><path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  };
  const icon = (name, cls = "") =>
    `<svg${cls ? ` class="${cls}"` : ""} viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || ""}</svg>`;

  const TRAP_ICONS = {
    flypaper: '<path d="M12 21c0-6 2-10 7-13"/><path d="M12 21c0-5-2-8.5-6-11"/><path d="M12 21V9"/><circle cx="12" cy="6" r="2"/><circle cx="7" cy="9" r="1.4"/><circle cx="17" cy="7" r="1.4"/><circle cx="9" cy="14" r="1.2"/><circle cx="15" cy="13" r="1.2"/>',
    pitcher: '<path d="M9 3h6l-1 4c3 2 4 5 4 8 0 3-2 5-6 5s-6-2-6-5c0-3 1-6 4-8L9 3Z"/><path d="M7 11c3 1 7 1 10 0"/><path d="M9 3c0 2 6 2 6 0"/>',
    bladder: '<ellipse cx="12" cy="14" rx="6" ry="5"/><path d="M9 10c-2-2-2-4-1-6M15 10c2-1.5 3-3 3-5"/><path d="M8 19c-2 1-3 1-4 1M16 19c2 1 3 1 4 1"/>',
    snap: '<path d="M4 15c0-4 3-7 8-7s8 3 8 7-3 5-8 5-8-1-8-5Z"/><path d="M6 14c2-2 4-3 6-3s4 1 6 3"/><path d="m7 8-1-3M9 7 9 4M15 7l1-3M17 8l2-3"/>',
    lobster: '<path d="M12 20c-4 0-6-2.5-6-6s2-7 6-7 6 4 6 7-2 6-6 6Z"/><path d="M12 20c0-3 1-5 3-7M12 20c0-3-1-5-3-7"/><path d="M8 9C6 7 6 5 7 3M16 9c2-2 2-4 1-6"/>',
    "devils-claw": '<path d="M5 15c0-4 3-7 7-7s7 3 7 7"/><path d="M8 15c0-2 1.5-4 4-4s4 2 4 4"/><path d="M12 15c-3 2-4 4-4 7M12 15c2 2 3 4 3 7"/>',
    liana: '<path d="M5 21C5 12 9 6 18 4"/><path d="M8 16c3-2 6-2 8 0M10 11c2-2 4-2 5 0M14 7c1.5-1 3-1 4 0"/><path d="M18 4c1-1 2-1 3 0"/>',
  };

  /* ---------------------------------------------------------------- data indexes */

  const SPECIES = DB.species;
  const GENERA = DB.genera;
  const CARE_GROUPS = DB.careGroups;
  const SPECIES_BY_ID = new Map(SPECIES.map((species) => [species.id, species]));
  const GENUS_BY_NAME = new Map(GENERA.map((genus) => [genus.genus, genus]));
  const CARE_BY_KEY = new Map(CARE_GROUPS.map((group) => [group.key, group]));
  const FEATURED = DB.featuredSpecies.map((id) => SPECIES_BY_ID.get(id)).filter(Boolean);
  const RECENT = DB.recentSpecies.map((id) => SPECIES_BY_ID.get(id)).filter(Boolean);
  const WATCHLIST = DB.watchlistSpecies.map((id) => SPECIES_BY_ID.get(id)).filter(Boolean);
  const CHANGELOG = [...(DB.changelog?.entries || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const TRAP_FAMILIES = [
    { key: "flypaper", label: "Sticky flypaper", short: "Flypaper", color: "#2BA84A", soft: "#eaf6e9", description: "Glistening glue glands on leaves that slowly curl around prey." },
    { key: "pitcher", label: "Pitfall pitchers", short: "Pitchers", color: "#A64B2A", soft: "#f7ebe1", description: "Deep wells with slippery rims, digestive fluid and insect lures." },
    { key: "bladder", label: "Bladder traps", short: "Bladders", color: "#3E7CB1", soft: "#e8f1f8", description: "Underwater suction bladders that fire in milliseconds." },
    { key: "snap", label: "Snap traps", short: "Snap traps", color: "#C9624A", soft: "#f8e8e4", description: "Hinged jaws with trigger hairs — flytraps and waterwheels." },
    { key: "lobster", label: "Lobster-pot traps", short: "Lobster pots", color: "#8C6BB1", soft: "#f1eaf7", description: "Twisted corridors that funnel tiny aquatic animals inward." },
    { key: "devils-claw", label: "Devil's claws", short: "Devil's claws", color: "#B07A45", soft: "#f6ecdd", description: "Sticky young plants and hooked seed pods that hitch a ride." },
    { key: "liana", label: "Liana traps", short: "Lianas", color: "#4F7A3A", soft: "#ecf2e4", description: "Tropical vines with glandular leaves and snap-tentacles." },
  ];
  const TRAP_FAMILY_BY_KEY = new Map(TRAP_FAMILIES.map((family) => [family.key, family]));

  const TRAP_LABELS = {
    flypaper: "Sticky flypaper",
    bladder: "Bladder trap",
    "pitcher-nepenthes": "Tropical pitcher",
    "pitcher-sarracenia": "North American pitcher",
    "pitcher-heliamphora": "Sun pitcher",
    "pitcher-cobra": "Cobra lily",
    "pitcher-squat": "Albany pitcher",
    lobster: "Lobster-pot trap",
    "devils-claw": "Devil's claw",
    liana: "Liana trap",
    snap: "Snap trap",
  };

  const trapFamilyOf = (species) =>
    species.trapGroup && species.trapGroup.startsWith("pitcher") ? "pitcher" : (species.trapGroup || "other");
  const trapLabelOf = (species) => TRAP_LABELS[species.trapGroup] || species.trapType || "Carnivorous plant";
  const genusOf = (species) => GENUS_BY_NAME.get(species.genus);

  function difficultyClass(level) {
    return `difficulty difficulty--${slug(level || "varies")}`;
  }

  function iucnPill(species) {
    const iucn = species.iucn || { code: "NE", label: "Not assessed", tone: "ne" };
    let cls = "pill";
    if (["cr", "en"].includes(iucn.tone)) cls += " pill--red";
    else if (["vu", "nt"].includes(iucn.tone)) cls += " pill--amber";
    else if (iucn.tone === "lc") cls += " pill--green";
    else if (iucn.tone === "dd") cls += " pill--violet";
    return `<span class="${cls}" title="IUCN Red List status">${esc(iucn.code)} · ${esc(iucn.label)}</span>`;
  }

  function photoCredit(species) {
    const photo = species.photo;
    if (!photo) return "";
    const artist = photo.artist || "Wikimedia Commons";
    const license = photo.license || "See source";
    return `${esc(artist)} · ${esc(license)}`;
  }

  function speciesImage(species) {
    return {
      src: species.photo?.path || species.illustration,
      isPhoto: Boolean(species.photo?.path),
      alt: species.photo?.alt || `${species.name} botanical illustration`,
    };
  }

  function imageTag(species, { loading = "lazy", sizes = "", className = "" } = {}) {
    const image = speciesImage(species);
    return `<img src="${esc(image.src)}" alt="${esc(image.alt)}" ${loading ? `loading="${loading}"` : ""} decoding="async" data-fallback="${esc(species.illustration)}"${sizes ? ` sizes="${esc(sizes)}"` : ""}${className ? ` class="${className}"` : ""}>`;
  }

  const linkedSpeciesName = (species) =>
    `<a href="#/species/${esc(species.id)}"><em>${esc(species.name)}</em></a>`;

  const linkedGenusName = (genus) =>
    `<a href="#/genus/${encodeURIComponent(genus)}"><em>${esc(genus)}</em></a>`;

  function breadcrumb(items) {
    return `<nav class="breadcrumb" aria-label="Breadcrumb">${items
      .map((item, index) => {
        const separator = index ? '<span aria-hidden="true">/</span>' : "";
        if (item.href) return `${separator}<a href="${esc(item.href)}">${item.label}</a>`;
        return `${separator}<span${index === items.length - 1 ? ' aria-current="page"' : ""}>${item.label}</span>`;
      })
      .join("")}</nav>`;
  }

  function pageHead({ crumbs = "", eyebrow = "", title, lede = "", stat = "", statLabel = "" }) {
    return `
      <section class="page-head">
        <div class="container">
          ${crumbs}
          <div class="page-head-row">
            <div>
              ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
              <h1>${title}</h1>
              ${lede ? `<p class="page-head-lede">${lede}</p>` : ""}
            </div>
            ${stat ? `<div class="page-head-stat"><strong>${stat}</strong><span>${esc(statLabel)}</span></div>` : ""}
          </div>
        </div>
      </section>`;
  }

  function difficultyMeter(level) {
    const value = clamp(Number(level) || 2, 1, 5);
    return `<span class="difficulty-meter" data-level="${value}" aria-label="Difficulty ${value} out of 5">${[1, 2, 3, 4, 5]
      .map((step) => `<i${step <= value ? ' class="is-on"' : ""}></i>`)
      .join("")}</span>`;
  }

  /* ---------------------------------------------------------------- favourites */

  const FAV_KEY = "plantivorous.favourites.v1";
  let favourites = loadFavourites();

  function loadFavourites() {
    try {
      const stored = JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
      return new Set(Array.isArray(stored) ? stored.filter((id) => SPECIES_BY_ID.has(id)) : []);
    } catch {
      return new Set();
    }
  }

  function saveFavourites() {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favourites]));
    } catch {
      /* storage can be unavailable in private or file contexts */
    }
  }

  function updateFavouriteButtons() {
    $$("[data-fav]").forEach((button) => {
      const id = button.dataset.fav;
      const active = favourites.has(id);
      button.classList.toggle("is-fav", active);
      button.setAttribute("aria-pressed", String(active));
      const name = SPECIES_BY_ID.get(id)?.name || "species";
      button.setAttribute("aria-label", active ? `Remove ${name} from favourites` : `Add ${name} to favourites`);
      button.title = active ? "Remove from favourites" : "Add to favourites";
      const label = button.querySelector("span");
      if (label) label.textContent = active ? "Saved to favourites" : "Save to favourites";
    });
    const count = favourites.size;
    const headerCount = $("#fav-count");
    if (headerCount) {
      headerCount.textContent = count;
      headerCount.hidden = count === 0;
    }
    const mobileCount = $("#mobile-fav-count");
    if (mobileCount) mobileCount.textContent = count;
  }

  function toggleFavourite(id) {
    const species = SPECIES_BY_ID.get(id);
    if (!species) return;
    if (favourites.has(id)) {
      favourites.delete(id);
      showToast(`Removed <em>${esc(species.name)}</em> from favourites.`);
    } else {
      favourites.add(id);
      showToast(`Saved <em>${esc(species.name)}</em>. <a href="#/favourites">View favourites</a>`);
    }
    saveFavourites();
    updateFavouriteButtons();
  }

  let toastTimer;
  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.innerHTML = message;
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
      toastTimer = setTimeout(() => { toast.hidden = true; }, 260);
    }, 2800);
  }

  /* ---------------------------------------------------------------- cards */

  function speciesCard(species, { list = false } = {}) {
    const image = speciesImage(species);
    const common = species.commonName && !species.commonNameIsGenus ? species.commonName : "";
    const badges = [
      species.provisional ? '<span class="pill pill--lime">Provisional</span>' : "",
      species.hybrid ? '<span class="pill pill--violet">Natural hybrid</span>' : "",
    ].filter(Boolean).join("");
    return `
      <article class="species-card" data-species-card>
        <a class="species-card__media${image.isPhoto ? "" : " is-illustration"}" href="#/species/${esc(species.id)}" tabindex="-1" aria-hidden="true">
          <img src="${esc(image.src)}" alt="" loading="lazy" decoding="async" data-fallback="${esc(species.illustration)}">
          ${badges ? `<span class="species-card__badges">${badges}</span>` : ""}
        </a>
        <button class="fav-btn${favourites.has(species.id) ? " is-fav" : ""}" type="button" data-fav="${esc(species.id)}" aria-pressed="${favourites.has(species.id)}" aria-label="${favourites.has(species.id) ? "Remove" : "Add"} ${esc(species.name)} ${favourites.has(species.id) ? "from" : "to"} favourites">
          ${icon("heart")}
        </button>
        <div class="species-card__body">
          <p class="species-card__kicker"><span>${esc(species.genus)}</span><span>${esc(species.family)}</span></p>
          <h3><a href="#/species/${esc(species.id)}"><em>${esc(species.name)}</em></a></h3>
          ${common ? `<p class="species-card__common">${esc(common)}</p>` : ""}
          <p class="species-card__summary">${esc(species.summary || species.description)}</p>
          <div class="species-card__meta">
            <span class="pill">${esc(trapLabelOf(species))}</span>
            <span class="${difficultyClass(species.difficulty)}">${esc(species.difficulty || "Varies")}</span>
          </div>
          <div class="species-card__foot">
            <span>${esc(species.nativeShort || species.nativeRange || "Range unknown")}</span>
            <span>${species.year ? esc(species.year) : "—"}</span>
          </div>
        </div>
      </article>`;
  }

  function speciesMini(species) {
    const image = speciesImage(species);
    return `<a class="species-mini" href="#/species/${esc(species.id)}">
      <span class="species-mini__media${image.isPhoto ? "" : " is-illustration"}">
        <img src="${esc(image.src)}" alt="" loading="lazy" decoding="async" data-fallback="${esc(species.illustration)}">
      </span>
      <span class="species-mini__body">
        <strong><em>${esc(species.name)}</em></strong>
        <span>${esc(species.genus)} · ${esc(species.family)}</span>
      </span>
    </a>`;
  }

  function genusCard(genus) {
    return `<a class="genus-card" href="#/genus/${encodeURIComponent(genus.genus)}">
      <div class="genus-card__art">
        <img src="${esc(genus.illustration)}" alt="Botanical illustration of ${esc(genus.genus)}" loading="lazy" decoding="async">
        <span class="genus-card__count">${fmt(genus.speciesCount)} taxa</span>
      </div>
      <div class="genus-card__body">
        <h3><em>${esc(genus.genus)}</em></h3>
        <p class="genus-card__common">${esc(genus.commonName)}</p>
        <div class="genus-card__foot">
          <span>${esc(genus.family)}</span>
          <span>${esc(genus.difficulty)}</span>
        </div>
      </div>
    </a>`;
  }

  function careCard(group) {
    return `<a class="care-card" href="#/care/${esc(group.key)}">
      <div class="care-card__top">
        <span class="care-card__icon">${icon(careIcon(group.key))}</span>
        ${difficultyMeter(group.difficultyLevel)}
      </div>
      <h3>${esc(group.label)}</h3>
      <p class="care-card__tagline">${esc(group.tagline)}</p>
      <div class="care-card__meta">
        <span class="pill pill--green">${fmt(group.speciesCount)} taxa</span>
        <span class="pill">${esc(group.difficulty)}</span>
      </div>
      <div class="care-card__foot">
        <span>${group.genera.length} ${group.genera.length === 1 ? "genus" : "genera"}</span>
        <strong>Care sheet →</strong>
      </div>
    </a>`;
  }

  function careIcon(key) {
    if (["temperate", "cape", "pygmy", "tuberous"].includes(key)) return "snow";
    if (["aquatic", "tropical"].includes(key)) return "water";
    if (["highland", "montane"].includes(key)) return "mountain";
    if (key === "epiphytic") return "leaf";
    if (key === "mexican") return "sun";
    if (key === "lowland") return "sun";
    return "sun";
  }

  /* ---------------------------------------------------------------- world map helpers */

  function projectPoint(lat, lon) {
    const x = ((lon - WORLD.lonLeft) / (WORLD.lonRight - WORLD.lonLeft)) * WORLD.width;
    const y = ((WORLD.latTop - lat) / (WORLD.latTop - WORLD.latBottom)) * WORLD.height;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }

  function renderWorldSvg({
    points = [],
    viewBox = `0 0 ${WORLD.width} ${WORLD.height}`,
    className = "",
    label = "World map",
    graticule = true,
    interactive = false,
    bubbles = "",
  } = {}) {
    const countries = WORLD.countries
      .map((country) => `<path d="${country.d}"><title>${esc(country.name)}</title></path>`)
      .join("");
    const lines = graticule
      ? `<g class="map-graticule">${WORLD.graticule.map((line) => `<path d="${line.d}"/>`).join("")}</g>`
      : "";
    const dots = points
      .map((point) => {
        const [x, y] = projectPoint(point.lat, point.lon);
        const classes = ["map-point"];
        if (point.introduced) classes.push("map-point--introduced");
        if (point.uncertain) classes.push("map-point--uncertain");
        return `<circle class="${classes.join(" ")}" cx="${x}" cy="${y}" r="${point.r || 2.4}"><title>${esc(point.label || point.country || "")}</title></circle>`;
      })
      .join("");
    return `<svg class="${className}" viewBox="${viewBox}" ${interactive ? 'role="group"' : 'role="img"'} aria-label="${esc(label)}" preserveAspectRatio="xMidYMid meet">
      <g class="map-countries">${countries}</g>
      ${lines}
      ${bubbles}
      ${dots}
    </svg>`;
  }

  function speciesViewBox(species) {
    const points = (species.originPoints || []).map((point) => projectPoint(point.lat, point.lon));
    if (!points.length) return `0 0 ${WORLD.width} ${WORLD.height}`;
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);
    let width = Math.max(maxX - minX, 150);
    let height = Math.max(maxY - minY, 60);
    const ratio = WORLD.width / WORLD.height;
    if (width / height < ratio) width = height * ratio;
    else height = width / ratio;
    width = Math.min(width * 1.35, WORLD.width);
    height = Math.min(height * 1.35, WORLD.height);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const x = clamp(centerX - width / 2, 0, WORLD.width - width);
    const y = clamp(centerY - height / 2, 0, WORLD.height - height);
    return `${x.toFixed(1)} ${y.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`;
  }

  function miniMap(species) {
    return `<div class="range-map">${renderWorldSvg({
      points: (species.originPoints || []).map((point) => ({ ...point, r: point.kind === "locality" ? 3.2 : 2.5 })),
      viewBox: speciesViewBox(species),
      label: `Approximate native range of ${species.name}`,
      graticule: false,
    })}</div>`;
  }

  /* ---------------------------------------------------------------- home view */

  function homeView() {
    const featured = unique([...FEATURED.filter((species) => species.hasPhoto), ...FEATURED]).slice(0, 8);
    const iconic = ["Dionaea", "Nepenthes", "Sarracenia", "Drosera", "Pinguicula", "Utricularia", "Heliamphora", "Cephalotus"]
      .map((name) => GENUS_BY_NAME.get(name))
      .filter(Boolean);
    const teaserGroups = ["temperate", "highland", "aquatic"].map((key) => CARE_BY_KEY.get(key)).filter(Boolean);
    const teaserPoints = unique(FEATURED
      .filter((species) => species.hasPhoto && species.originPoints?.length)
      .flatMap((species) => species.originPoints.filter((point) => !point.introduced).map((point) => `${point.lat.toFixed(1)},${point.lon.toFixed(1)}`)))
      .slice(0, 240)
      .map((key) => {
        const [lat, lon] = key.split(",").map(Number);
        return { lat, lon };
      });

    const trapCards = TRAP_FAMILIES.map((trap) => {
      const count = SPECIES.filter((species) => trapFamilyOf(species) === trap.key).length;
      return `<a class="trap-card" href="#/database?trap=${encodeURIComponent(trap.key)}" style="--trap:${trap.color};--trap-soft:${trap.soft}">
        <span class="trap-card__icon"><svg viewBox="0 0 24 24" aria-hidden="true">${TRAP_ICONS[trap.key] || ""}</svg></span>
        <h3>${esc(trap.label)}</h3>
        <p>${esc(trap.description)}</p>
        <span class="trap-card__count">${fmt(count)} <span>taxa</span></span>
      </a>`;
    }).join("");

    const recentItems = RECENT.slice(0, 4).map((species) => `<a class="recent-item" href="#/species/${esc(species.id)}">
      <span class="recent-item__year">${esc(species.year || "Recent")}</span>
      <strong><em>${esc(species.name)}</em></strong>
      <span>${esc(species.family)}${species.provisional ? " · provisional" : ""}</span>
    </a>`).join("");

    return `
      <section class="hero">
        <div class="hero-media"><img src="assets/img/plantivorous-hero.jpg" alt="A dewy carnivorous plant photographed in close-up" fetchpriority="high"></div>
        <div class="hero-overlay"></div>
        <div class="container hero-inner">
          <div class="hero-copy">
            <p class="eyebrow light">The Plantivorous field guide</p>
            <h1>Carnivorous plants,<br><em>catalogued.</em></h1>
            <p class="hero-lede">Every accepted species and natural hybrid in the ICPS names resource — with native-range maps, discovery stories, photographs, botanical plates and care that actually works.</p>
            <form class="hero-search" data-hero-search role="search">
              <label class="visually-hidden" for="hero-search">Search species, genera or countries</label>
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
              <input id="hero-search" name="q" type="search" placeholder="Try “Nepenthes rajah”, “sundew” or “Madagascar”…" autocomplete="off">
              <button type="submit">Search</button>
            </form>
            <div class="hero-quicklinks">
              <span>Popular:</span>
              <a href="#/database?q=Nepenthes">Nepenthes</a>
              <a href="#/database?q=Drosera">Sundews</a>
              <a href="#/database?q=Dionaea">Flytraps</a>
              <a href="#/database?q=Sarracenia">Pitcher plants</a>
              <a href="#/database?sort=newest">Recently described</a>
            </div>
          </div>
        </div>
        <p class="hero-credit">Photo: <a href="https://www.plantivorous.co.za/" target="_blank" rel="noopener">Plantivorous</a></p>
      </section>

      <div class="container">
        <div class="stats-band">
          <div class="stat"><a href="#/database"><strong>${fmt(DB.meta.totalSpecies)}</strong><span>Taxa catalogued<br>${fmt(DB.meta.icpsCount)} ICPS + ${fmt(DB.meta.provisionalCount)} provisional</span></a></div>
          <div class="stat"><a href="#/genera"><strong>${fmt(DB.meta.genusCount)}</strong><span>Genera</span></a></div>
          <div class="stat"><a href="#/database"><strong>${fmt(DB.meta.familyCount)}</strong><span>Plant families</span></a></div>
          <div class="stat"><a href="#/map"><strong>${fmt(DB.meta.countryCount)}</strong><span>Countries &amp; territories</span></a></div>
          <div class="stat"><a href="#/database?photo=1"><strong>${fmt(DB.meta.photoCount)}</strong><span>Licensed photographs</span></a></div>
        </div>
      </div>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <p class="eyebrow">Start here</p>
              <h2>Meet the plants behind the traps.</h2>
              <p>From the snap of a Venus flytrap to the silent suction of a bladderwort, every hunting method has a different anatomy, habitat and set of care needs.</p>
            </div>
            <a class="section-link" href="#/database">Browse all ${fmt(DB.meta.totalSpecies)} taxa ${icon("arrow")}</a>
          </div>
          <div class="trap-grid">${trapCards}</div>
        </div>
      </section>

      <section class="section section--paper">
        <div class="container">
          <div class="section-head">
            <div>
              <p class="eyebrow">Field highlights</p>
              <h2>Flagship species, photographed.</h2>
              <p>Some of the most extraordinary carnivores in the catalogue, chosen for their beauty, their hunting tactics and the stories behind their discovery.</p>
            </div>
            <a class="section-link" href="#/database?photo=1">All photographed species ${icon("arrow")}</a>
          </div>
          <div class="species-grid species-grid--four">${featured.map((species) => speciesCard(species)).join("")}</div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="section-head">
            <div>
              <p class="eyebrow">The genera</p>
              <h2>Twenty-one ways to be carnivorous.</h2>
              <p>Each genus page collects identification notes, ecology, a care overview and every accepted species in the group.</p>
            </div>
            <a class="section-link" href="#/genera">Explore all genera ${icon("arrow")}</a>
          </div>
          <div class="genus-grid">${iconic.map((genus) => genusCard(genus)).join("")}</div>
        </div>
      </section>

      <section class="section section--tight">
        <div class="container">
          <div class="map-teaser">
            <div class="map-teaser-copy">
              <p class="eyebrow light">Native ranges</p>
              <h2>See where the world keeps its carnivores.</h2>
              <p>Every species is linked to the countries and regions recorded in the ICPS names resource. The map plots approximate country and province centroids — a guide to distribution, not a survey.</p>
              <div class="map-teaser-stats">
                <div><strong>${fmt(DB.meta.mapPointCount)}</strong><span>Range markers</span></div>
                <div><strong>${fmt(DB.meta.countryCount)}</strong><span>Countries</span></div>
                <div><strong>${fmt(DB.meta.genusCount)}</strong><span>Genera</span></div>
              </div>
              <div class="map-teaser-actions">
                <a class="btn btn--lime" href="#/map">Open the range map ${icon("arrow")}</a>
                <a class="btn btn--secondary" href="#/database?continent=Asia">Browse Asian species</a>
              </div>
            </div>
            <figure class="map-teaser-map">
              ${renderWorldSvg({ points: teaserPoints, label: "Approximate global distribution of flagship carnivorous plants" })}
              <figcaption>Approximate distribution · Natural Earth boundaries</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section class="section section--paper">
        <div class="container">
          <div class="section-head">
            <div>
              <p class="eyebrow">Grow with confidence</p>
              <h2>Care grouped by how the plant lives.</h2>
              <p>Species within a genus can want opposite conditions. Our 17 cross-genus care groups sort plants by the climate and water regime they actually need.</p>
            </div>
            <a class="section-link" href="#/care">All 17 care guides ${icon("arrow")}</a>
          </div>
          <div class="care-grid">${teaserGroups.map((group) => careCard(group)).join("")}</div>
        </div>
      </section>

      <section class="section">
        <div class="container">
          <div class="monitor-panel">
            <div>
              <p class="eyebrow">Monitoring</p>
              <h2>The catalogue keeps growing.</h2>
              <p>The baseline is the ICPS Carnivorous Plant Names Resource snapshot of ${esc(new Date(DB.meta.icpsSnapshot).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }))}. New descriptions are compared against it, and recent taxa awaiting ICPS inclusion are held on a clearly marked watchlist.</p>
              <div class="recent-strip" style="margin-top:22px">${recentItems}</div>
              <div class="map-teaser-actions" style="margin-top:22px">
                <a class="btn btn--primary" href="#/new">What's new ${icon("arrow")}</a>
                <a class="btn btn--secondary" href="#/about">How it works</a>
              </div>
            </div>
            <div class="watch-list">
              <div class="watch-list__head">
                <h3>Recently described · watchlist</h3>
                <span>${WATCHLIST.length} taxa</span>
              </div>
              <div class="watch-list__items">
                ${WATCHLIST.slice(0, 5).map((species) => `<a href="#/species/${esc(species.id)}"><span><em>${esc(species.name)}</em></span><span>${esc(species.year || "")}</span></a>`).join("")}
              </div>
              <a class="watch-list__more" href="#/new">See the full watchlist ${icon("arrow")}</a>
            </div>
          </div>
        </div>
      </section>

      <section class="section section--tight">
        <div class="container">
          <div class="about-strip">
            <div>
              <p class="eyebrow">Built for Plantivorous</p>
              <h2>A reference that behaves like a field guide.</h2>
              <p>Names are checked against the ICPS Carnivorous Plant Names Resource. Descriptions and care notes are original editorial work, illustrated with botanical plates and openly licensed photographs. Range maps use country and province centroids, so they show distribution rather than precise localities.</p>
              <p>Made to live on plantivorous.co.za as a self-contained, static catalogue — no server, no tracking, no external map tiles.</p>
              <div class="map-teaser-actions">
                <a class="btn btn--primary" href="#/about">About the database ${icon("arrow")}</a>
                <a class="btn btn--ghost" href="#/favourites">Your favourites</a>
              </div>
            </div>
            <div class="about-strip__art">
              <img src="assets/img/species/drosera-regia.jpg" alt="Drosera regia" loading="lazy">
              <img src="assets/img/species/nepenthes-rajah.jpg" alt="Nepenthes rajah" loading="lazy">
              <img src="assets/img/species/sarracenia-leucophylla.jpg" alt="Sarracenia leucophylla" loading="lazy">
              <img src="assets/img/species/dionaea-muscipula.jpg" alt="Dionaea muscipula" loading="lazy">
            </div>
          </div>
        </div>
      </section>

      <section class="section section--tight">
        <div class="container">
          <div class="cta-band">
            <div>
              <h2>Find the plant you have been looking for.</h2>
              <p>Search 760 taxa by name, family, trap type, difficulty, care group or native continent.</p>
            </div>
            <a class="btn btn--lime" href="#/database">Open the database ${icon("arrow")}</a>
          </div>
        </div>
      </section>`;
  }

  function trapIcon(key) {
    return key === "devils-claw" ? "devils-claw" : key;
  }

  /* ---------------------------------------------------------------- database view */

  const dbState = {
    filtered: [],
    limit: 48,
    rendered: 0,
    view: "grid",
  };

  const DIFFICULTY_ORDER = ["Beginner", "Easy", "Intermediate", "Advanced", "Expert", "Varies"];

  function normalizeText(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function option(value, label, selected, count) {
    return `<option value="${esc(value)}"${selected ? " selected" : ""}>${esc(label)}${count != null ? ` (${fmt(count)})` : ""}</option>`;
  }

  function filterCounts(key) {
    const counts = new Map();
    for (const species of SPECIES) {
      const value = key === "trap" ? trapFamilyOf(species) : species[key];
      if (value == null || value === "") continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return counts;
  }

  function databaseView(route) {
    const params = route.params;
    const current = {
      q: params.get("q") || "",
      genus: params.get("genus") || "",
      family: params.get("family") || "",
      trap: params.get("trap") || "",
      difficulty: params.get("difficulty") || "",
      continent: params.get("continent") || "",
      care: params.get("care") || "",
      photo: params.get("photo") === "1",
      provisional: params.get("provisional") !== "0",
      sort: params.get("sort") || "name",
      view: params.get("view") === "list" ? "list" : "grid",
    };
    dbState.view = current.view;
    dbState.limit = 48;
    dbState.rendered = 0;
    dbState.filtered = filterSpecies(current);

    const genusCounts = filterCounts("genus");
    const familyCounts = filterCounts("family");
    const trapCounts = new Map(TRAP_FAMILIES.map((trap) => [trap.key, SPECIES.filter((species) => trapFamilyOf(species) === trap.key).length]));
    const difficultyCounts = filterCounts("difficulty");
    const continentCounts = new Map();
    for (const species of SPECIES) {
      for (const continent of species.continents || []) {
        continentCounts.set(continent, (continentCounts.get(continent) || 0) + 1);
      }
    }
    const careCounts = filterCounts("careGroup");

    return `${pageHead({
      crumbs: breadcrumb([{ label: "Home", href: "#/" }, { label: "Database" }]),
      eyebrow: "The catalogue",
      title: "Species database",
      lede: `Search and filter ${fmt(DB.meta.totalSpecies)} carnivorous plant taxa — ${fmt(DB.meta.icpsCount)} accepted by the ICPS plus ${fmt(DB.meta.provisionalCount)} provisional entries held on the watchlist.`,
      stat: fmt(DB.meta.totalSpecies),
      statLabel: "Taxa catalogued",
    })}
    <div class="container database-layout">
      <div class="filters-backdrop" data-filters-close></div>
      <aside class="filters-panel" id="filters-panel" aria-label="Filter species">
        <div class="filters-head">
          <h2>Filter the catalogue</h2>
          <button type="button" data-clear-filters>Reset all</button>
          <button class="filters-close" type="button" data-filters-close aria-label="Close filters">×</button>
        </div>
        <form id="db-filters" autocomplete="off">
          <div class="filter-group">
            <label for="f-genus">Genus</label>
            <select id="f-genus" name="genus">
              ${option("", "All 21 genera", !current.genus)}
              ${[...genusCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([value, count]) => option(value, value, current.genus === value, count)).join("")}
            </select>
          </div>
          <div class="filter-group">
            <label for="f-family">Family</label>
            <select id="f-family" name="family">
              ${option("", "All families", !current.family)}
              ${[...familyCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([value, count]) => option(value, value, current.family === value, count)).join("")}
            </select>
          </div>
          <div class="filter-group">
            <label for="f-trap">Trap type</label>
            <select id="f-trap" name="trap">
              ${option("", "All trap types", !current.trap)}
              ${TRAP_FAMILIES.map((trap) => option(trap.key, trap.label, current.trap === trap.key, trapCounts.get(trap.key))).join("")}
            </select>
          </div>
          <div class="filter-group">
            <label for="f-difficulty">Care difficulty</label>
            <select id="f-difficulty" name="difficulty">
              ${option("", "Any difficulty", !current.difficulty)}
              ${unique([...DIFFICULTY_ORDER, ...difficultyCounts.keys()]).filter((value) => difficultyCounts.has(value)).map((value) => option(value, value, current.difficulty === value, difficultyCounts.get(value))).join("")}
            </select>
          </div>
          <div class="filter-group">
            <label for="f-continent">Native continent</label>
            <select id="f-continent" name="continent">
              ${option("", "All continents", !current.continent)}
              ${[...continentCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([value, count]) => option(value, value, current.continent === value, count)).join("")}
            </select>
          </div>
          <div class="filter-group">
            <label for="f-care">Care group</label>
            <select id="f-care" name="care">
              ${option("", "All care groups", !current.care)}
              ${CARE_GROUPS.map((group) => option(group.key, group.label, current.care === group.key, careCounts.get(group.key) || 0)).join("")}
            </select>
          </div>
          <div class="filter-checks">
            <label class="check">
              <input type="checkbox" name="photo"${current.photo ? " checked" : ""}>
              <span>Photographed only <small>${fmt(DB.meta.photoCount)} species with a licensed photo</small></span>
            </label>
            <label class="check">
              <input type="checkbox" name="provisional"${current.provisional ? " checked" : ""}>
              <span>Include provisional taxa <small>The watchlist sits outside the 751 ICPS count</small></span>
            </label>
          </div>
          <button class="btn btn--primary btn--wide filters-done" type="button" data-filters-close>Show ${fmt(dbState.filtered.length)} results</button>
        </form>
        <p class="filters-note"><strong>Search tips:</strong> try a genus, country, common name, care group or trait such as “highland” or “Critically Endangered”.</p>
      </aside>

      <div class="results-panel">
        <div class="results-toolbar">
          <button class="filters-toggle" type="button" data-filters-toggle aria-expanded="false" aria-controls="filters-panel">
            ${icon("filter")} Filters
          </button>
          <div class="search-field">
            ${icon("search")}
            <label class="visually-hidden" for="db-search">Search species</label>
            <input id="db-search" type="search" placeholder="Search ${fmt(DB.meta.totalSpecies)} taxa by name, country or trait…" value="${esc(current.q)}" autocomplete="off">
            <button class="search-clear" type="button" data-db-clear${current.q ? "" : " hidden"} aria-label="Clear search">${icon("close")}</button>
          </div>
          <label class="visually-hidden" for="db-sort">Sort results</label>
          <select class="sort-select" id="db-sort" data-db-sort>
            ${option("name", "A–Z by name", current.sort === "name")}
            ${option("newest", "Newest described", current.sort === "newest")}
            ${option("oldest", "Oldest described", current.sort === "oldest")}
            ${option("genus", "Genus, then name", current.sort === "genus")}
            ${option("difficulty", "Easiest first", current.sort === "difficulty")}
          </select>
          <div class="view-toggle" role="group" aria-label="Result layout">
            <button type="button" data-view="grid" class="${current.view === "grid" ? "is-active" : ""}" aria-pressed="${current.view === "grid"}" aria-label="Grid view">${icon("grid")}</button>
            <button type="button" data-view="list" class="${current.view === "list" ? "is-active" : ""}" aria-pressed="${current.view === "list"}" aria-label="List view">${icon("list")}</button>
          </div>
        </div>

        <div id="db-active-filters" class="active-filters"></div>
        <div class="results-meta">
          <span id="db-count" aria-live="polite"></span>
          <span class="results-note" id="db-sort-note"></span>
        </div>
        <div id="db-results" class="species-grid${current.view === "list" ? " is-list" : ""}"></div>
        <div class="load-more-wrap" id="db-load-more-wrap"></div>
      </div>
    </div>`;
  }

  function filterSpecies(filters) {
    const tokens = normalizeText(filters.q).split(/\s+/).filter(Boolean);
    const filtered = SPECIES.filter((species) => {
      if (!filters.provisional && species.provisional) return false;
      if (filters.genus && species.genus !== filters.genus) return false;
      if (filters.family && species.family !== filters.family) return false;
      if (filters.trap && trapFamilyOf(species) !== filters.trap) return false;
      if (filters.difficulty && species.difficulty !== filters.difficulty) return false;
      if (filters.continent && !(species.continents || []).includes(filters.continent)) return false;
      if (filters.care && species.careGroup !== filters.care) return false;
      if (filters.photo && !species.hasPhoto) return false;
      if (tokens.length) {
        const haystack = normalizeText([
          species.searchText,
          species.fullName,
          species.commonName,
          species.genus,
          species.family,
          species.careGroupLabel,
          (species.nativeCountries || []).join(" "),
          (species.nativeRegions || []).join(" "),
          (species.tags || []).join(" "),
        ].filter(Boolean).join(" "));
        if (!tokens.every((token) => haystack.includes(token))) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      switch (filters.sort) {
        case "newest":
          return (b.sortYear || 0) - (a.sortYear || 0) || a.name.localeCompare(b.name);
        case "oldest":
          return (a.sortYear || 9999) - (b.sortYear || 9999) || a.name.localeCompare(b.name);
        case "genus":
          return a.genus.localeCompare(b.genus) || a.name.localeCompare(b.name);
        case "difficulty":
          return (a.careDifficultyLevel || 3) - (b.careDifficultyLevel || 3) || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return filtered;
  }

  function currentDbFilters() {
    const form = $("#db-filters");
    if (!form) return null;
    return {
      q: $("#db-search")?.value.trim() || "",
      genus: form.elements.genus?.value || "",
      family: form.elements.family?.value || "",
      trap: form.elements.trap?.value || "",
      difficulty: form.elements.difficulty?.value || "",
      continent: form.elements.continent?.value || "",
      care: form.elements.care?.value || "",
      photo: Boolean(form.elements.photo?.checked),
      provisional: Boolean(form.elements.provisional?.checked),
      sort: $("#db-sort")?.value || "name",
      view: dbState.view,
    };
  }

  function dbQueryString(filters) {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.genus) params.set("genus", filters.genus);
    if (filters.family) params.set("family", filters.family);
    if (filters.trap) params.set("trap", filters.trap);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.continent) params.set("continent", filters.continent);
    if (filters.care) params.set("care", filters.care);
    if (filters.photo) params.set("photo", "1");
    if (!filters.provisional) params.set("provisional", "0");
    if (filters.sort !== "name") params.set("sort", filters.sort);
    if (filters.view === "list") params.set("view", "list");
    const query = params.toString();
    return `#/database${query ? `?${query}` : ""}`;
  }

  function replaceHash(hash) {
    try {
      history.replaceState(null, "", hash);
    } catch {
      /* file:// and older browsers may refuse history updates; keep the page state */
    }
  }

  function activeFilterChips(filters) {
    const chips = [];
    if (filters.q) chips.push({ key: "q", label: `“${filters.q}”` });
    if (filters.genus) chips.push({ key: "genus", label: filters.genus });
    if (filters.family) chips.push({ key: "family", label: filters.family });
    if (filters.trap) chips.push({ key: "trap", label: TRAP_FAMILY_BY_KEY.get(filters.trap)?.label || filters.trap });
    if (filters.difficulty) chips.push({ key: "difficulty", label: filters.difficulty });
    if (filters.continent) chips.push({ key: "continent", label: filters.continent });
    if (filters.care) chips.push({ key: "care", label: CARE_BY_KEY.get(filters.care)?.label || filters.care });
    if (filters.photo) chips.push({ key: "photo", label: "Photographed" });
    if (!filters.provisional) chips.push({ key: "provisional", label: "ICPS accepted only" });
    if (!chips.length) return "";
    return `${chips.map((chip) => `<span class="filter-chip">${esc(chip.label)}<button type="button" data-remove-filter="${esc(chip.key)}" aria-label="Remove ${esc(chip.label)} filter">×</button></span>`).join("")}
      <button class="filter-chip filter-chip--clear" type="button" data-clear-filters>Clear all</button>`;
  }

  function sortNote(sort) {
    return {
      name: "Sorted A–Z by scientific name",
      newest: "Newest descriptions first",
      oldest: "Oldest names first",
      genus: "Grouped by genus",
      difficulty: "Easiest care first",
    }[sort] || "";
  }

  function renderDbResults({ append = false } = {}) {
    const results = $("#db-results");
    if (!results) return;
    const total = dbState.filtered.length;
    const end = Math.min(dbState.limit, total);
    const start = append ? dbState.rendered : 0;
    const chunk = dbState.filtered.slice(start, end);
    const cards = chunk.map((species) => speciesCard(species, { list: dbState.view === "list" })).join("");

    if (append) results.insertAdjacentHTML("beforeend", cards);
    else results.innerHTML = cards || emptyResults();

    dbState.rendered = end;

    const count = $("#db-count");
    if (count) {
      count.innerHTML = total
        ? `Showing <strong>${fmt(start + 1)}–${fmt(end)}</strong> of <strong>${fmt(total)}</strong> taxa`
        : `<strong>No matching taxa</strong>`;
    }
    const sortLabel = $("#db-sort-note");
    if (sortLabel) sortLabel.textContent = sortNote($("#db-sort")?.value || "name");

    const chipBox = $("#db-active-filters");
    const filters = currentDbFilters();
    if (chipBox && filters) chipBox.innerHTML = activeFilterChips(filters);

    const loadWrap = $("#db-load-more-wrap");
    if (loadWrap) {
      if (total > end) {
        loadWrap.innerHTML = `<button class="btn btn--secondary" type="button" data-load-more>Load ${fmt(Math.min(48, total - end))} more <span style="color:var(--muted);font-weight:500">· ${fmt(total - end)} remaining</span></button>`;
      } else {
        loadWrap.innerHTML = total > 48 ? `<p style="color:var(--muted);font-size:11px">All ${fmt(total)} matching taxa shown.</p>` : "";
      }
    }

    const clear = $("[data-db-clear]");
    if (clear) clear.hidden = !($("#db-search")?.value || "").trim();
    updateFavouriteButtons();
  }

  function emptyResults() {
    return `<div class="empty-state" style="grid-column:1/-1">
      <img class="empty-state__art" src="assets/img/genera/drosera.svg" alt="" loading="lazy">
      <h2>No plants match that search.</h2>
      <p>Try removing a filter, searching for a broader group such as “sundew”, or resetting the catalogue.</p>
      <button class="btn btn--primary" type="button" data-clear-filters>Reset all filters</button>
    </div>`;
  }

  function applyDbFilters({ updateUrl = true } = {}) {
    const filters = currentDbFilters();
    if (!filters) return;
    dbState.filtered = filterSpecies(filters);
    dbState.limit = 48;
    dbState.rendered = 0;
    if (updateUrl) replaceHash(dbQueryString(filters));
    renderDbResults();
  }

  function clearDbFilters() {
    const form = $("#db-filters");
    if (form) {
      form.reset();
      form.elements.provisional.checked = true;
    }
    const search = $("#db-search");
    if (search) search.value = "";
    const sort = $("#db-sort");
    if (sort) sort.value = "name";
    applyDbFilters();
  }

  function removeDbFilter(key) {
    if (key === "q") {
      const search = $("#db-search");
      if (search) search.value = "";
    } else if (key === "photo") {
      const input = $('#db-filters [name="photo"]');
      if (input) input.checked = false;
    } else if (key === "provisional") {
      const input = $('#db-filters [name="provisional"]');
      if (input) input.checked = true;
    } else {
      const input = $(`#db-filters [name="${key}"]`);
      if (input) input.value = "";
    }
    applyDbFilters();
  }

  function setView(view) {
    dbState.view = view === "list" ? "list" : "grid";
    const results = $("#db-results");
    if (results) results.classList.toggle("is-list", dbState.view === "list");
    $$("[data-view]").forEach((button) => {
      const active = button.dataset.view === dbState.view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const filters = currentDbFilters();
    if (filters) replaceHash(dbQueryString(filters));
  }

  function openFilters() {
    document.body.classList.add("filters-open");
    const toggle = $("[data-filters-toggle]");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    $(".filters-close")?.focus();
  }

  function closeFilters() {
    document.body.classList.remove("filters-open");
    const toggle = $("[data-filters-toggle]");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  }

  /* ---------------------------------------------------------------- species view */

  function notFoundView(message = "That page is not in the catalogue.") {
    return `<section class="not-found container">
      <p class="eyebrow center">404 · Not found</p>
      <h1>We couldn't find that plant.</h1>
      <p>${esc(message)} The name may have changed, or the link may be incomplete.</p>
      <a class="btn btn--primary" href="#/database">Search the database ${icon("arrow")}</a>
    </section>`;
  }

  function uniqueSourceLinks(species) {
    const seen = new Set();
    const links = [];
    for (const link of species.sourceLinks || []) {
      if (!link?.url || seen.has(link.url)) continue;
      seen.add(link.url);
      links.push(link);
    }
    if (species.icpsUrl && !seen.has(species.icpsUrl)) links.push({ label: "ICPS record", url: species.icpsUrl });
    return links;
  }

  function speciesView(route) {
    const id = decodePart(route.parts[1] || "");
    const species = SPECIES_BY_ID.get(id);
    if (!species) return notFoundView(`No species record matches “${id}”.`);

    const genus = genusOf(species);
    const care = CARE_BY_KEY.get(species.careGroup) || {};
    const image = speciesImage(species);
    const photo = species.photo;
    const siblings = SPECIES.filter((item) => item.genus === species.genus).sort((a, b) => a.name.localeCompare(b.name));
    const siblingIndex = siblings.findIndex((item) => item.id === species.id);
    const previous = siblings[siblingIndex - 1];
    const next = siblings[siblingIndex + 1];
    const related = SPECIES
      .filter((item) => item.genus === species.genus && item.id !== species.id)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.hasPhoto) - Number(a.hasPhoto) || a.name.localeCompare(b.name))
      .slice(0, 4);
    const common = species.commonName && !species.commonNameIsGenus ? species.commonName : "";
    const careFields = [
      ["Light", care.light],
      ["Water", care.water],
      ["Substrate", care.soil],
      ["Temperature", care.temperature],
      ["Dormancy", care.dormancy],
      ["Feeding", care.feeding],
    ].filter(([, value]) => value);

    const mediaFrame = photo
      ? `<button class="species-media__frame" type="button" data-lightbox-src="${esc(photo.path)}" data-lightbox-caption="${esc(`${species.name} — ${photoCredit(species)}`)}" aria-label="Enlarge photograph of ${esc(species.name)}">
          <img src="${esc(image.src)}" alt="${esc(image.alt)}" fetchpriority="high">
        </button>`
      : `<div class="species-media__frame"><img src="${esc(species.illustration)}" alt="${esc(image.alt)}" fetchpriority="high"></div>`;

    const sourceLinks = uniqueSourceLinks(species)
      .map((link) => `<a href="${esc(link.url)}" target="_blank" rel="noopener"><span>${esc(link.label)}</span><span>Open ${icon("external")}</span></a>`)
      .join("");

    const infra = species.infraspecificTaxa?.length
      ? `<div class="content-card">
          <h2>Infraspecific taxa</h2>
          <p class="prose">The ICPS record recognises ${fmt(species.infraspecificCount)} subordinate ${species.infraspecificCount === 1 ? "name" : "names"} for this species. These are listed for reference and are not counted as separate species in the database total.</p>
          <table class="infra-table">
            <thead><tr><th>Rank</th><th>Name</th><th>Published</th><th>Type locality</th></tr></thead>
            <tbody>${species.infraspecificTaxa.map((taxon) => `<tr>
              <td>${esc(taxon.rankLabel || taxon.rank || "")}</td>
              <td><em>${esc(taxon.fullName || taxon.name)}</em>${taxon.authors ? `<br><span style="color:var(--muted)">${esc(taxon.authors)}</span>` : ""}</td>
              <td>${esc(taxon.publication || taxon.year || "—")}</td>
              <td>${esc(taxon.typeLocality || "—")}${taxon.countries?.length ? `<br><span style="color:var(--muted)">${esc(taxon.countries.join(", "))}</span>` : ""}</td>
            </tr>`).join("")}</tbody>
          </table>
        </div>`
      : "";

    const taxonomy = species.taxonomy?.length
      ? `<div class="taxon-tags">${species.taxonomy.map((item, index) => `${index ? '<span class="sep" aria-hidden="true">›</span>' : ""}<span>${esc(item)}</span>`).join("")}</div>`
      : "";

    return `<div class="species-page">
      <div class="container">
        ${breadcrumb([
          { label: "Home", href: "#/" },
          { label: "Database", href: "#/database" },
          { label: `<em>${esc(species.genus)}</em>`, href: `#/genus/${encodeURIComponent(species.genus)}` },
          { label: `<em>${esc(species.name)}</em>` },
        ])}
        <article class="species-hero">
          <div>
            <div class="species-media${image.isPhoto ? "" : " is-illustration"}">
              ${mediaFrame}
              <div class="species-media__badges">
                ${species.provisional ? '<span class="pill pill--lime">Provisional · watchlist</span>' : '<span class="pill pill--green">ICPS accepted</span>'}
                ${species.hybrid ? '<span class="pill pill--violet">Natural hybrid</span>' : ""}
                ${iucnPill(species)}
              </div>
              <div class="species-media__credit">
                <span>${photo ? `Photo: ${photoCredit(species)}` : "Original botanical plate · Plantivorous database"}</span>
                ${photo?.source ? `<a href="${esc(photo.source)}" target="_blank" rel="noopener">Wikimedia Commons ↗</a>` : `<span>${esc(species.family)}</span>`}
              </div>
            </div>
          </div>
          <div class="species-intro">
            <p class="eyebrow">${esc(species.family)} · ${esc(species.genus)}</p>
            <h1><em>${esc(species.name)}</em><span class="species-authority">${esc(species.authors || "")}${species.year ? `, ${esc(species.year)}` : ""}</span></h1>
            ${common ? `<p class="species-common">${esc(common)}</p>` : ""}
            <p class="species-lede">${esc(species.description || species.summary)}</p>
            <div class="species-badge-row">
              <span class="pill">${esc(trapLabelOf(species))}</span>
              <span class="pill${species.provisional ? " pill--amber" : " pill--green"}">${species.provisional ? "Awaiting ICPS inclusion" : "Accepted name"}</span>
              <span class="${difficultyClass(species.careDifficulty || species.difficulty)}">${esc(species.careDifficulty || species.difficulty || "Varies")} care</span>
            </div>
            <div class="species-actions">
              <button class="btn btn--primary" type="button" data-fav="${esc(species.id)}">
                ${icon("heart")} <span>${favourites.has(species.id) ? "Saved to favourites" : "Save to favourites"}</span>
              </button>
              <a class="btn btn--secondary" href="#/map?species=${encodeURIComponent(species.id)}">${icon("pin")} Range map</a>
              <button class="btn btn--ghost" type="button" data-copy-link>${icon("share")} Copy link</button>
            </div>
            <dl class="key-facts">
              <div class="key-fact"><dt>Family</dt><dd>${esc(species.family)}</dd></div>
              <div class="key-fact"><dt>Genus</dt><dd>${linkedGenusName(species.genus)}</dd></div>
              <div class="key-fact"><dt>Trap type</dt><dd>${esc(species.trapType || trapLabelOf(species))}</dd></div>
              <div class="key-fact"><dt>Native range</dt><dd>${esc(species.nativeShort || species.nativeRange || "Not recorded")}</dd></div>
              <div class="key-fact"><dt>Care group</dt><dd><a href="#/care/${esc(species.careGroup)}">${esc(species.careGroupLabel || care.label || "—")}</a></dd></div>
              <div class="key-fact"><dt>Described</dt><dd>${species.year ? esc(species.year) : "Not recorded"}</dd></div>
            </dl>
          </div>
        </article>

        <div class="species-layout">
          <div class="species-main">
            <section class="content-card">
              <h2>About this species</h2>
              <div class="prose">
                <p>${esc(species.description || species.summary)}</p>
                ${species.etymology ? `<h3>Etymology</h3><p>${esc(species.etymology)}</p>` : ""}
                ${species.conservationNote ? `<div class="callout"><strong>Conservation</strong>${esc(species.conservationNote)}</div>` : ""}
                ${species.provisional ? `<div class="callout callout--amber"><strong>Provisional entry</strong>This name is accepted in the primary literature but was not present in the ${esc(new Date(DB.meta.icpsSnapshot).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }))} ICPS snapshot. It is shown for completeness and excluded from the 751 ICPS-accepted count. Status: ${esc(species.status || "Published, pending ICPS inclusion")}.</div>` : ""}
              </div>
            </section>

            <section class="content-card">
              <h2>Discovery &amp; naming</h2>
              <div class="prose">
                <p>${esc(species.discoveredBy || `The species was described by ${species.authors || "its naming authority"}${species.year ? ` in ${species.year}` : ""}.`)}</p>
              </div>
              <div class="care-detail-grid">
                <div class="care-detail-item"><h3>Naming authority</h3><p>${esc(species.authors || "Not recorded")}${species.year ? ` (${esc(species.year)})` : ""}</p></div>
                <div class="care-detail-item"><h3>Publication</h3><p>${esc(species.publication || "Not recorded")}</p></div>
                <div class="care-detail-item"><h3>Type locality</h3><p>${esc(species.typeLocality || "Not recorded")}</p></div>
                <div class="care-detail-item"><h3>Rank</h3><p>${esc(species.rankLabel || species.rank || "Species")}${species.hybrid ? " · natural hybrid" : ""}</p></div>
              </div>
              ${taxonomy}
            </section>

            <section class="content-card" id="range">
              <h2>Native range</h2>
              <div class="prose"><p>${esc(species.nativeRange || "Distribution not recorded in the ICPS snapshot.")}</p></div>
              ${miniMap(species)}
              <div class="range-legend">
                <span><i></i> Native range marker</span>
                ${species.introducedCountries?.length ? `<span><i class="introduced"></i> Introduced</span>` : ""}
                <span><i class="uncertain"></i> Uncertain / historical</span>
              </div>
              <p class="range-note">Approximate only. Markers use country, region and province centroids from the ICPS distribution record — they indicate where a species occurs, not exact localities. Use the full map to explore all taxa together.</p>
              ${species.nativeCountries?.length ? `<h3>Native countries &amp; territories</h3><div class="country-chips">${species.nativeCountries.map((country) => `<span class="country-chip">${esc(country)}</span>`).join("")}</div>` : ""}
              ${species.nativeRegions?.length ? `<h3>Regions</h3><div class="country-chips">${species.nativeRegions.map((region) => `<span class="country-chip">${esc(region)}</span>`).join("")}</div>` : ""}
              ${species.introducedCountries?.length ? `<h3>Introduced records</h3><div class="country-chips">${species.introducedCountries.map((country) => `<span class="country-chip country-chip--introduced">+ ${esc(country)}</span>`).join("")}</div>` : ""}
              <div class="care-link-row"><a class="btn btn--secondary btn--small" href="#/map?species=${encodeURIComponent(species.id)}">${icon("globe")} Open interactive map</a></div>
            </section>

            <section class="content-card" id="care">
              <h2>Care &amp; cultivation</h2>
              ${species.careNotes ? `<div class="callout care-note"><strong>Species note</strong>${esc(species.careNotes)}</div>` : ""}
              <div class="prose" style="margin-top:14px"><p>${esc(care.description || genus?.care?.overview || "Care guidance is grouped by the climate and water regime this plant expects.")}</p></div>
              ${careFields.length ? `<div class="care-detail-grid">${careFields.map(([label, value]) => `<div class="care-detail-item"><h3>${esc(label)}</h3><p>${esc(value)}</p></div>`).join("")}</div>` : ""}
              ${care.tips?.length ? `<h3>Practical tips</h3><ul class="care-tips">${care.tips.map((tip) => `<li>${esc(tip)}</li>`).join("")}</ul>` : ""}
              <div class="care-link-row">
                <a class="btn btn--primary btn--small" href="#/care/${esc(species.careGroup)}">Full ${esc(species.careGroupLabel || care.label || "care")} guide ${icon("arrow")}</a>
                <a class="btn btn--secondary btn--small" href="#/genus/${encodeURIComponent(species.genus)}">${esc(species.genus)} genus care</a>
              </div>
            </section>

            ${infra}

            <section class="content-card">
              <h2>Taxonomy &amp; publication</h2>
              ${taxonomy || '<p class="prose">No higher classification was included in this record.</p>'}
              <div class="care-detail-grid">
                <div class="care-detail-item"><h3>Full name</h3><p>${esc(species.fullName || species.name)}</p></div>
                <div class="care-detail-item"><h3>Status</h3><p>${esc(species.status || "Accepted")}</p></div>
                <div class="care-detail-item"><h3>Publication</h3><p>${esc(species.publication || "Not recorded")}</p></div>
                <div class="care-detail-item"><h3>Type locality</h3><p>${esc(species.typeLocality || "Not recorded")}</p></div>
              </div>
            </section>

            <section class="content-card">
              <h2>Sources &amp; further reading</h2>
              <p class="prose">Nomenclature follows the ICPS Carnivorous Plant Names Resource. Descriptions, care notes and the botanical plates are original editorial work; photographs retain the licences shown.</p>
              <div class="source-list">${sourceLinks}</div>
            </section>

            <nav class="prev-next" aria-label="Species navigation">
              ${previous ? `<a href="#/species/${esc(previous.id)}"><span>Previous in ${esc(species.genus)}</span><strong><em>${esc(previous.name)}</em></strong></a>` : `<span></span>`}
              ${next ? `<a href="#/species/${esc(next.id)}"><span>Next in ${esc(species.genus)}</span><strong><em>${esc(next.name)}</em></strong></a>` : `<span></span>`}
            </nav>
          </div>

          <aside class="species-side">
            <section class="side-card">
              <h2>At a glance</h2>
              <div class="side-card__rows">
                <div class="side-card__row"><span>Family</span><span>${esc(species.family)}</span></div>
                <div class="side-card__row"><span>Genus</span><span>${linkedGenusName(species.genus)}</span></div>
                <div class="side-card__row"><span>Trap</span><span>${esc(trapLabelOf(species))}</span></div>
                <div class="side-card__row"><span>Carnivory</span><span>${esc(species.carnivory || "True carnivore")}</span></div>
                <div class="side-card__row"><span>Care</span><span>${esc(species.careDifficulty || "Varies")}</span></div>
                <div class="side-card__row"><span>IUCN</span><span>${esc(species.iucn?.code || "NE")}</span></div>
                <div class="side-card__row"><span>Range</span><span>${esc(species.nativeShort || "—")}</span></div>
                <div class="side-card__row"><span>Described</span><span>${species.year ? esc(species.year) : "—"}</span></div>
              </div>
              <a class="side-link" href="#/genus/${encodeURIComponent(species.genus)}">More ${esc(species.genus)} species ${icon("arrow")}</a>
            </section>

            ${photo ? `<section class="side-card">
              <h2>Image credit</h2>
              <div class="credit-block">
                ${photo.description ? `<p>${esc(photo.description)}</p>` : ""}
                <p><strong>${esc(photo.artist || "Wikimedia Commons")}</strong><br>${esc(photo.license || "See source")}</p>
                ${photo.source ? `<p><a href="${esc(photo.source)}" target="_blank" rel="noopener">View the original file on Wikimedia Commons ↗</a></p>` : ""}
                ${photo.licenseUrl ? `<p><a href="${esc(photo.licenseUrl)}" target="_blank" rel="noopener">Read the licence ↗</a></p>` : ""}
              </div>
            </section>` : `<section class="side-card">
              <h2>Illustration</h2>
              <div class="credit-block"><p>This species uses the original <em>${esc(species.genus)}</em> botanical plate created for the Plantivorous database. Photographs are added as they become available under an open licence.</p></div>
            </section>`}

            <section class="side-card">
              <h2>Conservation</h2>
              <div class="side-card__rows">
                <div class="side-card__row"><span>IUCN status</span><span>${iucnPill(species)}</span></div>
              </div>
              ${species.conservationNote ? `<p style="margin-top:10px;color:var(--muted);font-size:10.5px;line-height:1.6">${esc(species.conservationNote)}</p>` : ""}
            </section>

            ${related.length ? `<section class="side-card">
              <h2>Related species</h2>
              ${related.map((item) => speciesMini(item)).join("")}
            </section>` : ""}
          </aside>
        </div>
      </div>
    </div>`;
  }

  /* ---------------------------------------------------------------- genus view */

  const genusState = {
    name: "",
    filtered: [],
    limit: 48,
    rendered: 0,
    search: "",
    sort: "name",
  };

  function filterGenusSpecies(genusName, query, sort) {
    const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
    const list = SPECIES.filter((species) => {
      if (species.genus !== genusName) return false;
      if (!tokens.length) return true;
      const haystack = normalizeText(`${species.name} ${species.commonName || ""} ${species.searchText || ""} ${species.careGroupLabel || ""}`);
      return tokens.every((token) => haystack.includes(token));
    });
    list.sort((a, b) => {
      switch (sort) {
        case "newest":
          return (b.sortYear || 0) - (a.sortYear || 0) || a.name.localeCompare(b.name);
        case "oldest":
          return (a.sortYear || 9999) - (b.sortYear || 9999) || a.name.localeCompare(b.name);
        case "difficulty":
          return (a.careDifficultyLevel || 3) - (b.careDifficultyLevel || 3) || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    return list;
  }

  function genusView(route) {
    const name = decodePart(route.parts[1] || "");
    const genus = GENUS_BY_NAME.get(name);
    if (!genus) return notFoundView(`No genus record matches “${name}”.`);

    const familyGenera = GENERA.filter((item) => item.family === genus.family && item.genus !== genus.genus);
    const careGroups = (genus.careGroupKeys || []).map((key) => CARE_BY_KEY.get(key)).filter(Boolean);
    const photos = SPECIES
      .filter((species) => species.genus === genus.genus && species.hasPhoto)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name))
      .slice(0, 4);

    const allSpecies = SPECIES.filter((species) => species.genus === genus.genus).sort((a, b) => a.name.localeCompare(b.name));
    genusState.name = genus.genus;
    genusState.filtered = allSpecies;
    genusState.limit = 48;
    genusState.rendered = 0;
    genusState.search = "";
    genusState.sort = "name";
    const initial = allSpecies.slice(0, genusState.limit);
    genusState.rendered = initial.length;

    const care = genus.care || {};
    const careFields = [
      ["Light", care.light],
      ["Water", care.water],
      ["Substrate", care.soil],
      ["Temperature", care.temperature],
      ["Dormancy", care.dormancy],
      ["Feeding", care.feeding],
    ].filter(([, value]) => value);

    return `<section class="genus-hero" style="--accent:${esc(genus.accent || "#2BA84A")}">
      <div class="container">
        ${breadcrumb([
          { label: "Home", href: "#/" },
          { label: "Genera", href: "#/genera" },
          { label: `<em>${esc(genus.genus)}</em>` },
        ])}
        <div class="genus-hero__inner">
          <div class="genus-hero__copy">
            <p class="eyebrow">${esc(genus.family)}</p>
            <h1><em>${esc(genus.genus)}</em></h1>
            <p class="genus-hero__common">${esc(genus.commonName)}${genus.alsoKnownAs && genus.alsoKnownAs !== genus.commonName ? ` · also called ${esc(genus.alsoKnownAs)}` : ""}</p>
            <p class="genus-hero__lede">${esc(genus.description)}</p>
            <div class="genus-hero__badges">
              <span class="pill pill--green">${fmt(genus.speciesCount)} accepted taxa</span>
              <span class="pill">${esc(genus.trapType)}</span>
              <span class="${difficultyClass(genus.difficulty)}">${esc(genus.difficulty)}</span>
              <span class="pill">${fmt(genus.photoCount || 0)} photographed</span>
            </div>
            <div class="species-actions">
              <a class="btn btn--primary" href="#/database?genus=${encodeURIComponent(genus.genus)}">Filter in database ${icon("arrow")}</a>
              <a class="btn btn--secondary" href="#/map?genus=${encodeURIComponent(genus.genus)}">${icon("pin")} Range map</a>
            </div>
          </div>
          <figure class="genus-hero__art">
            <img src="${esc(genus.illustration)}" alt="Botanical illustration of ${esc(genus.genus)}">
            <figcaption>Original botanical plate</figcaption>
          </figure>
        </div>
      </div>
    </section>
    <div class="container">
      <div class="genus-facts">
        <div class="genus-fact"><strong>${fmt(genus.speciesCount)}</strong><span>Accepted taxa</span></div>
        <div class="genus-fact"><strong>${fmt(genus.acceptedCount || genus.speciesCount)}</strong><span>ICPS accepted</span></div>
        <div class="genus-fact"><strong>${fmt(genus.hybridCount || 0)}</strong><span>Natural hybrids</span></div>
        <div class="genus-fact"><strong>${fmt(genus.infraspecificCount || 0)}</strong><span>Infraspecific taxa</span></div>
        <div class="genus-fact"><strong>${fmt(careGroups.length)}</strong><span>Care groups</span></div>
      </div>
    </div>

    <div class="container genus-body">
      <div>
        <section class="content-card">
          <h2>Identification &amp; ecology</h2>
          <div class="genus-intro-grid">
            <div>
              <h3>How to recognise ${esc(genus.genus)}</h3>
              <p>${esc(genus.identification)}</p>
            </div>
            <div>
              <h3>Where it grows</h3>
              <p>${esc(genus.ecology)}</p>
            </div>
          </div>
          <div class="callout"><strong>Native range</strong>${esc(genus.nativeRange)}</div>
        </section>

        <section class="content-card" id="care">
          <h2>Care overview</h2>
          <div class="prose"><p>${esc(care.overview || "Care depends on the species group. Match the conditions to the care group listed for each species.")}</p></div>
          ${careFields.length ? `<div class="care-detail-grid">${careFields.map(([label, value]) => `<div class="care-detail-item"><h3>${esc(label)}</h3><p>${esc(value)}</p></div>`).join("")}</div>` : ""}
          <div class="care-accordion">
            ${care.propagation ? `<details><summary>Propagation</summary><p>${esc(care.propagation)}</p></details>` : ""}
            ${care.problems ? `<details><summary>Common problems</summary><p>${esc(care.problems)}</p></details>` : ""}
            ${careGroups.length ? `<details><summary>Care groups within ${esc(genus.genus)}</summary><p>${careGroups.map((group) => `${esc(group.label)} (${fmt(group.speciesCount)} taxa): ${esc(group.tagline)}`).join(" ")}</p></details>` : ""}
          </div>
          <div class="care-link-row">
            ${careGroups.slice(0, 3).map((group) => `<a class="btn btn--secondary btn--small" href="#/care/${esc(group.key)}">${esc(group.label)} guide</a>`).join("")}
          </div>
        </section>

        <section class="content-card">
          <h2>At a glance</h2>
          <div class="care-detail-grid">
            <div class="care-detail-item"><h3>Family</h3><p>${esc(genus.family)}</p></div>
            <div class="care-detail-item"><h3>Common name</h3><p>${esc(genus.commonName)}</p></div>
            <div class="care-detail-item"><h3>Trap type</h3><p>${esc(genus.trapType)}</p></div>
            <div class="care-detail-item"><h3>Carnivory</h3><p>${esc(genus.carnivory)}</p></div>
            <div class="care-detail-item"><h3>Native range</h3><p>${esc(genus.nativeRange)}</p></div>
            <div class="care-detail-item"><h3>Continents</h3><p>${esc((genus.continents || []).join(", ") || "—")}</p></div>
          </div>
        </section>
      </div>

      <aside class="genus-body__side">
        <section class="side-card">
          <h2>Care groups</h2>
          <div class="care-side__list">
            ${careGroups.map((group) => `<a href="#/care/${esc(group.key)}"><span>${esc(group.label)}</span><span>${fmt(group.speciesCount)}</span></a>`).join("") || '<p style="color:var(--muted);font-size:11px">No cross-genus care group assigned.</p>'}
          </div>
          <a class="side-link" href="#/care">All care guides ${icon("arrow")}</a>
        </section>

        ${photos.length ? `<section class="side-card">
          <h2>In the field</h2>
          <div class="genus-photo-strip">
            ${photos.map((species) => `<a href="#/species/${esc(species.id)}" title="${esc(species.name)}"><img src="${esc(species.photo.path)}" alt="${esc(species.name)}" loading="lazy" decoding="async"><span><em>${esc(species.name)}</em></span></a>`).join("")}
          </div>
        </section>` : ""}

        <section class="side-card">
          <h2>Same family</h2>
          <div class="side-card__rows">
            ${familyGenera.slice(0, 6).map((item) => `<div class="side-card__row"><span>${linkedGenusName(item.genus)}</span><span>${fmt(item.speciesCount)}</span></div>`).join("") || '<p style="color:var(--muted);font-size:11px">This is the only genus in its family in the catalogue.</p>'}
          </div>
        </section>
      </aside>
    </div>

    <section class="genus-species-section" id="species">
      <div class="container">
        <div class="genus-species-head">
          <div>
            <p class="eyebrow">The species</p>
            <h2>All ${esc(genus.genus)} in the catalogue</h2>
            <p>${fmt(genus.speciesCount)} accepted ${genus.speciesCount === 1 ? "taxon" : "taxa"}${genus.watchlistCount ? `, including ${fmt(genus.watchlistCount)} provisional watchlist ${genus.watchlistCount === 1 ? "entry" : "entries"}` : ""}.</p>
          </div>
          <a class="section-link" href="#/database?genus=${encodeURIComponent(genus.genus)}">Open in database ${icon("arrow")}</a>
        </div>
        <div class="genus-species-controls">
          <div class="search-field">
            ${icon("search")}
            <label class="visually-hidden" for="genus-search">Search ${esc(genus.genus)}</label>
            <input id="genus-search" type="search" placeholder="Search ${esc(genus.genus)} species…" autocomplete="off">
            <button class="search-clear" type="button" data-genus-clear hidden aria-label="Clear search">${icon("close")}</button>
          </div>
          <label class="visually-hidden" for="genus-sort">Sort species</label>
          <select id="genus-sort">
            <option value="name">A–Z by name</option>
            <option value="newest">Newest described</option>
            <option value="oldest">Oldest described</option>
            <option value="difficulty">Easiest care first</option>
          </select>
        </div>
        <p class="genus-count" id="genus-count">Showing <strong>${fmt(initial.length)}</strong> of <strong>${fmt(allSpecies.length)}</strong> taxa</p>
        <div class="species-grid species-grid--three" id="genus-results">${initial.map((species) => speciesCard(species)).join("")}</div>
        <div class="load-more-wrap" id="genus-load-more">${allSpecies.length > initial.length ? `<button class="btn btn--secondary" type="button" data-genus-more>Load ${fmt(Math.min(48, allSpecies.length - initial.length))} more</button>` : ""}</div>
      </div>
    </section>`;
  }

  function renderGenusResults({ append = false } = {}) {
    const results = $("#genus-results");
    if (!results) return;
    const total = genusState.filtered.length;
    const end = Math.min(genusState.limit, total);
    const start = append ? genusState.rendered : 0;
    const chunk = genusState.filtered.slice(start, end);
    if (append) results.insertAdjacentHTML("beforeend", chunk.map((species) => speciesCard(species)).join(""));
    else results.innerHTML = chunk.map((species) => speciesCard(species)).join("") || `<div class="empty-state" style="grid-column:1/-1"><h2>No matching species.</h2><p>Try a different name or clear the search.</p><button class="btn btn--secondary" type="button" data-genus-clear>Clear search</button></div>`;
    genusState.rendered = end;

    const count = $("#genus-count");
    if (count) {
      count.innerHTML = total
        ? `Showing <strong>${fmt(start + 1)}–${fmt(end)}</strong> of <strong>${fmt(total)}</strong> ${esc(genusState.name)} taxa`
        : `No matching <strong>${esc(genusState.name)}</strong> taxa`;
    }
    const more = $("#genus-load-more");
    if (more) {
      more.innerHTML = total > end
        ? `<button class="btn btn--secondary" type="button" data-genus-more>Load ${fmt(Math.min(48, total - end))} more <span style="color:var(--muted);font-weight:500">· ${fmt(total - end)} remaining</span></button>`
        : total > 48 ? `<p style="color:var(--muted);font-size:11px">All ${fmt(total)} matching taxa shown.</p>` : "";
    }
    const clear = $("[data-genus-clear]");
    if (clear) clear.hidden = !($("#genus-search")?.value || "").trim();
    updateFavouriteButtons();
  }

  function applyGenusFilters() {
    const query = $("#genus-search")?.value || "";
    const sort = $("#genus-sort")?.value || "name";
    genusState.search = query;
    genusState.sort = sort;
    genusState.filtered = filterGenusSpecies(genusState.name, query, sort);
    genusState.limit = 48;
    genusState.rendered = 0;
    renderGenusResults();
  }

  /* ---------------------------------------------------------------- map view */

  const mapState = {
    groups: new Map(),
    visible: [],
    params: null,
  };

  function buildMapGroups(speciesList, includeIntroduced) {
    const groups = new Map();
    let index = 0;
    for (const species of speciesList) {
      for (const point of species.originPoints || []) {
        if (point.introduced && !includeIntroduced) continue;
        const lat = Number(point.lat);
        const lon = Number(point.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const key = `${lat.toFixed(1)}|${lon.toFixed(1)}|${point.introduced ? "i" : "n"}`;
        let group = groups.get(key);
        if (!group) {
          group = {
            id: `g${index++}`,
            lat,
            lon,
            label: point.label || point.country || "Unnamed locality",
            labels: new Set(),
            countries: new Set(),
            species: new Map(),
            trapCounts: new Map(),
            introduced: Boolean(point.introduced),
          };
          groups.set(key, group);
        }
        group.species.set(species.id, species);
        if (point.label) group.labels.add(point.label);
        if (point.country) group.countries.add(point.country);
        const trap = trapFamilyOf(species);
        group.trapCounts.set(trap, (group.trapCounts.get(trap) || 0) + 1);
      }
    }
    return groups;
  }

  function groupColor(group) {
    const dominant = [...group.trapCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    return TRAP_FAMILY_BY_KEY.get(dominant)?.color || "#2F7040";
  }

  function groupLabel(group) {
    if (group.species.size === 1) return [...group.species.values()][0].name;
    return `${group.label}`;
  }

  function groupAria(group) {
    const count = group.species.size;
    return count === 1
      ? `${groupLabel(group)} at ${group.label}`
      : `${count} species near ${group.label}`;
  }

  function mapBubbles(groups) {
    return [...groups.values()].map((group) => {
      const [x, y] = projectPoint(group.lat, group.lon);
      const count = group.species.size;
      const radius = clamp(4.6 + Math.sqrt(count) * 2.3, 5, 22);
      return `<g class="map-bubble" data-group="${group.id}" tabindex="0" role="button" aria-label="${esc(groupAria(group))}">
        <title>${esc(groupAria(group))}</title>
        <circle cx="${x}" cy="${y}" r="${radius.toFixed(1)}" fill="${groupColor(group)}"/>
        ${count > 1 && radius > 7 ? `<text x="${x}" y="${y}" dy=".35em">${count > 99 ? "99+" : count}</text>` : ""}
      </g>`;
    }).join("");
  }

  function countryCountsFor(speciesList) {
    const counts = new Map();
    for (const species of speciesList) {
      for (const country of species.nativeCountries || []) {
        counts.set(country, (counts.get(country) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }

  function mapView(route) {
    const params = route.params;
    const focusId = params.get("species") || "";
    const focusSpecies = focusId ? SPECIES_BY_ID.get(focusId) : null;
    const genus = params.get("genus") || "";
    const trap = params.get("trap") || "";
    const continent = params.get("continent") || "";
    const includeIntroduced = params.get("introduced") === "1" || Boolean(focusSpecies);

    let visible;
    if (focusSpecies) {
      visible = [focusSpecies];
    } else {
      visible = SPECIES.filter((species) => {
        if (genus && species.genus !== genus) return false;
        if (trap && trapFamilyOf(species) !== trap) return false;
        if (continent && !(species.continents || []).includes(continent)) return false;
        return true;
      });
    }

    const groups = buildMapGroups(visible, includeIntroduced);
    mapState.groups = groups;
    mapState.visible = visible;
    mapState.params = params;

    const presentTraps = unique(visible.map((species) => trapFamilyOf(species)));
    const countryCounts = countryCountsFor(visible);
    const trapCount = groups.size;
    const countryTotal = new Set(visible.flatMap((species) => species.nativeCountries || [])).size;

    const activeChips = [];
    if (focusSpecies) activeChips.push({ label: focusSpecies.name, href: `#/species/${focusSpecies.id}` });
    if (genus) activeChips.push({ label: genus, href: "" });
    if (trap) activeChips.push({ label: TRAP_FAMILY_BY_KEY.get(trap)?.label || trap, href: "" });
    if (continent) activeChips.push({ label: continent, href: "" });

    const hotCountries = countryCounts.slice(0, 9).map(([country, count]) => `<a href="#/database?q=${encodeURIComponent(country)}">${esc(country)} <span>${fmt(count)}</span></a>`).join("");

    return `${pageHead({
      crumbs: breadcrumb([{ label: "Home", href: "#/" }, { label: "Range map" }]),
      eyebrow: "Distribution",
      title: focusSpecies ? `<em>${esc(focusSpecies.name)}</em> range` : "Native range map",
      lede: focusSpecies
        ? `Approximate recorded range for ${esc(focusSpecies.name)}. Markers use country, region and province centroids rather than exact localities.`
        : "Explore the recorded distribution of every taxon in the catalogue. Bubbles group species by approximate location; colour shows the dominant trap type. Click a bubble to see what grows there.",
      stat: fmt(visible.length),
      statLabel: focusSpecies ? "Focused taxon" : "Taxa in view",
    })}
    <div class="container map-page">
      <form class="map-controls-bar" id="map-filters" autocomplete="off" style="margin-top:24px">
        <div class="map-control">
          <label for="map-genus">Genus</label>
          <select id="map-genus" data-map-filter="genus"${focusSpecies ? " disabled" : ""}>
            ${option("", "All genera", genus === "")}
            ${GENERA.map((item) => option(item.genus, item.genus, genus === item.genus, item.speciesCount)).join("")}
          </select>
        </div>
        <div class="map-control">
          <label for="map-trap">Trap type</label>
          <select id="map-trap" data-map-filter="trap"${focusSpecies ? " disabled" : ""}>
            ${option("", "All trap types", trap === "")}
            ${TRAP_FAMILIES.map((item) => option(item.key, item.label, trap === item.key)).join("")}
          </select>
        </div>
        <div class="map-control">
          <label for="map-continent">Continent</label>
          <select id="map-continent" data-map-filter="continent"${focusSpecies ? " disabled" : ""}>
            ${option("", "All continents", continent === "")}
            ${DB.continents.map((item) => option(item.continent, item.continent, continent === item.continent, item.count)).join("")}
          </select>
        </div>
        <div class="map-control map-control--check">
          <input id="map-introduced" type="checkbox" data-map-filter="introduced"${includeIntroduced ? " checked" : ""}${focusSpecies ? " disabled" : ""}>
          <label for="map-introduced">Include introduced records</label>
        </div>
        <div class="map-controls-actions">
          ${activeChips.length ? `<a class="btn btn--secondary" href="#/map">Clear focus</a>` : ""}
          <a class="btn btn--ghost" href="#/database">Open database</a>
        </div>
      </form>

      <div class="map-note-row">
        <span class="pill pill--green">${fmt(visible.length)} taxa</span>
        <span class="pill">${fmt(trapCount)} mapped locations</span>
        <span class="pill">${fmt(countryTotal)} countries &amp; territories</span>
        ${focusSpecies ? `<span class="pill pill--lime">Focused on <em>${esc(focusSpecies.name)}</em></span>` : ""}
        ${activeChips.filter((chip) => !focusSpecies && chip.label !== focusSpecies?.name).map((chip) => `<span class="pill">${esc(chip.label)}</span>`).join("")}
      </div>

      <div class="map-layout">
        <div class="map-canvas" id="map-canvas">
          ${renderWorldSvg({
            className: "world-map",
            label: `Approximate distribution of ${visible.length} carnivorous plant taxa`,
            interactive: true,
            bubbles: mapBubbles(groups),
          })}
          <div class="map-hint">Drag to pan · use + / − to zoom</div>
          <div class="map-controls" aria-label="Map zoom controls">
            <button class="map-control-btn" type="button" data-map-zoom="in" aria-label="Zoom in">${icon("zoomIn")}</button>
            <button class="map-control-btn" type="button" data-map-zoom="out" aria-label="Zoom out">${icon("zoomOut")}</button>
            <button class="map-control-btn map-control-btn--reset" type="button" data-map-zoom="reset" aria-label="Reset map view">${icon("reset")}</button>
          </div>
          <div class="map-legend">
            ${TRAP_FAMILIES.filter((item) => presentTraps.includes(item.key)).map((item) => `<span><i style="background:${item.color}"></i>${esc(item.short)}</span>`).join("")}
          </div>
        </div>
        <aside class="map-panel" id="map-panel" aria-live="polite">
          ${focusSpecies ? mapPanelForSpecies(focusSpecies) : mapDefaultPanel(visible, groups, countryCounts)}
        </aside>
      </div>

      <div class="map-bottom-grid">
        <section class="map-info-card">
          <h2>How to read this map</h2>
          <p>Each bubble is a cluster of species recorded near the same country, region or province centroid. The number inside the bubble is the number of species in the cluster; the colour shows the most common trap type there. Hover for a summary, click for the species list.</p>
          <p style="margin-top:8px">Ranges come from ICPS distribution strings, not field survey polygons. Some species have very broad or imprecise records, so a marker is a prompt to investigate — not proof of a precise locality.</p>
        </section>
        <section class="map-info-card">
          <h2>Diversity hotspots in this view</h2>
          <p>Countries with the most recorded taxa among the ${fmt(visible.length)} species currently mapped.</p>
          <div class="map-region-chips">${hotCountries || '<span style="color:var(--muted);font-size:11px">No countries recorded for this selection.</span>'}</div>
        </section>
      </div>
    </div>`;
  }

  function mapDefaultPanel(visible, groups, countryCounts) {
    const top = countryCounts.slice(0, 8);
    return `<div class="map-panel__head">
        <h2>Explore the range map</h2>
        <p>Click a bubble to see the species recorded near that location.</p>
      </div>
      <div class="map-panel__body">
        <div class="map-panel__stats">
          <div class="map-panel__stat"><strong>${fmt(visible.length)}</strong><span>Taxa</span></div>
          <div class="map-panel__stat"><strong>${fmt(groups.size)}</strong><span>Locations</span></div>
        </div>
        <p style="color:var(--muted);font-size:10.5px;line-height:1.55;margin-bottom:10px">Most represented countries in this selection:</p>
        <div class="map-species-list">
          ${top.map(([country, count]) => `<a class="map-species-row" href="#/database?q=${encodeURIComponent(country)}">
            <span class="map-species-row__dot"></span>
            <span class="map-species-row__name">${esc(country)}</span>
            <span class="map-species-row__genus">${fmt(count)} taxa</span>
          </a>`).join("") || '<p style="color:var(--muted);font-size:11px">No country records in this selection.</p>'}
        </div>
      </div>
      <div class="map-panel__note">Bubble positions are country and province centroids. Use the zoom controls or drag the map to inspect dense regions.</div>`;
  }

  function mapPanelForGroup(group) {
    const speciesList = [...group.species.values()].sort((a, b) => a.name.localeCompare(b.name));
    const countries = [...group.countries].join(", ") || "Location not recorded";
    return `<div class="map-panel__head">
        <h2>${esc(groupLabel(group))}</h2>
        <p>${esc(countries)}${group.introduced ? " · introduced record" : ""}</p>
      </div>
      <div class="map-panel__body">
        <div class="map-panel__stats">
          <div class="map-panel__stat"><strong>${fmt(speciesList.length)}</strong><span>Species here</span></div>
          <div class="map-panel__stat"><strong>${esc(group.lat.toFixed(1))}, ${esc(group.lon.toFixed(1))}</strong><span>Approx. coordinates</span></div>
        </div>
        <div class="map-species-list">
          ${speciesList.slice(0, 80).map((species) => `<a class="map-species-row" href="#/species/${esc(species.id)}">
            <span class="map-species-row__dot" style="background:${TRAP_FAMILY_BY_KEY.get(trapFamilyOf(species))?.color || "#2BA84A"}"></span>
            <span class="map-species-row__name"><em>${esc(species.name)}</em></span>
            <span class="map-species-row__genus">${esc(species.genus)}</span>
          </a>`).join("")}
        </div>
        ${speciesList.length > 80 ? `<p style="padding:10px 7px;color:var(--muted);font-size:10px">Showing the first 80 of ${fmt(speciesList.length)} species.</p>` : ""}
      </div>
      <div class="map-panel__note">Approximate cluster position ${esc(group.lat.toFixed(2))}, ${esc(group.lon.toFixed(2))}. ${group.introduced ? "This marker is an introduced record." : "Native or naturalised record."}</div>`;
  }

  function mapPanelForSpecies(species) {
    const countries = species.nativeCountries || [];
    const regions = species.nativeRegions || [];
    return `<div class="map-panel__head">
        <h2><em>${esc(species.name)}</em></h2>
        <p>${esc(species.family)} · ${esc(species.genus)}${species.provisional ? " · provisional" : ""}</p>
      </div>
      <div class="map-panel__body">
        <div class="map-panel__stats">
          <div class="map-panel__stat"><strong>${fmt(countries.length)}</strong><span>Countries</span></div>
          <div class="map-panel__stat"><strong>${fmt((species.originPoints || []).length)}</strong><span>Markers</span></div>
        </div>
        <p style="color:var(--ink-soft);font-size:11.5px;line-height:1.6;margin-bottom:12px">${esc(species.nativeRange || "Range not recorded.")}</p>
        <div class="map-species-list">
          ${countries.slice(0, 30).map((country) => `<a class="map-species-row" href="#/database?q=${encodeURIComponent(country)}">
            <span class="map-species-row__dot"></span>
            <span class="map-species-row__name">${esc(country)}</span>
            <span class="map-species-row__genus">country</span>
          </a>`).join("")}
          ${regions.slice(0, 12).map((region) => `<span class="map-species-row"><span class="map-species-row__dot" style="background:var(--lime)"></span><span class="map-species-row__name">${esc(region)}</span><span class="map-species-row__genus">region</span></span>`).join("")}
        </div>
        <div class="care-link-row">
          <a class="btn btn--primary btn--small" href="#/species/${esc(species.id)}">Full species page ${icon("arrow")}</a>
          <a class="btn btn--secondary btn--small" href="#/database?genus=${encodeURIComponent(species.genus)}">More ${esc(species.genus)}</a>
        </div>
      </div>
      <div class="map-panel__note">Markers are approximate country, region and province centroids. See the species page for the full distribution record and care notes.</div>`;
  }

  function selectMapGroup(id) {
    const group = [...mapState.groups.values()].find((item) => item.id === id);
    if (!group) return;
    $$(".map-bubble").forEach((bubble) => bubble.classList.toggle("is-active", bubble.dataset.group === id));
    const panel = $("#map-panel");
    if (panel) panel.innerHTML = mapPanelForGroup(group);
  }

  function initMapPage() {
    const canvas = $("#map-canvas");
    const svg = canvas ? $(".world-map", canvas) : null;
    if (!canvas || !svg) return;

    const base = { x: 0, y: 0, w: WORLD.width, h: WORLD.height };
    let view = { ...base };
    const apply = () => {
      svg.setAttribute("viewBox", `${view.x.toFixed(2)} ${view.y.toFixed(2)} ${view.w.toFixed(2)} ${view.h.toFixed(2)}`);
    };
    const clampView = () => {
      view.w = clamp(view.w, 110, WORLD.width);
      view.h = view.w / (WORLD.width / WORLD.height);
      view.x = clamp(view.x, 0, WORLD.width - view.w);
      view.y = clamp(view.y, 0, WORLD.height - view.h);
    };
    const zoom = (factor) => {
      const centerX = view.x + view.w / 2;
      const centerY = view.y + view.h / 2;
      view.w *= factor;
      view.h = view.w / (WORLD.width / WORLD.height);
      view.x = centerX - view.w / 2;
      view.y = centerY - view.h / 2;
      clampView();
      apply();
    };

    $$("[data-map-zoom]", canvas).forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.mapZoom === "reset") {
          view = { ...base };
          apply();
        } else {
          zoom(button.dataset.mapZoom === "in" ? 0.72 : 1.38);
        }
      });
    });

    const toSvg = (event) => {
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const matrix = svg.getScreenCTM();
      return matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
    };

    let drag = null;
    canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target.closest(".map-bubble") || event.target.closest(".map-control-btn")) return;
      drag = { start: toSvg(event), view: { ...view } };
      canvas.classList.add("is-dragging");
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const point = toSvg(event);
      view.x = drag.view.x - (point.x - drag.start.x);
      view.y = drag.view.y - (point.y - drag.start.y);
      clampView();
      apply();
    });
    const endDrag = (event) => {
      if (!drag) return;
      drag = null;
      canvas.classList.remove("is-dragging");
      if (event?.pointerId != null && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    canvas.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoom(event.deltaY > 0 ? 1.16 : 0.86);
    }, { passive: false });
  }

  function updateMapFilters() {
    const params = new URLSearchParams();
    const genus = $("#map-genus")?.value || "";
    const trap = $("#map-trap")?.value || "";
    const continent = $("#map-continent")?.value || "";
    const introduced = $("#map-introduced")?.checked;
    if (genus) params.set("genus", genus);
    if (trap) params.set("trap", trap);
    if (continent) params.set("continent", continent);
    if (introduced) params.set("introduced", "1");
    const query = params.toString();
    replaceHash(`#/map${query ? `?${query}` : ""}`);
    renderRoute({ preserveScroll: true });
  }

  /* ---------------------------------------------------------------- genera index */

  function generaView() {
    const families = DB.families.map((family) => ({
      ...family,
      genera: GENERA.filter((genus) => genus.family === family.family),
    }));
    return `${pageHead({
      crumbs: breadcrumb([{ label: "Home", href: "#/" }, { label: "Genera" }]),
      eyebrow: "The groups",
      title: "Twenty-one genera",
      lede: "Carnivory has evolved independently across flowering plants. Each genus here is a different answer to the same problem: how to catch prey in a nutrient-poor world.",
      stat: fmt(DB.meta.genusCount),
      statLabel: "Genera",
    })}
    <div class="container">
      <section class="section--tight">
        <div class="section-head">
          <div>
            <p class="eyebrow">By family</p>
            <h2>Ten plant families, one surprising habit.</h2>
            <p>From the bladderworts of Lentibulariaceae to the single-species Cephalotaceae, the catalogue spans the full breadth of botanical carnivory.</p>
          </div>
          <a class="section-link" href="#/database">Browse all species ${icon("arrow")}</a>
        </div>
        <div class="map-region-chips" style="gap:7px;margin-top:-6px;margin-bottom:26px">
          ${families.map((family) => `<a href="#/database?family=${encodeURIComponent(family.family)}">${esc(family.family)} <span style="color:var(--muted)">${fmt(family.count)}</span></a>`).join("")}
        </div>
        <div class="genus-grid">${GENERA.map((genus) => genusCard(genus)).join("")}</div>
      </section>
    </div>
    <div class="container">
      <div class="cta-band" style="margin-bottom:70px">
        <div>
          <h2>Every species, mapped to its genus.</h2>
          <p>Open a genus for identification notes, ecology, care and the complete accepted species list.</p>
        </div>
        <a class="btn btn--lime" href="#/database">Search the catalogue ${icon("arrow")}</a>
      </div>
    </div>`;
  }

  /* ---------------------------------------------------------------- care views */

  function careView(route) {
    const key = route.parts[1] || "";
    if (!key) return careIndexView();
    const group = CARE_BY_KEY.get(key);
    if (!group) return notFoundView(`No care guide matches “${key}”.`);

    const genera = group.genera.map((name) => GENUS_BY_NAME.get(name)).filter(Boolean);
    const examples = (group.examples || []).map((id) => SPECIES_BY_ID.get(id)).filter(Boolean);
    const others = CARE_GROUPS.filter((item) => item.key !== group.key).slice(0, 6);
    const factors = [
      ["light", "Light", group.light, "sun"],
      ["water", "Water", group.water, "water"],
      ["soil", "Substrate", group.soil, "soil"],
      ["temperature", "Temperature", group.temperature, "temp"],
      ["dormancy", "Dormancy", group.dormancy, "moon"],
      ["feeding", "Feeding", group.feeding, "feed"],
      ["propagation", "Propagation", group.propagation, "propagate"],
      ["problems", "Common problems", group.problems, "warning"],
    ].filter(([, , value]) => value);

    return `${pageHead({
      crumbs: breadcrumb([{ label: "Home", href: "#/" }, { label: "Care guides", href: "#/care" }, { label: group.label }]),
      eyebrow: "Care guide",
      title: group.label,
      lede: group.tagline,
      stat: fmt(group.speciesCount),
      statLabel: "Taxa in this group",
    })}
    <div class="container care-detail-layout">
      <div>
        <section class="content-card">
          <div class="care-detail-hero__meta" style="margin-top:0">
            <span class="${difficultyClass(group.difficulty)}">${esc(group.difficulty)}</span>
            ${difficultyMeter(group.difficultyLevel)}
            <span class="pill pill--green">${genera.length} ${genera.length === 1 ? "genus" : "genera"}</span>
            <span class="pill">${fmt(group.speciesCount)} taxa</span>
          </div>
          <div class="prose" style="margin-top:16px"><p>${esc(group.description)}</p></div>
        </section>

        <section class="content-card">
          <h2>The growing recipe</h2>
          <div class="care-factor-grid">
            ${factors.map(([, label, value, iconName]) => `<div class="care-factor">
              <h3>${icon(iconName)} ${esc(label)}</h3>
              <p>${esc(value)}</p>
            </div>`).join("")}
          </div>
          ${group.tips?.length ? `<h3>Practical tips</h3><ul class="care-tips">${group.tips.map((tip) => `<li>${esc(tip)}</li>`).join("")}</ul>` : ""}
        </section>

        <section class="content-card">
          <h2>Genera in this care group</h2>
          <p class="prose">These genera include species that expect this care regime. Always check the individual species note — closely related plants can have very different dormancy and water needs.</p>
          <div class="care-genera-links">${genera.map((genus) => linkedGenusName(genus.genus)).join("")}</div>
        </section>

        ${examples.length ? `<section class="content-card">
          <h2>Example species</h2>
          <p class="prose">A few well-known plants that grow well under this regime.</p>
          <div class="species-grid" style="margin-top:16px">${examples.map((species) => speciesCard(species)).join("")}</div>
        </section>` : ""}
      </div>

      <aside class="care-side">
        <section class="side-card">
          <h2>Care summary</h2>
          <div class="side-card__rows">
            <div class="side-card__row"><span>Difficulty</span><span>${esc(group.difficulty)}</span></div>
            <div class="side-card__row"><span>Light</span><span>${esc(group.light.split(".")[0])}</span></div>
            <div class="side-card__row"><span>Water</span><span>${esc(group.water.split(".")[0])}</span></div>
            <div class="side-card__row"><span>Dormancy</span><span>${esc(group.dormancy.split(".")[0])}</span></div>
          </div>
          <a class="side-link" href="#/database?care=${esc(group.key)}">Browse this group ${icon("arrow")}</a>
        </section>

        <section class="side-card">
          <h2>Other care groups</h2>
          <div class="care-side__list">
            ${others.map((item) => `<a href="#/care/${esc(item.key)}"><span>${esc(item.label)}</span><span>${fmt(item.speciesCount)}</span></a>`).join("")}
          </div>
          <a class="side-link" href="#/care">All 17 guides ${icon("arrow")}</a>
        </section>
      </aside>
    </div>`;
  }

  function careIndexView() {
    const easy = CARE_GROUPS.filter((group) => group.difficultyLevel <= 2).length;
    return `${pageHead({
      crumbs: breadcrumb([{ label: "Home", href: "#/" }, { label: "Care guides" }]),
      eyebrow: "Cultivation",
      title: "Care that follows the plant",
      lede: "Seventeen cross-genus care groups, built around the climate and water regime each plant actually expects — not just the genus on the label.",
    })}
    <div class="container">
      <div class="care-index-intro">
        <div>
          <p class="eyebrow">Why care groups</p>
          <h2>“Sundew” is not a care instruction.</h2>
          <p>A Cape sundew wants winter rain and cool nights. A tropical bladderwort wants warm water year-round. A highland <em>Nepenthes</em> wants a temperature drop after dark. Grouping by genus alone hides these differences, so every species is assigned to one of 17 care regimes that combine climate, water, substrate and dormancy.</p>
          <p>Each species page inherits the full group sheet, then adds a species-specific note where cultivation differs. ${fmt(easy)} of the groups are suitable for relative beginners; the rest need deliberate control of temperature, water chemistry or dormancy.</p>
        </div>
        <div class="care-index-art">
          <img src="assets/img/species/drosera-capensis.jpg" alt="Drosera capensis" loading="lazy">
          <img src="assets/img/species/pinguicula-grandiflora.jpg" alt="Pinguicula grandiflora" loading="lazy">
          <img src="assets/img/species/nepenthes-rajah.jpg" alt="Nepenthes rajah" loading="lazy">
          <img src="assets/img/species/dionaea-muscipula.jpg" alt="Dionaea muscipula" loading="lazy">
        </div>
      </div>
      <section class="section--tight">
        <div class="section-head">
          <div>
            <p class="eyebrow">All groups</p>
            <h2>Find the regime that fits your conditions.</h2>
            <p>Filter by difficulty, then open a group for light, water, substrate, temperature, dormancy, feeding and troubleshooting.</p>
          </div>
          <a class="section-link" href="#/database?care=highland">Highland species ${icon("arrow")}</a>
        </div>
        <div class="care-grid">${CARE_GROUPS.map((group) => careCard(group)).join("")}</div>
      </section>
    </div>`;
  }

  /* ---------------------------------------------------------------- what's new */

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "—");
    return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
  }

  function watchCard(species) {
    const source = (species.sourceLinks || []).filter((link) => link.url && !link.url.includes("wikipedia.org")).slice(0, 2);
    return `<article class="watch-card">
      <div class="watch-card__head">
        <div>
          <h3><a href="#/species/${esc(species.id)}">${esc(species.name)}</a></h3>
          <p class="watch-card__meta">${esc(species.authors || "")} · ${esc(species.family)}${species.careGroupLabel ? ` · ${esc(species.careGroupLabel)}` : ""}</p>
        </div>
        <span class="watch-card__year">${esc(species.year || "Recent")}</span>
      </div>
      <p class="watch-card__summary">${esc(species.summary || species.description)}</p>
      <div class="watch-card__facts">
        <div class="watch-card__fact"><span>Discovered</span><strong>${esc(species.discoveredBy || "See description")}</strong></div>
        <div class="watch-card__fact"><span>Published</span><strong>${esc(species.publication || "—")}</strong></div>
        <div class="watch-card__fact"><span>Range</span><strong>${esc(species.nativeRange || "—")}</strong></div>
      </div>
      <div class="watch-card__links">
        <a href="#/species/${esc(species.id)}">Species page →</a>
        ${source.map((link) => `<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)} ↗</a>`).join("")}
      </div>
    </article>`;
  }

  function newView() {
    const recent = [...RECENT].sort((a, b) => (b.sortYear || 0) - (a.sortYear || 0) || a.name.localeCompare(b.name));
    const snapshotDate = formatDate(DB.meta.icpsSnapshot);
    return `${pageHead({
      crumbs: breadcrumb([{ label: "Home", href: "#/" }, { label: "What's new" }]),
      eyebrow: "Monitoring",
      title: "What's new in the catalogue",
      lede: `The database is anchored to the ICPS snapshot of ${snapshotDate}. New descriptions are tracked against that baseline, and taxa awaiting formal inclusion are shown as clearly marked provisional entries.`,
      stat: fmt(DB.meta.provisionalCount),
      statLabel: "On the watchlist",
    })}
    <div class="container">
      <section class="section--tight">
        <div class="status-strip">
          <div class="status-card">
            <div class="status-card__label"><i></i> ICPS snapshot</div>
            <strong>${fmt(DB.meta.icpsCount)}</strong>
            <span>Accepted species and natural hybrids · ${snapshotDate}</span>
          </div>
          <div class="status-card">
            <div class="status-card__label"><i style="background:var(--amber)"></i> Provisional</div>
            <strong>${fmt(DB.meta.provisionalCount)}</strong>
            <span>Recent names outside the ICPS snapshot</span>
          </div>
          <div class="status-card">
            <div class="status-card__label"><i style="background:var(--blue)"></i> Recently described</div>
            <strong>${fmt(DB.meta.recentCount)}</strong>
            <span>Taxa described in the last decade</span>
          </div>
          <div class="status-card">
            <div class="status-card__label"><i style="background:var(--violet)"></i> Last reviewed</div>
            <strong>${esc(formatDate(DB.meta.watchlistUpdated || DB.meta.generated))}</strong>
            <span>Watchlist and changelog review date</span>
          </div>
        </div>

        <div class="section-head">
          <div>
            <p class="eyebrow">The watchlist</p>
            <h2>Published, but not yet in the ICPS list.</h2>
            <p>These names are accepted in the primary literature but were absent from the baseline ICPS snapshot. They are excluded from the 751 count and promoted automatically when the names resource catches up.</p>
          </div>
          <a class="section-link" href="#/database?provisional=1">Search provisional taxa ${icon("arrow")}</a>
        </div>
        <div class="watch-grid">${WATCHLIST.map((species) => watchCard(species)).join("")}</div>
      </section>

      <section class="section--tight">
        <div class="section-head">
          <div>
            <p class="eyebrow">Recent descriptions</p>
            <h2>The last decade of new carnivores.</h2>
            <p>${fmt(recent.length)} taxa in the catalogue were described from 2015 onwards. Several are known from a single mountain or a handful of sites.</p>
          </div>
        </div>
        <div class="recent-table">
          ${recent.map((species) => `<a class="recent-row" href="#/species/${esc(species.id)}">
            <span class="recent-row__year">${esc(species.year || "—")}</span>
            <span class="recent-row__name"><em>${esc(species.name)}</em></span>
            <span class="recent-row__family">${esc(species.family)}</span>
            <span class="recent-row__genus">${esc(species.genus)}</span>
            <span class="recent-row__badge"><span class="pill ${species.provisional ? "pill--lime" : "pill--green"}">${species.provisional ? "Provisional" : "ICPS"}</span></span>
          </a>`).join("")}
        </div>
      </section>

      <section class="section--tight">
        <div class="section-head">
          <div>
            <p class="eyebrow">Changelog</p>
            <h2>How the catalogue has changed.</h2>
            <p>Every baseline refresh and watchlist review is recorded here. New ICPS accepted names are appended automatically by the build-time updater.</p>
          </div>
        </div>
        <div class="timeline">
          ${CHANGELOG.map((entry) => `<article class="timeline-entry">
            <p class="timeline-entry__date">${esc(formatDate(entry.date))} · ${esc(entry.type || "update")}</p>
            <h3>${esc(entry.title || "Catalogue update")}</h3>
            <p>${esc(entry.summary || "")}</p>
            ${entry.taxa?.length ? `<div class="timeline-entry__taxa">${entry.taxa.map((name) => {
              const taxon = SPECIES.find((species) => species.name === name);
              return taxon ? `<a href="#/species/${esc(taxon.id)}">${esc(name)}</a>` : `<span style="font-size:9px;color:var(--muted)">${esc(name)}</span>`;
            }).join("")}</div>` : ""}
          </article>`).join("")}
        </div>
      </section>

      <section class="section--tight" style="padding-bottom:80px">
        <div class="section-head">
          <div>
            <p class="eyebrow">Under the hood</p>
            <h2>How new species are monitored.</h2>
            <p>The page is static, so monitoring runs when the database is rebuilt — not by silently polling a third-party site from a visitor's browser.</p>
          </div>
        </div>
        <div class="monitor-steps">
          <article class="monitor-step">
            <span class="monitor-step__num">01</span>
            <h3>Fetch the names resource</h3>
            <p>Run <code>node scripts/update-database.mjs</code>. The updater walks all 21 ICPS genus pages, reads the accepted-name accordions and stores a dated snapshot.</p>
          </article>
          <article class="monitor-step">
            <span class="monitor-step__num">02</span>
            <h3>Diff and report</h3>
            <p>New accepted names, natural hybrids and infraspecific taxa are compared with the previous snapshot. Additions and removals are written to the changelog with their dates.</p>
          </article>
          <article class="monitor-step">
            <span class="monitor-step__num">03</span>
            <h3>Review and publish</h3>
            <p>Watchlist names that now appear in ICPS are promoted automatically. New names without editorial notes inherit their genus and care group, so nothing is missing from search.</p>
          </article>
        </div>
      </section>
    </div>`;
  }

  /* ---------------------------------------------------------------- about */

  function aboutView() {
    const sourceLinks = DB.sources || {};
    const sources = [
      ["ICPS Carnivorous Plant Names Resource", sourceLinks.icps, "The authoritative snapshot for accepted names, authors, publication details, type localities, distribution and IUCN codes."],
      ["International Carnivorous Plant Society", sourceLinks.icpsAbout, "The society behind the names resource, with cultivation guidance, conservation information and the Carnivorous Plant Newsletter."],
      ["Plants of the World Online", sourceLinks.powo, "Royal Botanic Gardens, Kew's global checklist, used as a cross-check for accepted names and distributions."],
      ["Wikipedia", sourceLinks.wikipedia, "Background reading and species-level summaries used to orient editorial research."],
      ["Wikimedia Commons", sourceLinks.wikimedia, "Openly licensed photographs, with attribution and licence links preserved on every species page."],
      ["Natural Earth", sourceLinks.naturalEarth, "Public-domain country boundaries used to draw the world map without external tiles or tracking."],
    ];
    return `${pageHead({
      crumbs: breadcrumb([{ label: "Home", href: "#/" }, { label: "About" }]),
      eyebrow: "About the project",
      title: "A field guide for the curious",
      lede: "Built for Plantivorous: a complete, portable catalogue of the world's carnivorous plants, with the taxonomy, distribution and cultivation detail that a serious grower actually needs.",
    })}
    <div class="container">
      <div class="about-intro">
        <div>
          <p class="eyebrow">Why it exists</p>
          <h2>One place to look up a plant — and understand it.</h2>
          <p>Carnivorous plant information is scattered across forum posts, nursery catalogues, scientific papers and a handful of excellent specialist societies. Names change, care advice conflicts, and photographs are often unattributed. This database pulls the accepted nomenclature into one place, then layers original descriptions, care profiles, range maps and openly licensed images on top.</p>
          <p>It is designed to be attached to plantivorous.co.za as a static site: no server, no database, no tracking, no reliance on external map tiles. It works from a folder, a USB stick, GitHub Pages, Netlify or any ordinary web host.</p>
          <div class="about-stats">
            <div class="about-stat"><strong>${fmt(DB.meta.totalSpecies)}</strong><span>Taxa</span></div>
            <div class="about-stat"><strong>${fmt(DB.meta.genusCount)}</strong><span>Genera</span></div>
            <div class="about-stat"><strong>${fmt(DB.meta.photoCount)}</strong><span>Photos</span></div>
            <div class="about-stat"><strong>16</strong><span>Botanical plates</span></div>
          </div>
        </div>
        <aside class="about-quote">
          <p>“The database is not a substitute for a flora, a herbarium specimen or a good grower's experience. It is a map of the territory — one that tries to show where the edges are.”</p>
          <span>Plantivorous database · editorial note</span>
        </aside>
      </div>

      <div class="about-layout">
        <div>
          <section class="content-card">
            <h2>How names are chosen</h2>
            <p class="prose">The catalogue follows the ICPS Carnivorous Plant Names Resource, which is itself a curated synthesis of the taxonomic literature. The baseline snapshot contains ${fmt(DB.meta.icpsCount)} accepted species and natural hybrids across ${fmt(DB.meta.genusCount)} genera. An additional ${fmt(DB.meta.provisionalCount)} recent names, accepted in the primary literature but absent from that snapshot, are shown provisionally and excluded from the ICPS count.</p>
            <ol class="method-list">
              <li><strong>Accepted names only.</strong> Synonyms and unresolved combinations are not given separate species pages. Where the ICPS page marks a name as accepted, it is included.</li>
              <li><strong>Natural hybrids count.</strong> Wild-occurring hybrids accepted by ICPS are included as taxa, clearly labelled and counted separately from species.</li>
              <li><strong>Infraspecific taxa are nested.</strong> Varieties, subspecies and forms are listed on their parent species page rather than inflated into separate records.</li>
              <li><strong>Provisional means provisional.</strong> A watchlist entry is not an ICPS endorsement. It is a documented recent description, with a source, waiting for the names resource to catch up.</li>
              <li><strong>Distribution is indicative.</strong> Country, region and province names come from the ICPS record. Map markers use centroids, never precise localities, and introduced records are flagged.</li>
              <li><strong>Care is grouped, not guessed.</strong> Each species inherits one of 17 cross-genus care profiles, then carries a species note where its needs differ.</li>
            </ol>
          </section>

          <section class="content-card">
            <h2>What's included</h2>
            <div class="prose">
              <ul>
                <li>Accepted species, natural hybrids and nested infraspecific taxa.</li>
                <li>Naming authority, publication, year, type locality and classification where the ICPS record provides them.</li>
                <li>Discovery notes and etymology for flagship species; generated factual summaries for the rest.</li>
                <li>Approximate native range, country lists, introduced records and an interactive world map.</li>
                <li>Care group, difficulty, species-specific cultivation notes and a full care sheet.</li>
                <li>Openly licensed photographs with visible attribution, plus original botanical illustrations for all 16 visual genus groups.</li>
                <li>Conservation status and notes where available.</li>
                <li>A dated changelog and a curated watchlist of recently published taxa.</li>
              </ul>
            </div>
            <div class="callout"><strong>Coverage note</strong>The ICPS names resource is the taxonomic spine, but it does not include every recently described species. The watchlist is a curated supplement, not an exhaustive list of all post-snapshot literature.</div>
          </section>

          <section class="content-card">
            <h2>Photographs &amp; illustrations</h2>
            <p class="prose">Photographs are sourced from Wikimedia Commons under the licences shown on each species page. Attribution, the licence name and a link to the original file are kept visible; any reuse must preserve them. The 16 genus plates are original vector illustrations made for this project and are not derived from any copyrighted artwork.</p>
            <ul class="license-list">
              <li><strong>Photos</strong> CC BY, CC BY-SA or public domain; see the credit panel on each species page for the exact licence and photographer.</li>
              <li><strong>Plates</strong> Original SVGs generated for the Plantivorous database. Free to reuse with the project.</li>
              <li><strong>Map geometry</strong> Natural Earth 110m Admin 0 Countries, public domain.</li>
              <li><strong>Nomenclature</strong> ICPS Carnivorous Plant Names Resource; cited with a link on every species page.</li>
              <li><strong>Text</strong> Original editorial writing for this database, except where a source is quoted or linked.</li>
            </ul>
          </section>

          <section class="content-card">
            <h2>Monitoring &amp; updates</h2>
            <p class="prose">A static page cannot reliably scrape a third-party site from the browser. Instead, <code>scripts/update-database.mjs</code> re-fetches the 21 ICPS genus pages, diffs the accepted names against the stored snapshot, appends a changelog entry and rebuilds the data bundle. Run it on a schedule, review the report, then publish the rebuilt folder.</p>
            <p class="prose">The watchlist is curated by hand from the primary literature and cross-checked against the ICPS snapshot. When a watchlist name appears in ICPS, the next build promotes it into the main accepted set automatically.</p>
            <div class="callout callout--amber"><strong>Not live data</strong>This page was generated from the snapshot dated ${esc(formatDate(DB.meta.icpsSnapshot))}. Names and distributions may have changed since then. Always check the ICPS resource and the primary literature before making conservation or collection decisions.</div>
          </section>

          <section class="content-card">
            <h2>Disclaimer</h2>
            <div class="prose">
              <p>This is an educational and horticultural reference, not a conservation survey, a legal identification service or a source of collecting permits. Many carnivorous plants are threatened by habitat loss and over-collection; several are protected by CITES or national law. Never collect from the wild without the necessary permissions, and buy only traceable, nursery-propagated material.</p>
              <p>Care notes describe general cultivation practice. Results depend on your climate, water chemistry, light, substrate and the provenance of the plant. Range maps are approximate and must not be used to infer precise localities.</p>
            </div>
          </section>

          <section class="content-card">
            <h2>Sources</h2>
            <div class="source-grid">
              ${sources.map(([name, url, description]) => `<a class="source-card" href="${esc(url || "#")}" target="_blank" rel="noopener"><strong>${esc(name)} ↗</strong><span>${esc(description)}</span></a>`).join("")}
            </div>
          </section>
        </div>

        <aside class="about-side">
          <section class="side-card">
            <h2>Database snapshot</h2>
            <div class="side-card__rows">
              <div class="side-card__row"><span>ICPS snapshot</span><span>${esc(formatDate(DB.meta.icpsSnapshot))}</span></div>
              <div class="side-card__row"><span>Accepted taxa</span><span>${fmt(DB.meta.icpsCount)}</span></div>
              <div class="side-card__row"><span>Provisional</span><span>${fmt(DB.meta.provisionalCount)}</span></div>
              <div class="side-card__row"><span>Genera</span><span>${fmt(DB.meta.genusCount)}</span></div>
              <div class="side-card__row"><span>Families</span><span>${fmt(DB.meta.familyCount)}</span></div>
              <div class="side-card__row"><span>Map markers</span><span>${fmt(DB.meta.mapPointCount)}</span></div>
              <div class="side-card__row"><span>Version</span><span>${esc(DB.meta.version || "1.0.0")}</span></div>
            </div>
          </section>

          <section class="side-card">
            <h2>Attach to Plantivorous</h2>
            <p>The whole catalogue is static. Copy the folder to a subdirectory such as <code>/database</code> on plantivorous.co.za and link to <code>index.html</code>. No server-side code, database or build step is needed at runtime.</p>
            <p>Refresh the data by running the update script, then re-upload the changed data and image files.</p>
            <a class="side-link" href="#/new">See the monitoring workflow ${icon("arrow")}</a>
          </section>

          <section class="side-card">
            <h2>Get involved</h2>
            <p>Found a name that has changed, a broken source link or a care note that could be sharper? The best corrections come from growers and taxonomists who know the plants in the field.</p>
            <p>Start with the ICPS names resource, then send the reference and the proposed correction to the Plantivorous team.</p>
          </section>
        </aside>
      </div>
    </div>`;
  }

  /* ---------------------------------------------------------------- favourites view */

  function favouritesView() {
    const saved = [...favourites].map((id) => SPECIES_BY_ID.get(id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
    return `${pageHead({
      crumbs: breadcrumb([{ label: "Home", href: "#/" }, { label: "Favourites" }]),
      eyebrow: "Your collection",
      title: "Favourites",
      lede: "A personal shortlist, stored only in this browser. Use it to plan a collection, compare care needs or keep track of species to look for.",
      stat: fmt(saved.length),
      statLabel: "Saved taxa",
    })}
    <div class="container" style="padding:34px 0 84px">
      ${saved.length ? `<div class="fav-toolbar">
        <p><strong>${fmt(saved.length)}</strong> ${saved.length === 1 ? "species" : "species"} saved on this device.</p>
        <div class="fav-toolbar__actions">
          <button class="btn btn--secondary btn--small" type="button" data-print>${icon("print")} Print list</button>
          <button class="btn btn--ghost btn--small" type="button" data-clear-favourites>Clear favourites</button>
        </div>
      </div>
      <div class="species-grid species-grid--four">${saved.map((species) => speciesCard(species)).join("")}</div>
      <p style="margin-top:24px;color:var(--muted);font-size:10.5px;line-height:1.6">Favourites are saved in this browser's local storage. They are not sent to a server and will not follow you to another device or browser profile.</p>`
      : `<div class="empty-state fav-empty">
        <img class="empty-state__art" src="assets/img/genera/dionaea.svg" alt="" loading="lazy">
        <h2>No favourites yet.</h2>
        <p>Tap the heart on any species card or detail page to build a shortlist. Everything stays in this browser.</p>
        <a class="btn btn--primary" href="#/database">Browse the database ${icon("arrow")}</a>
        <a class="btn btn--secondary" href="#/genera">Explore genera</a>
      </div>`}
    </div>`;
  }

  /* ---------------------------------------------------------------- routing */

  function decodePart(value) {
    try {
      return decodeURIComponent(value || "");
    } catch {
      return value || "";
    }
  }

  function parseRoute() {
    const raw = (location.hash || "#/").replace(/^#/, "") || "/";
    const queryIndex = raw.indexOf("?");
    const path = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
    const query = queryIndex >= 0 ? raw.slice(queryIndex + 1) : "";
    const parts = path.split("/").filter(Boolean);
    return { raw, path, parts, params: new URLSearchParams(query) };
  }

  function routeTitle(route) {
    const key = route.parts[0] || "home";
    switch (key) {
      case "home":
        return "Carnivorous Plant Database";
      case "database":
        return "Species database";
      case "species": {
        const species = SPECIES_BY_ID.get(decodePart(route.parts[1]));
        return species ? species.name : "Species not found";
      }
      case "genera":
        return "Genera";
      case "genus": {
        const genus = GENUS_BY_NAME.get(decodePart(route.parts[1]));
        return genus ? `${genus.genus} — ${genus.commonName}` : "Genus not found";
      }
      case "map": {
        const species = SPECIES_BY_ID.get(decodePart(route.params.get("species") || ""));
        return species ? `${species.name} range map` : "Native range map";
      }
      case "care": {
        const group = CARE_BY_KEY.get(route.parts[1] || "");
        return group ? `${group.label} care guide` : "Care guides";
      }
      case "new":
        return "What's new";
      case "about":
        return "About & sources";
      case "favourites":
        return "Favourites";
      default:
        return "Page not found";
    }
  }

  function pageTitle(route) {
    const title = routeTitle(route);
    return title === "Carnivorous Plant Database" ? `Plantivorous · ${title}` : `${title} · Plantivorous`;
  }

  function updateNavigation(route) {
    const key = route.parts[0] || "home";
    const active = ["species", "database"].includes(key)
      ? "database"
      : ["genus", "genera"].includes(key)
        ? "genera"
        : key;
    $$(".main-nav a[data-nav], .mobile-nav a[data-nav]").forEach((link) => {
      const isActive = link.dataset.nav === active;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function resetTransientOverlays() {
    document.body.classList.remove("nav-open", "filters-open");
    const mobileNav = $("#mobile-nav");
    if (mobileNav) mobileNav.hidden = true;
    const navToggle = $("[data-nav-toggle]");
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
    }
    const filtersToggle = $("[data-filters-toggle]");
    if (filtersToggle) filtersToggle.setAttribute("aria-expanded", "false");
  }

  function renderRoute({ preserveScroll = false } = {}) {
    if (!app) return;
    const route = parseRoute();
    const key = route.parts[0] || "home";
    let html;

    switch (key) {
      case "home":
        html = homeView();
        break;
      case "database":
        html = databaseView(route);
        break;
      case "species":
        html = speciesView(route);
        break;
      case "genera":
        html = generaView();
        break;
      case "genus":
        html = genusView(route);
        break;
      case "map":
        html = mapView(route);
        break;
      case "care":
        html = careView(route);
        break;
      case "new":
        html = newView();
        break;
      case "about":
        html = aboutView();
        break;
      case "favourites":
        html = favouritesView();
        break;
      default:
        html = notFoundView(`No route matches “${route.path}”.`);
    }

    app.innerHTML = html;
    document.title = pageTitle(route);
    updateNavigation(route);
    resetTransientOverlays();

    if (key === "database") renderDbResults();
    else if (key === "genus") renderGenusResults();
    else if (key === "map") initMapPage();

    updateFavouriteButtons();

    if (!preserveScroll) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }

  /* ---------------------------------------------------------------- global search */

  const SEARCH_SPECIES = SPECIES.map((species) => ({
    species,
    haystack: normalizeText([
      species.name,
      species.fullName,
      species.commonName,
      species.genus,
      species.family,
      species.careGroupLabel,
      species.trapType,
      ...(species.nativeCountries || []),
      ...(species.nativeRegions || []),
      ...(species.tags || []),
    ].filter(Boolean).join(" ")),
  }));

  const SEARCH_GENERA = GENERA.map((genus) => ({
    genus,
    haystack: normalizeText([
      genus.genus,
      genus.commonName,
      genus.alsoKnownAs,
      genus.family,
      genus.trapType,
      genus.nativeShort,
      genus.nativeRange,
    ].filter(Boolean).join(" ")),
  }));

  const SEARCH_CARE = CARE_GROUPS.map((group) => ({
    group,
    haystack: normalizeText([
      group.label,
      group.short,
      group.tagline,
      group.description,
      group.difficulty,
      ...(group.genera || []),
    ].filter(Boolean).join(" ")),
  }));

  const searchState = { items: [], selected: -1, opener: null };

  function searchScore(haystack, name, tokens) {
    const normalizedName = normalizeText(name);
    let score = 0;
    for (const token of tokens) {
      if (!haystack.includes(token)) return -1;
      if (normalizedName === token) score += 10;
      else if (normalizedName.startsWith(token)) score += 6;
      else if (normalizedName.includes(token)) score += 4;
      else score += 1;
    }
    return score;
  }

  function searchSuggestionMarkup() {
    return `<div class="search-empty">
      <p>Try a name, a country or a trap type.</p>
      <div class="search-suggestions">
        <button type="button" data-search-term="Nepenthes rajah">Nepenthes rajah</button>
        <button type="button" data-search-term="sundew">sundew</button>
        <button type="button" data-search-term="Madagascar">Madagascar</button>
        <button type="button" data-search-term="bladder">bladder</button>
        <button type="button" data-search-term="beginner">beginner</button>
      </div>
    </div>`;
  }

  function searchSpeciesResult(species) {
    const image = speciesImage(species);
    return `<a class="search-result" href="#/species/${esc(species.id)}" data-search-item>
      <span class="search-result__thumb${image.isPhoto ? "" : " is-illustration"}">
        <img src="${esc(image.src)}" alt="" loading="lazy" decoding="async" data-fallback="${esc(species.illustration)}">
      </span>
      <span class="search-result__body">
        <strong><em>${esc(species.name)}</em></strong>
        <span>${esc(species.family)} · ${esc(species.nativeShort || species.genus)}</span>
      </span>
      <span class="search-result__tag">${species.provisional ? "Provisional" : "Species"}</span>
    </a>`;
  }

  function searchGenusResult(genus) {
    return `<a class="search-result" href="#/genus/${encodeURIComponent(genus.genus)}" data-search-item>
      <span class="search-result__thumb is-illustration">
        <img src="${esc(genus.illustration)}" alt="" loading="lazy" decoding="async">
      </span>
      <span class="search-result__body">
        <strong><em>${esc(genus.genus)}</em></strong>
        <span>${esc(genus.commonName)} · ${fmt(genus.speciesCount)} taxa</span>
      </span>
      <span class="search-result__tag">Genus</span>
    </a>`;
  }

  function searchCareResult(group) {
    return `<a class="search-result" href="#/care/${esc(group.key)}" data-search-item>
      <span class="search-result__thumb">${icon(careIcon(group.key))}</span>
      <span class="search-result__body">
        <strong>${esc(group.label)}</strong>
        <span>${esc(group.tagline)}</span>
      </span>
      <span class="search-result__tag">Care</span>
    </a>`;
  }

  function renderSearchResults(rawQuery) {
    const box = $("#global-search-results");
    if (!box) return;
    const query = String(rawQuery || "").trim();
    const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
    searchState.items = [];
    searchState.selected = -1;

    if (!tokens.length) {
      box.innerHTML = searchSuggestionMarkup();
      box.scrollTop = 0;
      return;
    }

    const speciesMatches = SEARCH_SPECIES
      .map((entry) => ({ entry, score: searchScore(entry.haystack, entry.species.name, tokens) }))
      .filter((match) => match.score >= 0)
      .sort((a, b) =>
        b.score - a.score ||
        Number(b.entry.species.featured) - Number(a.entry.species.featured) ||
        Number(b.entry.species.hasPhoto) - Number(a.entry.species.hasPhoto) ||
        a.entry.species.name.localeCompare(b.entry.species.name))
      .slice(0, 8)
      .map((match) => match.entry.species);

    const genusMatches = SEARCH_GENERA
      .map((entry) => ({ entry, score: searchScore(entry.haystack, entry.genus.genus, tokens) }))
      .filter((match) => match.score >= 0)
      .sort((a, b) => b.score - a.score || b.entry.genus.speciesCount - a.entry.genus.speciesCount)
      .slice(0, 3)
      .map((match) => match.entry.genus);

    const careMatches = SEARCH_CARE
      .map((entry) => ({ entry, score: searchScore(entry.haystack, entry.group.label, tokens) }))
      .filter((match) => match.score >= 0)
      .sort((a, b) => b.score - a.score || a.entry.group.label.localeCompare(b.entry.group.label))
      .slice(0, 2)
      .map((match) => match.entry.group);

    const sections = [];
    if (speciesMatches.length) {
      sections.push(`<p class="search-group-label">Species</p>${speciesMatches.map(searchSpeciesResult).join("")}`);
    }
    if (genusMatches.length) {
      sections.push(`<p class="search-group-label">Genera</p>${genusMatches.map(searchGenusResult).join("")}`);
    }
    if (careMatches.length) {
      sections.push(`<p class="search-group-label">Care guides</p>${careMatches.map(searchCareResult).join("")}`);
    }

    box.innerHTML = sections.length
      ? sections.join("")
      : `<div class="search-empty">
          <p>No matches for “${esc(query)}”.</p>
          <div class="search-suggestions">
            <button type="button" data-search-term="Nepenthes">Nepenthes</button>
            <button type="button" data-search-term="Drosera">Drosera</button>
            <button type="button" data-search-term="highland">highland</button>
            <button type="button" data-search-term="Africa">Africa</button>
          </div>
        </div>`;

    searchState.items = $$("[data-search-item]", box);
    if (searchState.items.length) selectSearchIndex(0);
    box.scrollTop = 0;
  }

  function selectSearchIndex(index) {
    if (!searchState.items.length) return;
    const total = searchState.items.length;
    searchState.selected = ((index % total) + total) % total;
    searchState.items.forEach((item, itemIndex) => {
      item.classList.toggle("is-selected", itemIndex === searchState.selected);
    });
    const active = searchState.items[searchState.selected];
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function moveSearchSelection(delta) {
    if (!searchState.items.length) return;
    selectSearchIndex(searchState.selected + delta);
  }

  function syncBodyLock() {
    const modal = $("#search-modal");
    const searchOpen = Boolean(modal && !modal.hidden);
    document.body.classList.toggle("modal-open", Boolean(lightboxEl) || searchOpen);
  }

  function openSearch(prefill = "") {
    const modal = $("#search-modal");
    const input = $("#global-search");
    if (!modal || !input) return;
    if (document.body.classList.contains("nav-open")) closeMobileNav();
    searchState.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.hidden = false;
    input.value = prefill;
    renderSearchResults(prefill);
    syncBodyLock();
    input.focus({ preventScroll: true });
  }

  function closeSearch() {
    const modal = $("#search-modal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    syncBodyLock();
    const input = $("#global-search");
    if (input) input.value = "";
    const box = $("#global-search-results");
    if (box) box.innerHTML = searchSuggestionMarkup();
    searchState.items = [];
    searchState.selected = -1;
    if (searchState.opener && document.contains(searchState.opener)) {
      searchState.opener.focus({ preventScroll: true });
    }
    searchState.opener = null;
  }

  function trapFocus(event, container) {
    const focusables = $$(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      container,
    ).filter((element) => element.getClientRects().length > 0);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------------------------------------------------------------- lightbox */

  let lightboxEl = null;
  let lightboxOpener = null;

  function openLightbox(src, caption = "") {
    if (!src) return;
    closeLightbox();
    lightboxOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = document.createElement("div");
    element.className = "lightbox";
    element.setAttribute("role", "dialog");
    element.setAttribute("aria-modal", "true");
    element.setAttribute("aria-label", "Enlarged image");
    element.innerHTML = `<button class="lightbox__close" type="button" data-lightbox-close aria-label="Close image">${icon("close")}</button>
      <figure>
        <img src="${esc(src)}" alt="${esc(caption || "Enlarged image")}">
        ${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}
      </figure>`;
    document.body.append(element);
    lightboxEl = element;
    syncBodyLock();
    $("[data-lightbox-close]", element)?.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.remove();
    lightboxEl = null;
    syncBodyLock();
    if (lightboxOpener && document.contains(lightboxOpener)) {
      lightboxOpener.focus({ preventScroll: true });
    }
    lightboxOpener = null;
  }

  /* ---------------------------------------------------------------- navigation overlays */

  function openMobileNav() {
    const nav = $("#mobile-nav");
    const toggle = $("[data-nav-toggle]");
    if (!nav || !toggle) return;
    nav.hidden = false;
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close menu");
  }

  function closeMobileNav() {
    const nav = $("#mobile-nav");
    const toggle = $("[data-nav-toggle]");
    document.body.classList.remove("nav-open");
    if (nav) nav.hidden = true;
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
    }
  }

  function toggleMobileNav() {
    if (document.body.classList.contains("nav-open")) closeMobileNav();
    else openMobileNav();
  }

  /* ---------------------------------------------------------------- copy link */

  async function copyCurrentLink() {
    const text = location.href;
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      /* fall through to the legacy path */
    }
    if (!copied) {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.append(area);
        area.select();
        copied = document.execCommand("copy");
        area.remove();
      } catch {
        copied = false;
      }
    }
    showToast(copied
      ? "Link copied to clipboard."
      : "Could not copy automatically — copy the address bar instead.");
  }

  /* ---------------------------------------------------------------- events */

  const debouncedDbSearch = debounce(() => applyDbFilters(), 220);
  const debouncedGenusSearch = debounce(() => applyGenusFilters(), 220);

  function handleDocumentClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    if (lightboxEl && event.target === lightboxEl) {
      closeLightbox();
      return;
    }

    const lightboxClose = target.closest("[data-lightbox-close]");
    if (lightboxClose) {
      event.preventDefault();
      closeLightbox();
      return;
    }

    const lightboxTrigger = target.closest("[data-lightbox-src]");
    if (lightboxTrigger) {
      event.preventDefault();
      openLightbox(lightboxTrigger.dataset.lightboxSrc, lightboxTrigger.dataset.lightboxCaption || "");
      return;
    }

    const navToggle = target.closest("[data-nav-toggle]");
    if (navToggle) {
      event.preventDefault();
      toggleMobileNav();
      return;
    }

    const searchOpen = target.closest("[data-search-open]");
    if (searchOpen) {
      event.preventDefault();
      openSearch();
      return;
    }

    const searchClose = target.closest("[data-search-close]");
    if (searchClose) {
      event.preventDefault();
      closeSearch();
      return;
    }

    const searchTerm = target.closest("[data-search-term]");
    if (searchTerm) {
      event.preventDefault();
      const input = $("#global-search");
      if (input) {
        input.value = searchTerm.dataset.searchTerm || "";
        input.focus();
        renderSearchResults(input.value);
      }
      return;
    }

    const searchAll = target.closest("[data-search-all]");
    if (searchAll) {
      event.preventDefault();
      const query = ($("#global-search")?.value || "").trim();
      closeSearch();
      location.hash = query ? `#/database?q=${encodeURIComponent(query)}` : "#/database";
      return;
    }

    if (target.closest("[data-search-item]")) {
      closeSearch();
      return;
    }

    const favButton = target.closest("[data-fav]");
    if (favButton) {
      event.preventDefault();
      const id = favButton.dataset.fav;
      toggleFavourite(id);
      if ((parseRoute().parts[0] || "home") === "favourites") {
        renderRoute({ preserveScroll: true });
      }
      return;
    }

    const filtersToggle = target.closest("[data-filters-toggle]");
    if (filtersToggle) {
      event.preventDefault();
      openFilters();
      return;
    }

    const filtersClose = target.closest("[data-filters-close]");
    if (filtersClose) {
      event.preventDefault();
      closeFilters();
      return;
    }

    const clearFilters = target.closest("[data-clear-filters]");
    if (clearFilters) {
      event.preventDefault();
      clearDbFilters();
      return;
    }

    const removeFilter = target.closest("[data-remove-filter]");
    if (removeFilter) {
      event.preventDefault();
      removeDbFilter(removeFilter.dataset.removeFilter);
      return;
    }

    const loadMore = target.closest("[data-load-more]");
    if (loadMore) {
      event.preventDefault();
      dbState.limit += 48;
      renderDbResults({ append: true });
      return;
    }

    const viewToggle = target.closest("[data-view]");
    if (viewToggle) {
      event.preventDefault();
      setView(viewToggle.dataset.view);
      return;
    }

    const dbClear = target.closest("[data-db-clear]");
    if (dbClear) {
      event.preventDefault();
      const input = $("#db-search");
      if (input) {
        input.value = "";
        input.focus();
      }
      applyDbFilters();
      return;
    }

    const genusMore = target.closest("[data-genus-more]");
    if (genusMore) {
      event.preventDefault();
      genusState.limit += 48;
      renderGenusResults({ append: true });
      return;
    }

    const genusClear = target.closest("[data-genus-clear]");
    if (genusClear) {
      event.preventDefault();
      const input = $("#genus-search");
      if (input) {
        input.value = "";
        input.focus();
      }
      applyGenusFilters();
      return;
    }

    const bubble = target.closest(".map-bubble");
    if (bubble) {
      selectMapGroup(bubble.dataset.group);
      return;
    }

    const copyButton = target.closest("[data-copy-link]");
    if (copyButton) {
      event.preventDefault();
      copyCurrentLink();
      return;
    }

    const printButton = target.closest("[data-print]");
    if (printButton) {
      event.preventDefault();
      window.print();
      return;
    }

    const clearFavourites = target.closest("[data-clear-favourites]");
    if (clearFavourites) {
      event.preventDefault();
      if (!favourites.size) return;
      if (!window.confirm("Clear every saved favourite? This cannot be undone.")) return;
      favourites.clear();
      saveFavourites();
      updateFavouriteButtons();
      renderRoute({ preserveScroll: true });
      showToast("Favourites cleared.");
      return;
    }

    const toTop = target.closest("[data-to-top]");
    if (toTop) {
      event.preventDefault();
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, left: 0, behavior: reduced ? "auto" : "smooth" });
      return;
    }

    const navLink = target.closest("[data-nav]");
    if (navLink && navLink.closest(".mobile-nav")) {
      closeMobileNav();
    }

    if (document.body.classList.contains("nav-open") && !target.closest(".site-header")) {
      closeMobileNav();
    }
  }

  function handleDocumentInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.id === "db-search") debouncedDbSearch();
    else if (target.id === "genus-search") debouncedGenusSearch();
    else if (target.id === "global-search") renderSearchResults(target.value);
  }

  function handleDocumentChange(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.matches("[data-map-filter]")) {
      updateMapFilters();
      return;
    }
    if (target.matches("#genus-sort")) {
      applyGenusFilters();
      return;
    }
    if (target.matches("#db-sort") || target.closest("#db-filters")) {
      applyDbFilters();
    }
  }

  function handleDocumentSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (form.matches("[data-hero-search]")) {
      event.preventDefault();
      const query = ($("#hero-search")?.value || "").trim();
      location.hash = query ? `#/database?q=${encodeURIComponent(query)}` : "#/database";
      return;
    }
    if (form.matches("#db-filters, #map-filters")) event.preventDefault();
  }

  function handleDocumentKeydown(event) {
    const target = event.target;
    const typing = target instanceof HTMLElement
      && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
    const searchModal = $("#search-modal");
    const searchOpen = Boolean(searchModal && !searchModal.hidden);

    if (event.key === "Escape") {
      if (lightboxEl) {
        closeLightbox();
        return;
      }
      if (searchOpen) {
        closeSearch();
        return;
      }
      if (document.body.classList.contains("filters-open")) {
        closeFilters();
        return;
      }
      if (document.body.classList.contains("nav-open")) {
        closeMobileNav();
        return;
      }
    }

    if (lightboxEl && event.key === "Tab") {
      trapFocus(event, lightboxEl);
      return;
    }

    if (event.key === "/" && !typing && !searchOpen && !lightboxEl) {
      event.preventDefault();
      openSearch();
      return;
    }

    if (searchOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSearchSelection(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSearchSelection(-1);
        return;
      }
      if (event.key === "Tab") {
        trapFocus(event, searchModal);
        return;
      }
      if (event.key === "Enter" && target instanceof HTMLElement && target.id === "global-search") {
        event.preventDefault();
        const selected = searchState.items[searchState.selected];
        if (selected) {
          const href = selected.getAttribute("href");
          closeSearch();
          if (href) location.hash = href;
        } else {
          const query = target.value.trim();
          closeSearch();
          location.hash = query ? `#/database?q=${encodeURIComponent(query)}` : "#/database";
        }
        return;
      }
    }

    if (target instanceof Element
      && target.matches(".map-bubble")
      && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      selectMapGroup(target.dataset.group);
    }
  }

  function handleImageError(event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const fallback = image.dataset.fallback;
    if (!fallback) return;
    image.dataset.fallback = "";
    image.src = fallback;
    const frame = image.closest(".species-card__media, .species-mini__media, .species-media, .search-result__thumb");
    if (frame) frame.classList.add("is-illustration");
  }

  function setupEvents() {
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("input", handleDocumentInput);
    document.addEventListener("change", handleDocumentChange);
    document.addEventListener("submit", handleDocumentSubmit);
    document.addEventListener("keydown", handleDocumentKeydown);
    document.addEventListener("error", handleImageError, true);
    document.addEventListener("mouseover", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const item = target?.closest("[data-search-item]");
      if (item) {
        const index = searchState.items.indexOf(item);
        if (index >= 0 && index !== searchState.selected) selectSearchIndex(index);
      }
    });
    window.addEventListener("hashchange", () => renderRoute());
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1020 && document.body.classList.contains("nav-open")) closeMobileNav();
    });
  }

  function setFooterMeta() {
    const year = $("#year");
    if (year) year.textContent = String(new Date().getFullYear());
    const snapshot = $("#footer-snapshot");
    if (snapshot) snapshot.textContent = formatDate(DB.meta.icpsSnapshot);
    const watch = $("#footer-watch");
    if (watch) watch.textContent = `${fmt(WATCHLIST.length)} taxa on watch`;
    const searchAll = $("[data-search-all]");
    if (searchAll) searchAll.textContent = `Browse all ${fmt(DB.meta.totalSpecies)} taxa`;
  }

  setupEvents();
  setFooterMeta();
  renderRoute();
})();
