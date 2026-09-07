# TempoMind

**TempoMind** is a minimal, privacy-focused web application designed to help students, developers, and researchers track study sessions, monitor attention spans, and log friction points during deep work.

Instead of just timing sessions, TempoMind prompts you at the exact moment of interruption to capture *why* you stopped—helping you uncover distraction patterns and optimize your cognitive focus over time.

---

## Key Features

* **Session Timing:** Precision timing using system timestamps (`Date.now()`) to ensure accuracy even if browser tabs are backgrounded or throttled.
* **Friction & State Logging:** Post-session modal captures qualitative notes, emotional state, or specific root causes for unexpected breaks.
* **Data Visualization:** Built-in dynamic chart powered by Chart.js displaying session duration history across recent study blocks.
* **100% Local & Private:** All data remains strictly inside your browser's `localStorage`. No user accounts, database setups, or remote servers required.
* **Minimalist & Responsive Interface:** Dark, distraction-free aesthetic designed for long sessions without causing eye strain.

---

## Tech Stack

* **Frontend:** HTML5, CSS3 (CSS Variables, Flexbox/Grid)
* **Logic:** Vanilla JavaScript (ES6+)
* **Charting:** [Chart.js](https://www.chartjs.org/) (via CDN)
* **Storage:** Browser `localStorage` API

---

tempomind/
│
├── index.html     # Application structure, layouts, and modal windows
├── styles.css     # Dark mode theme styling, layout variables, and components
├── app.js         # Timer logic, LocalStorage integration, and Chart.js rendering
└── README.md      # Documentation
