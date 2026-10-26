document.addEventListener("DOMContentLoaded", () => {
  const qmsChannel = new BroadcastChannel('qms_sync_channel');

  // Database containing Introduction and Problem Archetypes
  const problemDatabase = {
    "introduction": {
      type: "intro",
      title: "Course Introduction",
      modelName: "Course Overview",
      content: `
        <div class="intro-container">
          <h1>Quantitative Methods Companion (QMC)</h1>
          <p>Welcome to the QuantMethods Companion. This platform is designed to bridge the gap between descriptive, narrative business scenarios and rigorous mathematical problem-solving.</p>
          
          <h2>The Art of Quantitative Modeling</h2>
          <p>In operational research and management science, the most challenging step is rarely the arithmetic calculation—it is the translation of unstructured business realities into precise mathematical structures. QMC focuses heavily on this formulation phase.</p>

          <h2>How to Use This Companion</h2>
          <ul>
            <li><strong>Explore Problem Archetypes:</strong> Navigate through models using the sidebar catalog to examine standardized business challenges.</li>
            <li><strong>Analyze the 3-Part Framework:</strong> Review the Real-World Description (Part 1), Managerial Analysis & Key Elements (Part 2), and Problem Formulation (Part 3).</li>
            <li><strong>Live Solver Integration:</strong> Use the direct launch buttons in Part 3 to stream models instantly into the companion QMS Solver engine across browser tabs.</li>
          </ul>

          <h2>Classroom Presentation</h2>
          <p>Designed for both in-person projection and remote web instruction, QMC provides clean, lecture-ready formatting that eliminates the need for separate slide decks.</p>
        </div>
      `
    },
    "ad-mix-a": {
      type: "problem",
      title: "Advertising mix – A",
      modelName: "Linear Programming",
      summary: "A classic resource allocation model balancing local reach, budget caps, and structural media ratios.",
      part1: "A local retail business relies on local newspaper and radio advertising to drive customer acquisition and monthly sales revenue. Because radio broadcasting carries a significantly higher cost per spot, management enforces a strict policy requiring that the number of newspaper advertisements placed each month must be at least three times the number of radio advertisements. Total advertising expenditures are capped at a maximum of $2,000 per month. Historical marketing data indicates that each newspaper ad generates an average of $180 in sales revenue, whereas each radio ad generates $700. Newspaper ads cost $50 each to place, and radio ads cost $500 each. Management wants to determine the optimal advertising mix that maximizes total sales revenue subject to budget and ratio constraints.",
      part2: "<ul><li><strong>Decision Trade-off:</strong> High-yield radio spots ($700 revenue / $500 cost) versus low-cost, high-volume newspaper placements ($180 revenue / $50 cost).</li><li><strong>Binding Policy Constraints:</strong> The structural ratio (X₁ ≥ 3X₂) forces a minimum floor on newspaper presence, preventing management from exclusively buying radio spots despite their higher individual return.</li><li><strong>Resource Bottleneck:</strong> The $2,000 monthly cash flow ceiling restricts maximum portfolio scaling.</li></ul>",
      formulation: "Maximize Objective: Z = 180X₁ + 700X₂<br>Subject to:<br>&bull; Budget Constraint: 50X₁ + 500X₂ ≤ 2000<br>&bull; Ratio Constraint: X₁ - 3X₂ ≥ 0<br>&bull; Non-negativity: X₁, X₂ ≥ 0",
      payload: {
        "qmsHeader": { "version": "2.0", "modelId": "LINEAR_PROGRAMMING", "title": "Advertising mix – A", "savedAt": new Date().toISOString() },
        "payload": {
          "objectiveType": "MAXIMIZE", "objectiveName": "Z",
          "variables": [{ "id": "v0", "name": "X 1" }, { "id": "v1", "name": "X 2" }],
          "objectiveCoefficients": [180, 700],
          "constraints": [
            { "name": "BudgetLimit", "coefficients": [50, 500], "operator": "LTE", "rhs": 2000 },
            { "name": "AdvertisingRatio", "coefficients": [1, -3], "operator": "GTE", "rhs": 0 }
          ]
        }
      }
    },
    "ad-mix-b": {
      type: "problem",
      title: "Advertising mix – B",
      modelName: "Linear Programming",
      summary: "Advanced multi-channel media selection incorporating television, print, and digital banner constraints.",
      part1: "An expanded regional distributor incorporates television spots alongside print and digital channels. Budget caps are increased to $10,000, and minimum reach quotas require at least 50 total spots across all channels combined.",
      part2: "<ul><li><strong>Channel Diversification:</strong> Balancing high-cost television reach with low-cost digital impressions.</li><li><strong>Quota Enforcement:</strong> Minimum exposure constraints guarantee brand visibility across all demographics.</li></ul>",
      formulation: "Maximize Objective: Z = 400X₁ + 150X₂ + 80X₃<br>Subject to:<br>&bull; Total Budget: 1000X₁ + 300X₂ + 100X₃ ≤ 10000<br>&bull; Minimum Reach: X₁ + X₂ + X₃ ≥ 50",
      payload: {
        "qmsHeader": { "version": "2.0", "modelId": "LINEAR_PROGRAMMING", "title": "Advertising mix – B", "savedAt": new Date().toISOString() },
        "payload": {
          "objectiveType": "MAXIMIZE", "objectiveName": "Z",
          "variables": [{ "id": "v0", "name": "TV" }, { "id": "v1", "name": "Print" }, { "id": "v2", "name": "Digital" }],
          "objectiveCoefficients": [400, 150, 80],
          "constraints": [
            { "name": "Budget", "coefficients": [1000, 300, 100], "operator": "LTE", "rhs": 10000 },
            { "name": "MinReach", "coefficients": [1, 1, 1], "operator": "GTE", "rhs": 50 }
          ]
        }
      }
    }
  };

  let activeKey = "introduction";
  const navDrawerWrapper = document.getElementById("nav-drawer-wrapper");
  const submenuFlyout = document.getElementById("submenu-flyout");
  const workbenchContent = document.getElementById("workbench-content-area");
  const bcModel = document.getElementById("bc-model");

  // Render Initial View (Introduction)
  renderActiveView(activeKey);

  function renderActiveView(key) {
    const data = problemDatabase[key];
    if (!data) return;

    if (data.type === "intro") {
      bcModel.textContent = data.title;
      workbenchContent.innerHTML = data.content;
    } else {
      bcModel.textContent = `${data.modelName} / ${data.title}`;
      workbenchContent.innerHTML = `
        <div class="archetype-intro-card">
          <h1>${data.title}</h1>
          <p>${data.summary}</p>
        </div>

        <article class="qmc-part-card">
          <div class="part-header"><h2>Problem Description</h2></div>
          <div class="part-body"><p>${data.part1}</p></div>
        </article>

        <article class="qmc-part-card">
          <div class="part-header"><h2>Managerial Analysis & Key Elements</h2></div>
          <div class="part-body">${data.part2}</div>
        </article>

        <article class="qmc-part-card formulation-card">
          <div class="part-header"><h2>Problem Formulation & QMS Integration</h2></div>
          <div class="part-body">
            <div class="math-block">${data.formulation}</div>
            <div class="action-toolbar">
              <button id="launch-qms-btn" class="btn-primary">🚀 Launch Model in QMS Solver</button>
              <button id="toggle-json-btn" class="btn-text">[ ⚙️ Inspect qms.json Payload ]</button>
            </div>
            <div id="json-drawer" class="json-drawer" style="display: none;">
              <pre><code>${JSON.stringify(data.payload, null, 2)}</code></pre>
            </div>
          </div>
        </article>
      `;

      // Attach event listeners for the dynamically rendered problem view
      document.getElementById("launch-qms-btn").addEventListener("click", () => {
        qmsChannel.postMessage({ type: 'LOAD_MODEL', payload: data.payload });
        window.open('../QMS/qms/index.html?autoLoad=true', '_blank');
      });

      document.getElementById("toggle-json-btn").addEventListener("click", () => {
        const jsonDrawer = document.getElementById("json-drawer");
        jsonDrawer.style.display = jsonDrawer.style.display === "none" ? "block" : "none";
      });
    }
  }

  // 1. Introduction Navigation Handler
  document.querySelector("[data-view='introduction']").addEventListener("click", (e) => {
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    e.target.classList.add("active");
    submenuFlyout.style.display = "none";
    activeKey = "introduction";
    renderActiveView(activeKey);
    navDrawerWrapper.classList.add("collapsed"); // Slide away trays for clean reading
  });

  // 2. Linear Programming Model Click -> Toggles Submenu Flyout
  const lpBtn = document.getElementById("lp-model-btn");
  lpBtn.addEventListener("click", (e) => {
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    e.target.classList.add("active");
    
    // Toggle submenu visibility
    if (submenuFlyout.style.display === "none" || submenuFlyout.style.display === "") {
      submenuFlyout.style.display = "flex";
    } else {
      submenuFlyout.style.display = "none";
    }
  });

  // 3. Problem Link Clicks from Submenu
  const problemLinks = document.querySelectorAll(".problem-link");
  problemLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      const problemKey = e.target.getAttribute("data-problem");
      if (!problemDatabase[problemKey]) {
        alert("This problem content is currently in development.");
        return;
      }

      problemLinks.forEach(l => l.classList.remove("active"));
      e.target.classList.add("active");
      activeKey = problemKey;
      renderActiveView(activeKey);

      // Collapse trays to give full screen width to workbench
      navDrawerWrapper.classList.add("collapsed");
    });
  });

  // 4. Hamburger Toggle for Trays
  document.getElementById("sidebar-toggle").addEventListener("click", () => {
    navDrawerWrapper.classList.toggle("collapsed");
  });

  // 5. Theme Customizer Modal Logic
  const themeModal = document.getElementById("theme-modal");
  document.getElementById("theme-btn").addEventListener("click", () => {
    themeModal.style.display = "flex";
  });
  document.getElementById("close-modal-btn").addEventListener("click", () => {
    themeModal.style.display = "none";
  });

  const rootElement = document.documentElement;
  const customHexPicker = document.getElementById("custom-hex");

  function applyPrimaryColor(hexColor) {
    rootElement.style.setProperty('--qmc-primary', hexColor);
    localStorage.setItem('qmc_primary_color', hexColor);
  }

  const savedColor = localStorage.getItem('qmc_primary_color');
  if (savedColor) {
    applyPrimaryColor(savedColor);
    customHexPicker.value = savedColor;
  }

  customHexPicker.addEventListener("input", (e) => {
    applyPrimaryColor(e.target.value);
  });

  document.querySelectorAll(".preset-chip").forEach(button => {
    button.addEventListener("click", (e) => {
      const color = e.target.getAttribute("data-color");
      applyPrimaryColor(color);
      customHexPicker.value = color;
    });
  });
});