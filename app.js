const regions = [
  "Melbourne", "Victoria", "Tasmania", "Sydney", "Blue Mountains",
  "Queensland", "Perth", "Adelaide", "Northern Territory", "Coastal"
];

const terrainTypes = ["Forest", "Coastal", "Mountain", "Rainforest", "Desert", "Waterfall"];
const warnings = ["Steep descent", "Slippery when wet", "Snake activity", "Strong UV", "Remote area"];

// Generate a large set of rich mock trails from realistic Australian bases.
const baseTrails = [
  { name: "Dandenong Forest Loop", region: "Victoria", lat: -37.86, lon: 145.35 },
  { name: "Blue Gum Cascade Walk", region: "Blue Mountains", lat: -33.72, lon: 150.30 },
  { name: "Cradle Summit Route", region: "Tasmania", lat: -41.68, lon: 145.94 },
  { name: "Noosa Rainforest Ridge", region: "Queensland", lat: -26.40, lon: 153.10 },
  { name: "Kings Canyon Rim", region: "Northern Territory", lat: -24.25, lon: 131.56 },
  { name: "Cape to Cape Coastal Track", region: "Perth", lat: -33.88, lon: 115.00 },
  { name: "Great Ocean Lookout Path", region: "Melbourne", lat: -38.70, lon: 143.10 },
  { name: "Morialta Falls Traverse", region: "Adelaide", lat: -34.89, lon: 138.67 },
  { name: "Royal National Hidden Pools", region: "Sydney", lat: -34.10, lon: 151.05 },
  { name: "Wilsons Prom Granite Coast", region: "Coastal", lat: -39.03, lon: 146.31 }
];

const trails = Array.from({ length: 240 }, (_, i) => {
  const base = baseTrails[i % baseTrails.length];
  const difficultyLevels = ["Easy", "Moderate", "Hard", "Extreme"];
  const difficulty = difficultyLevels[i % difficultyLevels.length];
  const distance = (4 + (i % 18) + Math.random() * 4).toFixed(1);
  const elevation = 110 + (i % 14) * 72;
  const hrs = Math.max(1, Math.round(distance / 4 + elevation / 900));
  const mins = (i * 7) % 60;

  return {
    id: i + 1,
    title: `${base.name} ${Math.floor(i / baseTrails.length) + 1}`,
    region: base.region,
    distance: Number(distance),
    rating: (4 + ((i % 10) / 10)).toFixed(1),
    difficulty,
    elevation,
    time: `${hrs}h ${mins.toString().padStart(2, "0")}m`,
    water: i % 3 === 0 ? "Reliable streams" : "Carry 2L minimum",
    safety: warnings[i % warnings.length],
    wildlife: i % 2 === 0 ? "Wallabies, lyrebirds" : "Kookaburras, echidnas",
    bestSeason: ["Spring", "Summer", "Autumn", "Winter"][i % 4],
    popularTimes: i % 2 === 0 ? "Sunrise" : "Late afternoon",
    terrain: terrainTypes[i % terrainTypes.length],
    accessibility: i % 5 === 0 ? "Partial accessible boardwalks" : "Not wheelchair accessible",
    conditions: i % 4 === 0 ? "Dry and stable" : "Mixed terrain with muddy patches",
    emergency: "000 · State Parks Rescue",
    aiDescription: "A cinematic route weaving through towering gums, misty lookouts, and wildlife corridors.",
    lat: base.lat + (Math.random() - 0.5) * 1.7,
    lon: base.lon + (Math.random() - 0.5) * 1.7,
    reviews: 90 + (i % 380)
  };
});

const els = {
  trailCount: document.getElementById("trailCount"),
  trailsGrid: document.getElementById("trailsGrid"),
  resultCount: document.getElementById("resultCount"),
  regionFilter: document.getElementById("regionFilter"),
  difficultyFilter: document.getElementById("difficultyFilter"),
  searchInput: document.getElementById("searchInput"),
  resetFilters: document.getElementById("resetFilters"),
  locationStatus: document.getElementById("locationStatus"),
  weatherStatus: document.getElementById("weatherStatus"),
  sunStatus: document.getElementById("sunStatus"),
  locateBtn: document.getElementById("locateBtn"),
  recommendations: document.getElementById("nearbyRecommendations"),
  walkOverlay: document.getElementById("walkOverlay"),
  walkTrailName: document.getElementById("walkTrailName"),
  walkDistance: document.getElementById("walkDistance"),
  walkPace: document.getElementById("walkPace"),
  walkCalories: document.getElementById("walkCalories"),
  walkElevation: document.getElementById("walkElevation"),
  walkSteps: document.getElementById("walkSteps"),
  walkEta: document.getElementById("walkEta"),
  compassNeedle: document.getElementById("compassNeedle"),
  startWalkMode: document.getElementById("startWalkMode"),
  pauseWalk: document.getElementById("pauseWalk"),
  closeWalk: document.getElementById("closeWalk"),
  feedList: document.getElementById("feedList"),
  photoInput: document.getElementById("photoInput"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  scanState: document.getElementById("scanState"),
  aiResult: document.getElementById("aiResult"),
  randomAdventure: document.getElementById("randomAdventure"),
  themeToggle: document.getElementById("themeToggle"),
  audioToggle: document.getElementById("audioToggle"),
  cursorGlow: document.getElementById("cursorGlow"),
  xpBar: document.getElementById("xpBar"),
  xpDisplay: document.getElementById("xpDisplay"),
  levelBadge: document.getElementById("levelBadge"),
  levelTitle: document.getElementById("levelTitle"),
  xpText: document.getElementById("xpText")
};

let currentList = trails.slice(0, 36);
let walkTicker = null;
let walkPaused = false;
let ambienceContext = null;
let ambienceNodes = [];

// Gamification system
let userXP = 325;
let userLevel = 12;
const xpPerLevel = 500;
let userStreakDays = 18;
let completedTrails = 0;

const formatDistance = (aLat, aLon, bLat, bLon) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))).toFixed(1);
};

function updateXPDisplay() {
  const xpInLevel = userXP % xpPerLevel;
  const xpPercent = (xpInLevel / xpPerLevel) * 100;
  
  if (els.xpBar) els.xpBar.style.width = xpPercent + '%';
  if (els.xpDisplay) els.xpDisplay.textContent = `${xpInLevel} / ${xpPerLevel} XP`;
  if (els.levelBadge) els.levelBadge.textContent = userLevel;
  if (els.xpText) els.xpText.textContent = `${xpInLevel} / ${xpPerLevel} XP`;
  
  // Update level title
  const titles = ["Trail Wanderer", "Trail Scout", "Trail Ranger", "Peak Explorer", "Mountain Master"];
  const levelIdx = Math.min(Math.floor(userLevel / 3), titles.length - 1);
  if (els.levelTitle) els.levelTitle.textContent = titles[levelIdx];
}

function awardXP(amount) {
  userXP += amount;
  const levelsGained = Math.floor(userXP / xpPerLevel);
  if (levelsGained > 0) {
    userLevel += levelsGained;
    userXP = userXP % xpPerLevel;
    showNotification(`🎉 Level Up! You are now Level ${userLevel}!`);
  }
  updateXPDisplay();
}

function showNotification(message) {
  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.textContent = message;
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 3500);
}

function animateCounter(element, target, duration = 2000) {
  let current = 0;
  const step = target / (duration / 16);
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    element.textContent = Math.floor(current).toLocaleString();
  }, 16);
}

function populateFilters() {
  regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    els.regionFilter.append(option);
  });
}

function renderTrails(list) {
  const template = document.getElementById("trailCardTemplate");
  els.trailsGrid.innerHTML = "";

  list.forEach((trail) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.querySelector("h4").textContent = trail.title;
    node.querySelector(".meta").textContent = `${trail.region} · ★${trail.rating} · ${trail.reviews} reviews`;
    node.querySelector(".desc").textContent = trail.aiDescription;

    const details = node.querySelector(".trail-details");
    [
      `${trail.distance} km · ${trail.time}`,
      `Difficulty: ${trail.difficulty} · Elevation ${trail.elevation} m`,
      `Water: ${trail.water} · Wildlife: ${trail.wildlife}`,
      `Terrain: ${trail.terrain} · Season: ${trail.bestSeason}`,
      `Safety: ${trail.safety} · Emergency: ${trail.emergency}`
    ].forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      details.append(li);
    });

    node.querySelector(".trail-image").style.background =
      `linear-gradient(120deg, rgba(53,242,170,0.2), rgba(115,168,255,0.22)), url('https://picsum.photos/seed/trail${trail.id}/400/240') center/cover`;
    node.querySelector(".walk-btn").addEventListener("click", () => startWalk(trail));

    els.trailsGrid.append(node);
  });

  els.resultCount.textContent = `${list.length} results`;
}

function applyFilters() {
  const q = els.searchInput.value.toLowerCase().trim();
  const region = els.regionFilter.value;
  const difficulty = els.difficultyFilter.value;

  currentList = trails.filter((trail) => {
    const textMatch = `${trail.title} ${trail.region} ${trail.terrain}`.toLowerCase().includes(q);
    const regionMatch = region === "all" || trail.region === region;
    const difficultyMatch = difficulty === "all" || trail.difficulty === difficulty;
    return textMatch && regionMatch && difficultyMatch;
  });

  renderTrails(currentList.slice(0, 60));
}

function renderFeed() {
  const feed = [
    "Alyssa completed Cradle Summit Route at sunrise 🌄",
    "Ben discovered a hidden waterfall near Blue Mountains 💧",
    "Kai earned the ‘Rainforest Ranger’ badge 🌿",
    "Mila shared storm-safe reroute tips for coastal walks ⛺"
  ];
  els.feedList.innerHTML = feed.map((item) => `<article>${item}</article>`).join("");
}

function recommendNearby(lat, lon) {
  const nearest = trails
    .map((trail) => ({ ...trail, away: formatDistance(lat, lon, trail.lat, trail.lon) }))
    .sort((a, b) => Number(a.away) - Number(b.away))
    .slice(0, 4);

  els.recommendations.innerHTML = nearest
    .map(
      (trail) => `
      <article class="recommendation">
        <strong>${trail.title}</strong>
        <p>${trail.away} km away · ${trail.difficulty} · ${trail.distance} km · ${trail.time}</p>
      </article>`
    )
    .join("");
}

function setMockWeather() {
  const conditions = ["Clear", "Cloud bands", "Light rain", "Misty forest"]; 
  const c = conditions[new Date().getHours() % conditions.length];
  const temp = 15 + (new Date().getMinutes() % 12);
  els.weatherStatus.textContent = `Weather: ${c} · ${temp}°C · Wind ${8 + (temp % 11)}km/h`;
  els.sunStatus.textContent = "Sunrise 6:41 · Sunset 5:12 · UV Moderate";
}

function locateUser() {
  if (!navigator.geolocation) {
    els.locationStatus.textContent = "Geolocation not supported in this browser.";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = Number(pos.coords.latitude.toFixed(4));
      const lon = Number(pos.coords.longitude.toFixed(4));
      els.locationStatus.textContent = `You are near ${lat}, ${lon}. Recommending closest trails...`;
      recommendNearby(lat, lon);
    },
    () => {
      const fallback = { lat: -37.8136, lon: 144.9631 };
      els.locationStatus.textContent = "Location blocked. Showing trails near Melbourne CBD fallback.";
      recommendNearby(fallback.lat, fallback.lon);
    }
  );
}

function startWalk(trail = currentList[0] || trails[0]) {
  els.walkOverlay.classList.remove("hidden");
  els.walkTrailName.textContent = trail.title;

  let remaining = trail.distance;
  let calories = 0;
  let elevation = 0;
  let steps = 0;
  let heading = 0;

  clearInterval(walkTicker);
  walkTicker = setInterval(() => {
    if (walkPaused) return;

    remaining = Math.max(0, remaining - 0.03);
    calories += 3;
    elevation += 1 + Math.floor(Math.random() * 3);
    steps += 38;
    heading = (heading + 18) % 360;

    els.walkDistance.textContent = `${remaining.toFixed(2)} km`;
    els.walkPace.textContent = `${(4.6 + Math.random()).toFixed(1)} km/h`;
    els.walkCalories.textContent = `${calories} kcal`;
    els.walkElevation.textContent = `${elevation} m`;
    els.walkSteps.textContent = steps.toLocaleString();
    els.walkEta.textContent = `${Math.max(0, Math.round((remaining / 4.8) * 60))}m`;
    els.compassNeedle.style.transform = `rotate(${heading}deg)`;

    // Award XP periodically
    if (steps % 500 === 0 && steps > 0) {
      awardXP(10);
    }

    // Complete trail
    if (remaining <= 0) {
      stopWalk();
      completedTrails += 1;
      userStreakDays += 1;
      awardXP(100);
      showNotification(`🎉 Trail completed! +100 XP earned! Streak: ${userStreakDays} days`);
    }
  }, 1000);
}

function stopWalk() {
  clearInterval(walkTicker);
  walkPaused = false;
  els.pauseWalk.textContent = "Pause";
  els.walkOverlay.classList.add("hidden");
}

function randomAdventure() {
  const pick = trails[Math.floor(Math.random() * trails.length)];
  els.searchInput.value = pick.region;
  applyFilters();
  window.scrollTo({ top: document.getElementById("map").offsetTop - 80, behavior: "smooth" });
}

function startAmbience() {
  if (!window.AudioContext) {
    alert("Audio context unavailable in this browser.");
    return;
  }

  if (!ambienceContext) ambienceContext = new AudioContext();
  const ctx = ambienceContext;

  // Create multiple sound layers
  const wind = ctx.createOscillator();
  wind.frequency.value = 110;
  wind.type = "sine";
  const windGain = ctx.createGain();
  windGain.gain.value = 0.02;
  wind.connect(windGain).connect(ctx.destination);

  const birds = ctx.createOscillator();
  birds.type = "triangle";
  birds.frequency.value = 880;
  const birdGain = ctx.createGain();
  birdGain.gain.value = 0.005;
  birds.connect(birdGain).connect(ctx.destination);

  const rain = ctx.createOscillator();
  rain.type = "square";
  rain.frequency.value = 200;
  const rainGain = ctx.createGain();
  rainGain.gain.value = 0.01;
  rain.connect(rainGain).connect(ctx.destination);

  // Add some modulation
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 30;
  lfo.connect(lfoGain);
  lfoGain.connect(wind.frequency);

  wind.start();
  birds.start();
  rain.start();
  lfo.start();

  ambienceNodes = [wind, birds, rain, lfo];
  els.audioToggle.textContent = "🔇 Mute";
  showNotification("🎵 Nature ambience enabled - Forest sounds playing");
}

function stopAmbience() {
  ambienceNodes.forEach((node) => node.stop());
  ambienceNodes = [];
  els.audioToggle.textContent = "🌧️ Ambience";
}

function analyzeImage() {
  if (!els.photoInput.files.length) {
    els.scanState.textContent = "Please upload an image first.";
    return;
  }

  els.scanState.textContent = "Analyzing... scanning flora/fauna signature...";
  els.aiResult.innerHTML = '<div class="loading" style="height: 40px; margin-top: 1rem;"></div>';
  
  setTimeout(() => {
    const catalog = [
      {
        name: "Crimson Rosella",
        sci: "Platycercus elegans",
        note: "Vibrant Australian parrot often found in eucalypt forests.",
        toxicity: "Non-toxic",
        danger: "Not dangerous",
        native: "SE Australia",
        emoji: "🦜"
      },
      {
        name: "Golden Wattle",
        sci: "Acacia pycnantha",
        note: "National floral emblem with bright yellow blossoms.",
        toxicity: "Low toxicity if ingested in quantity",
        danger: "Generally safe",
        native: "South-eastern Australia",
        emoji: "🌼"
      },
      {
        name: "Fly Agaric Mushroom",
        sci: "Amanita muscaria",
        note: "Distinctive red cap fungus often in damp pine zones.",
        toxicity: "Toxic if consumed",
        danger: "Potentially dangerous",
        native: "Introduced; temperate forests",
        emoji: "🍄"
      },
      {
        name: "Kookaburra",
        sci: "Dacelo novaeguineae",
        note: "Famous for its distinctive laughing call in Australian woodlands.",
        toxicity: "Non-toxic",
        danger: "Not dangerous",
        native: "Eastern Australia",
        emoji: "🦅"
      },
      {
        name: "Mountain Ash",
        sci: "Eucalyptus regnans",
        note: "The tallest flowering plant in the world, found in mountain forests.",
        toxicity: "Low toxicity",
        danger: "Generally safe",
        native: "Victoria & Tasmania",
        emoji: "🌲"
      }
    ];

    const result = catalog[Math.floor(Math.random() * catalog.length)];
    const confidence = (82 + Math.random() * 17).toFixed(1);
    els.scanState.textContent = "Scan complete.";
    
    els.aiResult.innerHTML = `
      <div style="animation: slideInUp 0.4s ease-out;">
        <h4>${result.emoji} ${result.name}</h4>
        <p><strong>Scientific:</strong> <em>${result.sci}</em></p>
        <p>${result.note}</p>
        <p><strong>Toxicity:</strong> <span class="muted">${result.toxicity}</span></p>
        <p><strong>Danger Level:</strong> <span class="${result.danger === 'Not dangerous' ? 'success' : 'warn'}">${result.danger}</span></p>
        <p><strong>Native Region:</strong> ${result.native}</p>
        <p><strong>Similar Species:</strong> Local variants and relatives</p>
        <p><strong>Confidence Score:</strong> <strong>${confidence}%</strong></p>
        <p><strong>Fun Fact:</strong> ForestPath notes this species appears most in ${['early morning', 'late afternoon', 'after rain', 'during spring'][Math.floor(Math.random() * 4)]}.</p>
      </div>
    `;
    
    // Award XP for scanning
    awardXP(25);
    showNotification(`📸 Species identified! +25 XP`);
  }, 1800);
}

function initCarousel() {
  const track = document.getElementById("carouselTrack");
  if (!track) return;

  const featured = trails.slice(0, 12);
  const template = document.getElementById("trailCardTemplate");

  featured.forEach((trail, idx) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.add("carousel-item");
    node.querySelector("h4").textContent = trail.title;
    node.querySelector(".meta").textContent = `${trail.region} · ★${trail.rating}`;
    node.querySelector(".desc").textContent = trail.aiDescription;

    const details = node.querySelector(".trail-details");
    [
      `${trail.distance} km · ${trail.time}`,
      `${trail.difficulty} · Elev. ${trail.elevation}m`,
    ].forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      details.append(li);
    });

    node.querySelector(".trail-image").style.background =
      `linear-gradient(120deg, rgba(53,242,170,0.2), rgba(115,168,255,0.22)), url('https://picsum.photos/seed/featured${trail.id}/400/240') center/cover`;
    node.querySelector(".walk-btn").addEventListener("click", () => startWalk(trail));

    track.append(node);
  });

  // Carousel navigation
  const prev = document.getElementById("carouselPrev");
  const next = document.getElementById("carouselNext");

  if (prev) prev.addEventListener("click", () => {
    track.scrollBy({ left: -300, behavior: "smooth" });
  });

  if (next) next.addEventListener("click", () => {
    track.scrollBy({ left: 300, behavior: "smooth" });
  });
}

function initInteractions() {
  [els.searchInput, els.regionFilter, els.difficultyFilter].forEach((el) => {
    el.addEventListener("input", applyFilters);
  });

  els.resetFilters.addEventListener("click", () => {
    els.searchInput.value = "";
    els.regionFilter.value = "all";
    els.difficultyFilter.value = "all";
    applyFilters();
  });

  els.locateBtn.addEventListener("click", locateUser);
  els.startWalkMode.addEventListener("click", () => startWalk());
  els.pauseWalk.addEventListener("click", () => {
    walkPaused = !walkPaused;
    els.pauseWalk.textContent = walkPaused ? "Resume" : "Pause";
  });
  els.closeWalk.addEventListener("click", stopWalk);
  els.randomAdventure.addEventListener("click", randomAdventure);
  els.analyzeBtn.addEventListener("click", analyzeImage);

  // Emergency SOS button handlers
  const sosButtons = document.querySelectorAll(".sos, .emergency-btn");
  sosButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const emergency = confirm("🚨 ACTIVATE EMERGENCY SOS?\n\nThis will:\n• Alert emergency services\n• Share your location\n• Notify emergency contacts\n\nConfirm?");
      if (emergency) {
        showNotification("🚨 Emergency SOS Activated! Help is on the way. Stay calm.");
      }
    });
  });

  // Smooth scroll and intersection observer for animations
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.animation = 'slideInUp 0.6s ease-out forwards';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.trail-card, .premium-card, .profile-card, .testimonial-card').forEach(el => {
      observer.observe(el);
    });
  }

  // Add smooth hover effects to interactive elements
  document.querySelectorAll('[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href !== '#') {
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

  els.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("night");
    els.themeToggle.textContent = document.body.classList.contains("night") ? "☀️ Day" : "🌙 Night";
  });

  els.audioToggle.addEventListener("click", async () => {
    if (ambienceNodes.length) {
      stopAmbience();
      return;
    }
    if (ambienceContext?.state === "suspended") await ambienceContext.resume();
    startAmbience();
  });

  window.addEventListener("mousemove", (ev) => {
    els.cursorGlow.style.left = `${ev.clientX}px`;
    els.cursorGlow.style.top = `${ev.clientY}px`;
  });
}

function init() {
  populateFilters();
  setMockWeather();
  renderFeed();
  applyFilters();
  recommendNearby(-37.8136, 144.9631);
  els.trailCount.textContent = trails.length.toLocaleString();
  updateXPDisplay();
  initCarousel();
}

init();
initInteractions();
