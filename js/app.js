(() => {
  "use strict";

  const CUSTOM_LABELS = {
    poemURL: "Poem ID", title: "Title", ratio: "Verb Percentage",
    verbCount: "Verb Count", wordCount: "Word Count",
    present: "Present", preterite: "Preterite", future: "Future",
    imperfect: "Imperfect", conditional: "Conditional", perfect: "Perfect",
    pluperfect: "Pluperfect", "future perfect": "Future Perfect",
    "conditional perfect": "Conditional Perfect",
    "anterior preterite": "Anterior Preterite",
    "present subjunctive": "Present Subjunctive",
    "imperfect subjunctive": "Imperfect Subjunctive",
    "future subjunctive": "Future Subjunctive",
    "perfect subjunctive": "Perfect Subjunctive",
    "pluperfect subjunctive": "Pluperfect Subjunctive",
    "subjunctive future perfect": "Subjunctive Future Perfect",
    indicative: "Indicative", subjunctive: "Subjunctive",
    regular: "Regular", irregular: "Irregular", infinitive: "Infinitive",
    beginner: "Beginner", intermediate: "Intermediate",
    advanced: "Advanced", expert: "Expert",
  };

  const Y_COLUMNS = [
    "ratio", "verbCount", "wordCount", "present", "preterite", "future",
    "imperfect", "conditional", "perfect", "pluperfect", "future perfect",
    "conditional perfect", "anterior preterite", "present subjunctive",
    "imperfect subjunctive", "future subjunctive", "perfect subjunctive",
    "pluperfect subjunctive", "subjunctive future perfect", "indicative",
    "subjunctive", "regular", "irregular", "infinitive",
  ];

  const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

  const label = (col) => CUSTOM_LABELS[col] || col;

  let ALL_DATA = [];
  let currentFiltered = []; // keeps the exact array behind the last render, for click lookup

  const els = {
    x: document.getElementById("x-select"),
    y: document.getElementById("y-select"),
    level: document.getElementById("level-select"),
    nationality: document.getElementById("nationality-select"),
    reset: document.getElementById("reset-btn"),
    chart: document.getElementById("chart"),
    detail: document.getElementById("detail-panel"),
    wordReadout: document.getElementById("wordcount-readout"),
    yearsReadout: document.getElementById("years-readout"),
    chartHint: document.getElementById("chart-hint"),
  };

  // ── Dual-range slider (two overlapping native range inputs) ─────────

  function makeDualSlider(containerId, { min, max, step, onChange }) {
    const el = document.getElementById(containerId);
    const minInput = el.querySelector(".dual-slider-min");
    const maxInput = el.querySelector(".dual-slider-max");
    const rangeBar = el.querySelector(".dual-slider-range");

    [minInput, maxInput].forEach((input) => {
      input.min = min;
      input.max = max;
      input.step = step;
    });
    minInput.value = min;
    maxInput.value = max;

    function paint() {
      let lo = Number(minInput.value);
      let hi = Number(maxInput.value);
      if (lo > hi) { [lo, hi] = [hi, lo]; }
      const pctLo = ((lo - min) / (max - min)) * 100;
      const pctHi = ((hi - min) / (max - min)) * 100;
      rangeBar.style.left = pctLo + "%";
      rangeBar.style.width = (pctHi - pctLo) + "%";
      return [lo, hi];
    }

    function handleInput() {
      const [lo, hi] = paint();
      onChange(lo, hi);
    }

    minInput.addEventListener("input", handleInput);
    maxInput.addEventListener("input", handleInput);
    paint();

    return {
      reset() {
        minInput.value = min;
        maxInput.value = max;
        const [lo, hi] = paint();
        onChange(lo, hi);
      },
      getRange() {
        let lo = Number(minInput.value), hi = Number(maxInput.value);
        if (lo > hi) [lo, hi] = [hi, lo];
        return [lo, hi];
      },
    };
  }

  let wordSlider, yearSlider;

  // ── Populate static controls ─────────────────────────────────────

  function populateControls(data) {
    Y_COLUMNS.forEach((col) => {
      const opt = document.createElement("option");
      opt.value = col;
      opt.textContent = label(col);
      els.y.appendChild(opt);
    });
    els.y.value = "ratio";

    LEVELS.forEach((lvl) => {
      const opt = document.createElement("option");
      opt.value = lvl;
      opt.textContent = label(lvl);
      els.level.appendChild(opt);
    });

    const nationalities = new Set();
    data.forEach((row) => {
      (row.nationality || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((n) => nationalities.add(n));
    });
    [...nationalities].sort().forEach((nat) => {
      const opt = document.createElement("option");
      opt.value = nat;
      opt.textContent = nat;
      els.nationality.appendChild(opt);
    });

    const wordCounts = data.map((r) => r.wordCount).filter((v) => v != null);
    const minWords = Math.floor(Math.min(...wordCounts));
    const maxWords = Math.ceil(Math.max(...wordCounts));

    const deaths = data.map((r) => r.death).filter((v) => v != null);
    const minYear = Math.floor(Math.min(...deaths) / 100) * 100;
    const maxYear = Math.ceil(Math.max(...deaths) / 100) * 100;

    wordSlider = makeDualSlider("wordcount-slider", {
      min: minWords, max: maxWords, step: 50,
      onChange: (lo, hi) => {
        els.wordReadout.textContent = `${lo} – ${hi}`;
        renderChart();
      },
    });
    els.wordReadout.textContent = `${minWords} – ${maxWords}`;

    yearSlider = makeDualSlider("years-slider", {
      min: minYear, max: maxYear, step: 25,
      onChange: (lo, hi) => {
        els.yearsReadout.textContent = `${lo} – ${hi}`;
        renderChart();
      },
    });
    els.yearsReadout.textContent = `${minYear} – ${maxYear}`;
  }

  // ── Filtering + chart render ─────────────────────────────────────

  function getTopN() {
    const checked = document.querySelector('input[name="topn"]:checked');
    return checked ? Number(checked.value) : 25;
  }

  function applyFilters() {
    const [wLo, wHi] = wordSlider.getRange();
    const [yLo, yHi] = yearSlider.getRange();
    const level = els.level.value;
    const nationality = els.nationality.value;
    const yCol = els.y.value;

    let rows = ALL_DATA.filter((r) => {
      if (r.wordCount == null || r.wordCount < wLo || r.wordCount > wHi) return false;
      if (r.death == null || r.death < yLo || r.death > yHi) return false;
      if (level && !(r.level || "").toLowerCase().includes(level.toLowerCase())) return false;
      if (nationality && !(r.nationality || "").toLowerCase().includes(nationality.toLowerCase())) return false;
      if (r[yCol] == null) return false;
      return true;
    });

    rows.sort((a, b) => b[yCol] - a[yCol]);
    return rows.slice(0, getTopN());
  }

  function renderChart() {
    const xCol = els.x.value;
    const yCol = els.y.value;
    currentFiltered = applyFilters();

    const trace = {
      x: currentFiltered.map((r) => r[xCol]),
      y: currentFiltered.map((r) => r[yCol]),
      mode: "markers",
      type: "scatter",
      marker: {
        color: "#b98a3d",
        size: 9,
        line: { color: "#eae0c8", width: 0.5 },
      },
      hovertemplate: `%{x}<br>${label(yCol)}: %{y}<extra></extra>`,
    };

    const layout = {
      title: {
        text: `Top ${getTopN()} by ${label(yCol)}`,
        font: { family: "Fraunces, serif", size: 20, color: "#eae0c8" },
      },
      paper_bgcolor: "transparent",
      plot_bgcolor: "transparent",
      font: { family: "IBM Plex Mono, monospace", size: 11, color: "#a89b7d" },
      xaxis: { title: label(xCol), gridcolor: "#3a3126", zerolinecolor: "#3a3126" },
      yaxis: { title: label(yCol), gridcolor: "#3a3126", zerolinecolor: "#3a3126" },
      margin: { t: 60, r: 30, b: 70, l: 60 },
    };

    Plotly.react(els.chart, [trace], layout, { responsive: true, displaylogo: false });
  }

  // ── Click → detail panel ─────────────────────────────────────────

  function attachClickHandler() {
    els.chart.on("plotly_click", (ev) => {
      const idx = ev.points[0].pointIndex;
      const row = currentFiltered[idx];
      if (row) showDetail(row);
    });
  }

  async function showDetail(row) {
    const stats = [
      ["Author", row.author],
      ["Nationality", row.nationality],
      ["Born", row.birth],
      ["Died", row.death],
      ["Word count", row.wordCount],
      ["Verb count", row.verbCount],
      ["Verb %", row.ratio != null ? Number(row.ratio).toFixed(1) : null],
    ].filter(([, v]) => v != null && v !== "");

    els.detail.innerHTML = `
      <div class="detail-header">
        <h2 class="detail-title">${escapeHtml(row.title || row.poemURL)}</h2>
        <span class="detail-byline">${escapeHtml(row.author || "Unknown author")}</span>
      </div>
      <div class="detail-stats">
        ${row.level ? `<span class="level-tag">${escapeHtml(label(row.level))}</span>` : ""}
        ${stats.map(([k, v]) => `<span><strong>${k}:</strong> ${escapeHtml(String(v))}</span>`).join("")}
      </div>
      <div class="poem-loading">Loading poem text…</div>
    `;
    els.detail.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const loadingEl = els.detail.querySelector(".poem-loading");
    try {
      const res = await fetch(`data/poems/${encodeURIComponent(row.poemURL)}.txt`);
      if (!res.ok) throw new Error("not found");
      const text = await res.text();
      loadingEl.outerHTML = `<div class="poem-text">${escapeHtml(text)}</div>`;
    } catch (err) {
      loadingEl.outerHTML = `<div class="poem-error">Couldn't load this poem's text (${escapeHtml(row.poemURL)}.txt).</div>`;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Wiring ────────────────────────────────────────────────────────

  function attachControlListeners() {
    els.x.addEventListener("change", renderChart);
    els.y.addEventListener("change", renderChart);
    els.level.addEventListener("change", renderChart);
    els.nationality.addEventListener("change", renderChart);
    document.querySelectorAll('input[name="topn"]').forEach((r) =>
      r.addEventListener("change", renderChart)
    );

    els.reset.addEventListener("click", () => {
      els.x.value = "poemURL";
      els.y.value = "ratio";
      els.level.value = "";
      els.nationality.value = "";
      document.querySelector('input[name="topn"][value="25"]').checked = true;
      wordSlider.reset();
      yearSlider.reset();
      els.detail.innerHTML = `<p class="detail-empty">Nothing selected yet — choose a point on the chart above.</p>`;
      renderChart();
    });
  }

  async function init() {
    els.chartHint.textContent = "Loading corpus…";
    try {
      const res = await fetch("data/metadata.json");
      ALL_DATA = await res.json();
    } catch (err) {
      els.chartHint.textContent =
        "Couldn't load data/metadata.json — make sure you've run export_data.py and committed the data/ folder.";
      return;
    }

    populateControls(ALL_DATA);
    attachControlListeners();
    renderChart();
    attachClickHandler();
    els.chartHint.textContent = "Select any point to read the poem below.";
  }

  document.addEventListener("DOMContentLoaded", init);
})();
