const STORAGE_KEY = "bandwidth_deadlines";
const COURSE_COLORS = ["#3E7CB1", "#4F9D6E", "#E3AE3C", "#E8823C", "#D6483C", "#8B6FB3"];

/* ---------------- data ---------------- */

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function seedData() {
  const seed = [
    ["CS101", "Quiz 1", 1, 2],
    ["MATH101", "Reading review", 4, 4],
    ["MATH101", "Problem set 1", 8, 5],
    ["PSY101", "Discussion post", 10, 2],
    ["ENG101", "Reading", 12, 2],
    ["CS205", "Database assignment", 14, 8],
    ["CS310", "ML lab", 15, 6],
    ["ENG101", "Presentation prep", 16, 5],
    ["MATH101", "Essay draft", 18, 8],
    ["CS310", "Lab report", 22, 5],
    ["PSY101", "Reading", 23, 2],
    ["MATH101", "Problem set 2", 25, 3],
    ["MATH101", "Problem set 3", 29, 5],
    ["ENG101", "Reading", 31, 3],
    ["CS205", "Midterm exam", 36, 10],
    ["CS310", "Project milestone", 37, 9],
    ["ENG101", "Lab report", 38, 6],
    ["PSY101", "Reading", 39, 3],
    ["MATH101", "Quiz 2", 40, 3],
    ["PSY101", "Reading", 43, 4],
    ["MATH101", "Problem set 4", 45, 6],
    ["CS205", "Assignment", 46, 5],
    ["ENG101", "Group check-in", 50, 3],
    ["CS310", "Reading", 51, 3],
    ["MATH101", "Discussion post", 53, 5],
    ["CS205", "Final project draft", 57, 10],
    ["CS310", "Presentation", 58, 6],
    ["MATH101", "Quiz 3", 59, 3],
    ["ENG101", "Reading", 61, 5]
  ];
  return seed.map((s) => ({ course: s[0], title: s[1], date: daysFromToday(s[2]), hours: s[3] }));
}

function loadDeadlines() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { return seedData(); }
  }
  const seeded = seedData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveDeadlines(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function courseColor(course) {
  let hash = 0;
  for (let i = 0; i < course.length; i++) hash = (hash * 31 + course.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[hash % COURSE_COLORS.length];
}

function colorFor(hours) {
  if (hours >= 30) return "var(--crunch)";
  if (hours >= 22) return "var(--high)";
  if (hours >= 14) return "var(--mid)";
  return "var(--low)";
}
function colorForHex(hours) {
  if (hours >= 30) return "#D6483C";
  if (hours >= 22) return "#E8823C";
  if (hours >= 14) return "#E3AE3C";
  return "#4F9D6E";
}
function levelLabel(hours) {
  if (hours >= 30) return "Critical load";
  if (hours >= 22) return "High load";
  if (hours >= 14) return "Moderate load";
  return "Light load";
}

function buildWeeks(deadlines) {
  if (deadlines.length === 0) return [];
  const semesterStart = getWeekStart(new Date());
  const buckets = {};
  deadlines.forEach((d) => {
    const wIndex = Math.round((getWeekStart(d.date) - semesterStart) / (7 * 86400000));
    if (!buckets[wIndex]) buckets[wIndex] = [];
    buckets[wIndex].push(d);
  });
  const maxIndex = Math.max(...Object.keys(buckets).map(Number), 8);
  const weeks = [];
  for (let i = 0; i <= maxIndex; i++) {
    const items = buckets[i] || [];
    const hours = items.reduce((sum, it) => sum + it.hours, 0);
    const start = new Date(semesterStart);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    weeks.push({ index: i, label: "Week " + (i + 1), hours, items, start, end });
  }
  return weeks;
}

/* ---------------- skyline chart ---------------- */

function smoothAreaPath(points, baseline) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x - 10} ${p.y} L ${p.x + 10} ${p.y}`;
  }
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    const midX = (p0.x + p1.x) / 2, midY = (p0.y + p1.y) / 2;
    line += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
  }
  line += ` T ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  const area = line + ` L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
  return { line, area };
}

function buildSkylineSVG(weeks, opts) {
  opts = opts || {};
  const W = 1000, H = opts.height || 260;
  const padTop = 34, padBottom = 26;
  const baseline = H - padBottom;
  const plotH = baseline - padTop;
  const xStart = 16, xEnd = W - 16;
  const maxHours = Math.max(...weeks.map((w) => w.hours), 1);

  const points = weeks.map((w, i) => {
    const x = weeks.length === 1 ? (xStart + xEnd) / 2 : xStart + (i * (xEnd - xStart)) / (weeks.length - 1);
    const y = baseline - (w.hours / maxHours) * plotH;
    return { x, y, week: w };
  });

  const gradId = "grad-" + Math.random().toString(36).slice(2, 8);
  const stops = points
    .map((p) => {
      const offset = ((p.x - xStart) / (xEnd - xStart)) * 100;
      return `<stop offset="${offset.toFixed(1)}%" stop-color="${colorForHex(p.week.hours)}" />`;
    })
    .join("");

  const paths = smoothAreaPath(points, baseline);
  const areaD = typeof paths === "string" ? "" : paths.area;
  const lineD = typeof paths === "string" ? paths : paths.line;

  const peak = weeks.reduce((a, b) => (b.hours > a.hours ? b : a), weeks[0]);
  const peakPoint = points.find((p) => p.week.index === peak.index);

  let peakMarkup = "";
  if (peakPoint && peak.hours > 0) {
    const labelW = 92;
    let lx = peakPoint.x - labelW / 2;
    lx = Math.max(6, Math.min(W - labelW - 6, lx));
    peakMarkup = `
      <line x1="${peakPoint.x}" y1="${peakPoint.y}" x2="${peakPoint.x}" y2="${baseline}" stroke="${colorForHex(peak.hours)}" stroke-width="1.4" stroke-dasharray="3 3" opacity="0.6" />
      <circle cx="${peakPoint.x}" cy="${peakPoint.y}" r="5" fill="${colorForHex(peak.hours)}" stroke="#fff" stroke-width="2" />
      <g>
        <rect x="${lx}" y="${Math.max(2, peakPoint.y - 34)}" width="${labelW}" height="26" rx="7" fill="${colorForHex(peak.hours)}" />
        <text x="${lx + labelW / 2}" y="${Math.max(2, peakPoint.y - 34) + 17}" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="700" font-size="11" fill="#fff">${peak.label} · ${peak.hours}h</text>
      </g>`;
  }

  const hits = points
    .map((p, i) => {
      const step = points.length > 1 ? (xEnd - xStart) / (points.length - 1) : xEnd - xStart;
      const rectX = p.x - step / 2;
      const titleText = `${p.week.label}: ${p.week.hours}h, ${p.week.items.length} deadline${p.week.items.length === 1 ? "" : "s"}`;
      return `<rect class="week-hit" data-index="${p.week.index}" x="${rectX}" y="0" width="${step}" height="${H}" fill="transparent">${opts.interactive ? `<title>${titleText}</title>` : ""}</rect>`;
    })
    .join("");

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0">${stops}</linearGradient>
      </defs>
      <line x1="${xStart}" y1="${baseline}" x2="${xEnd}" y2="${baseline}" stroke="var(--border)" stroke-width="1" />
      ${areaD ? `<path d="${areaD}" class="skyline-area-path" fill="url(#${gradId})" fill-opacity="0.32" />` : ""}
      <path d="${lineD}" class="skyline-line-path" fill="none" stroke="url(#${gradId})" stroke-width="3" stroke-linecap="round" />
      ${opts.showPeak !== false ? `<g class="skyline-peak" style="transform-box:fill-box;transform-origin:center;">${peakMarkup}</g>` : ""}
      ${opts.interactive ? hits : ""}
    </svg>`;

  const monthLabels = [];
  let lastMonth = null;
  points.forEach((p) => {
    const m = p.week.start.toLocaleDateString(undefined, { month: "short" });
    if (m !== lastMonth) {
      monthLabels.push({ label: m, xPercent: ((p.x - xStart) / (xEnd - xStart)) * 100 });
      lastMonth = m;
    }
  });

  return { svg, monthLabels };
}

function animateSkyline(container) {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const linePath = container.querySelector(".skyline-line-path");
  if (!linePath || reduceMotion) return;
  const areaPath = container.querySelector(".skyline-area-path");
  const peakGroup = container.querySelector(".skyline-peak");
  const len = linePath.getTotalLength();

  linePath.style.strokeDasharray = len;
  linePath.style.strokeDashoffset = len;
  if (areaPath) areaPath.style.opacity = "0";
  if (peakGroup) { peakGroup.style.opacity = "0"; peakGroup.style.transform = "scale(0.85)"; }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      linePath.style.transition = "stroke-dashoffset 900ms ease-out";
      linePath.style.strokeDashoffset = "0";
      if (areaPath) {
        areaPath.style.transition = "opacity 800ms ease-out 150ms";
        areaPath.style.opacity = "1";
      }
      if (peakGroup) {
        peakGroup.style.transition = "opacity 450ms ease-out 650ms, transform 450ms ease-out 650ms";
        peakGroup.style.opacity = "1";
        peakGroup.style.transform = "scale(1)";
      }
    });
  });
}

function renderSkylineInto(containerId, labelsId, weeks, opts) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const { svg, monthLabels } = buildSkylineSVG(weeks, opts);
  container.innerHTML = svg;
  animateSkyline(container);

  if (opts.interactive) {
    container.querySelectorAll(".week-hit").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-index"));
        const week = weeks.find((w) => w.index === idx);
        if (week) renderWeekDetail(week, weeks);
      });
    });
  }

  const labelsEl = document.getElementById(labelsId);
  if (labelsEl) {
    labelsEl.innerHTML = monthLabels
      .map((m) => `<span style="left:${m.xPercent}%">${m.label}</span>`)
      .join("");
  }
}

/* ---------------- stats ---------------- */

function renderStats(deadlines, weeks) {
  const totalEl = document.getElementById("stat-total");
  if (!totalEl) return;
  const highWeeks = weeks.filter((w) => w.hours >= 22).length;
  const nonEmptyWeeks = weeks.filter((w) => w.hours > 0);
  const avg = nonEmptyWeeks.length ? Math.round(nonEmptyWeeks.reduce((s, w) => s + w.hours, 0) / nonEmptyWeeks.length) : 0;
  const peak = weeks.reduce((a, b) => (b.hours > a.hours ? b : a), weeks[0] || { hours: 0, label: "–" });

  document.getElementById("stat-total").textContent = "0";
  animateCount(document.getElementById("stat-total"), deadlines.length);
  animateCount(document.getElementById("stat-highweeks"), highWeeks);
  animateCount(document.getElementById("stat-avg"), avg, "h");
  document.getElementById("stat-peak").textContent = peak.hours > 0 ? peak.label : "–";
  const peakSub = document.getElementById("stat-peak-sub");
  if (peakSub && peak.hours > 0) animateCount(peakSub, peak.hours, "h");
  else if (peakSub) peakSub.textContent = "";
}

/* ---------------- week detail ---------------- */

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildSuggestion(week, weeks) {
  if (week.hours === 0) return "Nothing due this week — a good stretch to get ahead on upcoming work.";
  if (week.hours < 22) return null;
  const prev = weeks.find((w) => w.index === week.index - 1);
  const largest = [...week.items].sort((a, b) => b.hours - a.hours)[0];
  if (prev && prev.hours < week.hours - 4) {
    return `Start <strong>${largest.title}</strong> (${largest.course}) early. ${prev.label} is significantly lighter, so getting a few hours done ahead of time will ease this week.`;
  }
  return `This is a heavy week — <strong>${largest.title}</strong> (${largest.course}) is the biggest single piece at ${largest.hours}h. Consider blocking time for it early in the week.`;
}

function renderWeekDetail(week, weeks) {
  const el = document.getElementById("week-detail");
  if (!el) return;
  const col = colorForHex(week.hours);
  const maxItemHours = Math.max(...week.items.map((it) => it.hours), 1);

  const bars = week.items
    .slice()
    .sort((a, b) => b.hours - a.hours)
    .map(
      (it, i) => `
      <div class="load-bar-row">
        <div class="load-bar-top"><span class="name">${it.title} <span style="color:var(--muted)">(${it.course})</span></span><span class="hrs">${it.hours}h</span></div>
        <div class="load-bar-track"><div class="load-bar-fill js-bar" data-width="${(it.hours / maxItemHours) * 100}" data-delay="${i * 60}" style="width:0%;background:${colorForHex(it.hours)}"></div></div>
      </div>`
    )
    .join("");

  const suggestion = buildSuggestion(week, weeks);

  el.innerHTML = `
    <div class="week-detail-head">
      <h3>${week.label}</h3>
      <span class="load-badge" style="background:${col}">${levelLabel(week.hours)}</span>
    </div>
    <p class="week-detail-range">${fmtDate(week.start)} – ${fmtDate(week.end)}</p>
    <div class="week-detail-nums">
      <div><p class="num">${week.hours}h</p><p class="num-label">estimated effort</p></div>
      <div><p class="num">${week.items.length}</p><p class="num-label">deadline${week.items.length === 1 ? "" : "s"}</p></div>
    </div>
    ${bars || '<p style="font-size:13px;color:var(--muted);margin:0 0 6px;">Nothing due this week.</p>'}
    ${suggestion ? `<div class="suggestion-box"><span class="bulb">💡</span><span>${suggestion}</span></div>` : ""}
  `;

  el.querySelectorAll(".js-bar").forEach((bar) => {
    const target = bar.dataset.width;
    const delay = Number(bar.dataset.delay || 0);
    requestAnimationFrame(() => {
      setTimeout(() => { bar.style.width = target + "%"; }, delay);
    });
  });
}

/* ---------------- upcoming list ---------------- */

function renderCourseLegend(deadlines) {
  const el = document.getElementById("course-legend");
  if (!el) return;
  const courses = [...new Set(deadlines.map((d) => d.course))].sort();
  if (courses.length === 0) { el.innerHTML = ""; return; }
  el.innerHTML = courses
    .map((c) => `<span class="legend-chip"><span class="dot" style="background:${courseColor(c)}"></span>${c}</span>`)
    .join("");
}

function renderDeadlinesList(deadlines) {
  const list = document.getElementById("deadlines-list");
  if (!list) return;
  list.innerHTML = "";
  const sorted = [...deadlines].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 7);
  if (sorted.length === 0) {
    list.innerHTML = '<p style="font-size:13px;color:var(--muted);margin:0;">No deadlines yet.</p>';
    return;
  }
  sorted.forEach((d) => {
    const row = document.createElement("div");
    row.className = "deadline-row";
    const dateStr = new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    row.innerHTML = `
      <div>
        <p class="deadline-title"><span class="dot" style="background:${courseColor(d.course)}"></span>${d.title}</p>
        <p class="deadline-sub">${d.course} · ${dateStr} · ${d.hours}h</p>
      </div>
      <button class="delete-btn" aria-label="Remove">Remove</button>`;
    row.querySelector(".delete-btn").addEventListener("click", () => {
      const all = loadDeadlines();
      const idx = all.findIndex((x) => x.course === d.course && x.title === d.title && x.date === d.date);
      if (idx > -1) all.splice(idx, 1);
      saveDeadlines(all);
      renderDashboard();
    });
    list.appendChild(row);
  });
}

/* ---------------- scroll animations (reveal + count-up) ---------------- */

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setupScrollReveal() {
  const els = document.querySelectorAll(".reveal");
  if (els.length === 0) return;
  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  els.forEach((el) => io.observe(el));
}

function animateCount(el, target, suffix) {
  suffix = suffix || "";
  if (prefersReducedMotion()) {
    el.textContent = target + suffix;
    return;
  }
  const duration = 800;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function setupCountUp() {
  const els = document.querySelectorAll(".count-up");
  if (els.length === 0) return;
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => animateCount(el, Number(el.dataset.target), el.dataset.suffix));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target, Number(entry.target.dataset.target), entry.target.dataset.suffix);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------------- page renderers ---------------- */

function renderDashboard() {
  const chartEl = document.getElementById("chart");
  if (!chartEl) return;
  const deadlines = loadDeadlines();
  const weeks = buildWeeks(deadlines);

  renderStats(deadlines, weeks);
  renderDeadlinesList(deadlines);
  renderCourseLegend(deadlines);

  if (weeks.length === 0) {
    document.getElementById("week-detail").innerHTML =
      '<p style="font-size:13px;color:var(--muted);margin:0;">Add a deadline to see your workload skyline.</p>';
    return;
  }

  renderSkylineInto("chart", "chart-labels", weeks, { interactive: true, height: 240 });
  const peak = weeks.reduce((a, b) => (b.hours > a.hours ? b : a), weeks[0]);
  renderWeekDetail(peak, weeks);
}

function renderHomePreview() {
  const el = document.getElementById("home-chart");
  if (!el) return;
  const deadlines = loadDeadlines();
  const weeks = buildWeeks(deadlines);
  if (weeks.length === 0) return;
  renderSkylineInto("home-chart", "home-chart-labels", weeks, { interactive: false, height: 300 });
}

/* ---------------- modal + form ---------------- */

function setupModal() {
  const overlay = document.getElementById("modal-overlay");
  if (!overlay) return;
  const openBtn = document.getElementById("open-add-modal");
  const closeBtn = document.getElementById("close-add-modal");
  const cancelBtn = document.getElementById("cancel-add-modal");
  const form = document.getElementById("add-form");

  const open = () => overlay.classList.add("open");
  const close = () => {
    overlay.classList.remove("open");
    document.getElementById("form-error").textContent = "";
    form.reset();
  };

  if (openBtn) openBtn.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (cancelBtn) cancelBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const course = document.getElementById("f-course").value.trim();
    const title = document.getElementById("f-title").value.trim();
    const date = document.getElementById("f-date").value;
    const hours = parseFloat(document.getElementById("f-hours").value);

    if (!course || !title || !date || !hours || hours <= 0) {
      document.getElementById("form-error").textContent = "Fill in every field with a valid effort in hours.";
      return;
    }

    const all = loadDeadlines();
    all.push({ course, title, date, hours });
    saveDeadlines(all);
    close();
    renderDashboard();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
  renderHomePreview();
  setupModal();
  setupScrollReveal();
  setupCountUp();
});
