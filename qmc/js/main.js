import { StorageManager } from "./storageManager.js";
// Complete QMS-aligned catalog structure with all historical model ID aliases for manifest matching
const MODEL_GROUPS = [
    {
        groupName: "Mathematical Programming",
        models: [
            { id: "linear-programming", aliases: ["linear-programming", "LINEAR_PROGRAMMING"], name: "Linear Programming" },
            { id: "integer-programming", aliases: ["integer-programming", "INTEGER_PROGRAMMING"], name: "Integer Programming" },
            { id: "assignment", aliases: ["assignment", "ASSIGNMENT"], name: "Assignment Model" },
            { id: "transportation", aliases: ["transportation", "TRANSPORTATION"], name: "Transportation Model" }
        ]
    },
    {
        groupName: "Network Models",
        models: [
            { id: "cpm-pert", aliases: ["cpm-pert", "CPM_PERT"], name: "CPM / PERT" },
            { id: "minimal-spanning", aliases: ["minimal-spanning", "MINIMAL_SPANNING"], name: "Minimal Spanning Tree" },
            { id: "shortest-path", aliases: ["shortest-path", "SHORTEST_PATH"], name: "Shortest Path" },
            { id: "maximum-flow", aliases: ["maximum-flow", "MAX_FLOW_MIN_CUT"], name: "Maximum Flow / Min Cut" },
            { id: "traveling-salesman", aliases: ["traveling-salesman", "TRAVELING_SALES", "traveling-sales"], name: "Traveling Salesman" }
        ]
    },
    {
        groupName: "Forecasting Models",
        models: [
            { id: "time-series-averaging", aliases: ["time-series-averaging", "averaging", "AVERAGING"], name: "Averaging & Smoothing" },
            { id: "linear-regression", aliases: ["linear-regression", "LINEAR_REGRESSION"], name: "Linear Regression" }
        ]
    },
    {
        groupName: "Inventory & Production",
        models: [
            { id: "eoq-discounts", aliases: ["eoq-discounts", "EOQ_DISCOUNTS"], name: "EOQ & Quantity Discounts" },
            { id: "eoq-stockouts", aliases: ["eoq-stockouts", "EOQ_STOCKOUTS"], name: "EOQ with Planned Stockouts" },
            { id: "economic-lot-size", aliases: ["economic-lot-size", "ECONOMIC_LOT_SIZE"], name: "Economic Production Lot Size" }
        ]
    },
    {
        groupName: "Dynamic Programming",
        models: [
            { id: "knapsack", aliases: ["knapsack", "KNAPSACK"], name: "Knapsack Model" },
            { id: "stagecoach", aliases: ["stagecoach", "STAGECOACH"], name: "Stagecoach / Shortest Path" },
            { id: "production-inventory-dp", aliases: ["production-inventory-dp", "production-planning", "PRODUCTION_PLANNING"], name: "Production & Inventory Planning" }
        ]
    },
    {
        groupName: "Decision Theory",
        models: [
            { id: "decision-analysis", aliases: ["decision-analysis", "DECISION_ANALYSIS"], name: "Decision Analysis & Trees" }
        ]
    },
    {
        groupName: "Queueing Systems",
        models: [
            { id: "queues-single-multi", aliases: ["queues-single-multi", "queues", "QUEUES"], name: "Queueing Models (M/M/1, M/M/k)" }
        ]
    },
    {
        groupName: "Finite Markov Chains",
        models: [
            { id: "markov-chains", aliases: ["markov-chains", "MARKOV_CHAINS"], name: "Markov Chains & Transition Matrix" }
        ]
    },
    {
        groupName: "Learning Curves",
        models: [
            { id: "learning-curves", aliases: ["learning-curves", "LEARNING_CURVES"], name: "Learning Curve Analysis" }
        ]
    },
    {
        groupName: "Simulation Models",
        models: [
            { id: "sim-queues", aliases: ["sim-queues", "SIM_QUEUES"], name: "Queueing Simulation" },
            { id: "sim-inventory", aliases: ["sim-inventory", "SIM_INVENTORY"], name: "Inventory Simulation" }
        ]
    },
    {
        groupName: "Capacity Management",
        models: [
            { id: "breakeven", aliases: ["breakeven", "BREAKEVEN"], name: "Breakeven Analysis" },
            { id: "make-or-buy", aliases: ["make-or-buy", "MAKE_OR_BUY"], name: "Make-or-Buy Decision" },
            { id: "cost-volume", aliases: ["cost-volume", "COST_VOLUME"], name: "Cost-Volume Analysis" }
        ]
    },
    {
        groupName: "Facilities Planning",
        models: [
            { id: "site-location", aliases: ["site-location", "SITE_LOCATION"], name: "Facility / Site Location" }
        ]
    }
];
class QMCApp {
    storage = new StorageManager();
    manifest = null;
    currentMode = "teach";
    activeItemKey = "introduction";
    activeSubmenuModelId = null;
    submenuTopOffset = 20;
    qmsChannel = new BroadcastChannel("qms_sync_channel");
    loadedProblem = null;
    async init() {
        await this.storage.loadManifest();
        this.manifest = this.storage.getMergedManifest(this.currentMode === "build");
        this.setupEventListeners();
        this.setMode(this.currentMode);
        // Ensure sidebar starts collapsed on initial startup
        const sidebar = document.getElementById("qmc-sidebar");
        sidebar?.classList.add("collapsed");
        // Load last known active item from localStorage, default to "introduction" if none exists
        const savedItemKey = localStorage.getItem("qmc_active_item_key");
        if (savedItemKey) {
            this.activeItemKey = savedItemKey;
        }
        else {
            this.activeItemKey = "introduction";
        }
        this.renderSidebar();
        this.renderActiveView();
    }
    setupEventListeners() {
        // Hamburger slide-over toggle
        document.getElementById("sidebar-toggle")?.addEventListener("click", (e) => {
            e.stopPropagation();
            const sidebar = document.getElementById("qmc-sidebar");
            const submenu = document.getElementById("qmc-submenu-drawer");
            sidebar?.classList.toggle("collapsed");
            if (sidebar?.classList.contains("collapsed")) {
                submenu?.classList.add("collapsed");
                this.activeSubmenuModelId = null;
            }
        });
        // Dismiss catalog sidebar & submenu on any click within the workbench canvas
        document.getElementById("workbench-canvas")?.addEventListener("click", () => {
            document.getElementById("qmc-sidebar")?.classList.add("collapsed");
            document.getElementById("qmc-submenu-drawer")?.classList.add("collapsed");
            this.activeSubmenuModelId = null;
            this.renderSidebar();
        });
        // Submenu close button
        document.getElementById("submenu-close-btn")?.addEventListener("click", () => {
            document.getElementById("qmc-submenu-drawer")?.classList.add("collapsed");
            this.activeSubmenuModelId = null;
            this.renderSidebar();
        });
        // Single Mode Toggle Button
        document.getElementById("mode-toggle-btn")?.addEventListener("click", () => {
            const nextMode = this.currentMode === "teach" ? "build" : "teach";
            this.setMode(nextMode);
        });
        // Interfaces Dropdown Toggle
        const dropdownBtn = document.getElementById("interfaces-dropdown-btn");
        const dropdownMenu = document.getElementById("interfaces-menu");
        dropdownBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            if (dropdownMenu) {
                dropdownMenu.style.display = dropdownMenu.style.display === "block" ? "none" : "block";
            }
        });
        window.addEventListener("click", () => {
            if (dropdownMenu)
                dropdownMenu.style.display = "none";
        });
        // Navbar Package Actions
        document.getElementById("export-pkg-btn")?.addEventListener("click", () => {
            this.storage.exportCoursePackage();
        });
        document.getElementById("import-pkg-btn")?.addEventListener("click", () => {
            document.getElementById("import-file-input")?.click();
        });
        document.getElementById("import-file-input")?.addEventListener("change", (e) => {
            const file = e.target.files?.[0];
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result;
                if (this.storage.importCoursePackage(content)) {
                    alert("Course package imported successfully!");
                    this.manifest = this.storage.getMergedManifest(this.currentMode === "build");
                    this.renderSidebar();
                    this.renderActiveView();
                }
                else {
                    alert("Failed to import course package. Invalid format.");
                }
            };
            reader.readAsText(file);
        });
        // Theme Modal
        const themeModal = document.getElementById("theme-modal");
        document.getElementById("theme-btn")?.addEventListener("click", () => {
            if (themeModal)
                themeModal.style.display = "flex";
        });
        document.getElementById("close-modal-btn")?.addEventListener("click", () => {
            if (themeModal)
                themeModal.style.display = "none";
        });
        // Theme Customizer
        const rootElement = document.documentElement;
        const customHexPicker = document.getElementById("custom-hex");
        const applyPrimaryColor = (hex) => {
            rootElement.style.setProperty("--qmc-primary", hex);
            localStorage.setItem("qmc_primary_color", hex);
        };
        const savedColor = localStorage.getItem("qmc_primary_color");
        if (savedColor) {
            applyPrimaryColor(savedColor);
            if (customHexPicker)
                customHexPicker.value = savedColor;
        }
        customHexPicker?.addEventListener("input", (e) => {
            applyPrimaryColor(e.target.value);
        });
        document.querySelectorAll(".preset-chip").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const color = e.target.getAttribute("data-color");
                if (color) {
                    applyPrimaryColor(color);
                    if (customHexPicker)
                        customHexPicker.value = color;
                }
            });
        });
    }
    setMode(mode) {
        this.currentMode = mode;
        const modeToggleBtn = document.getElementById("mode-toggle-btn");
        const interfacesBtn = document.getElementById("interfaces-dropdown-btn");
        const themeBtn = document.getElementById("theme-btn");
        if (mode === "teach") {
            if (modeToggleBtn)
                modeToggleBtn.textContent = "Build Mode";
            if (interfacesBtn)
                interfacesBtn.style.display = "none";
            if (themeBtn)
                themeBtn.style.display = "none";
            const menu = document.getElementById("interfaces-menu");
            if (menu)
                menu.style.display = "none";
        }
        else {
            if (modeToggleBtn)
                modeToggleBtn.textContent = "Teach Mode";
            if (interfacesBtn)
                interfacesBtn.style.display = "inline-block";
            if (themeBtn)
                themeBtn.style.display = "inline-flex";
        }
        this.manifest = this.storage.getMergedManifest(mode === "build");
        this.renderSidebar();
        this.renderActiveView();
    }
    renderSidebar() {
        const menuContainer = document.getElementById("sidebar-menu");
        const sidebarTitleEl = document.getElementById("sidebar-title");
        const sidebarSubtitleEl = document.getElementById("sidebar-subtitle");
        if (!menuContainer || !this.manifest)
            return;
        const currentTitle = this.storage.getCourseTitle();
        const currentSubtitle = this.storage.getCourseSubtitle();
        if (sidebarTitleEl) {
            if (this.currentMode === "build") {
                sidebarTitleEl.innerHTML = `
          <div id="editable-course-title" title="Click to edit course identifier" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <span>${currentTitle}</span>
            <span style="font-size: 0.6rem; background: var(--qmc-primary); padding: 0.1rem 0.3rem; border-radius: 3px; color: #fff; text-transform: uppercase;">Edit ID</span>
          </div>
        `;
                document.getElementById("editable-course-title")?.addEventListener("click", () => {
                    const newTitle = prompt("Enter Section / Class ID / Course Number (e.g., MSIS-5603 Sec 001):", currentTitle);
                    if (newTitle !== null && newTitle.trim() !== "") {
                        this.storage.saveCourseTitle(newTitle.trim());
                        this.renderSidebar();
                    }
                });
            }
            else {
                sidebarTitleEl.textContent = currentTitle;
            }
        }
        if (sidebarSubtitleEl) {
            if (this.currentMode === "build") {
                sidebarSubtitleEl.innerHTML = `
          <div id="editable-course-subtitle" title="Click to edit description" style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 0.2rem;">
            <span>${currentSubtitle}</span>
            <span style="font-size: 0.55rem; background: rgba(255,255,255,0.15); padding: 0.1rem 0.25rem; border-radius: 3px; color: #fff;">[ Edit Subtitle ]</span>
          </div>
        `;
                document.getElementById("editable-course-subtitle")?.addEventListener("click", () => {
                    const newSubtitle = prompt("Enter course description or subtitle:", currentSubtitle);
                    if (newSubtitle !== null && newSubtitle.trim() !== "") {
                        this.storage.saveCourseSubtitle(newSubtitle.trim());
                        this.renderSidebar();
                    }
                });
            }
            else {
                sidebarSubtitleEl.textContent = currentSubtitle;
            }
        }
        let html = `
      <div class="menu-category" style="margin-top: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
        <span class="category-title">Course Materials</span>
        <ul>
          <li class="nav-item-wrapper" style="padding: 0.15rem 1rem; width: 100%;">
            <button class="nav-link ${this.activeItemKey === 'introduction' ? 'active' : ''}" data-id="introduction" style="width: 100%;">Course Introduction</button>
          </li>
        </ul>
      </div>
    `;
        MODEL_GROUPS.forEach(group => {
            html += `<div class="menu-category"><span class="category-title">${group.groupName}</span><ul>`;
            group.models.forEach(modelDef => {
                const manifestModel = this.manifest.models.find(m => modelDef.aliases.includes(m.modelId));
                const count = manifestModel ? manifestModel.archetypes.length : 0;
                const isActiveModel = this.activeSubmenuModelId === modelDef.id;
                html += `
          <li>
            <button class="model-nav-item ${isActiveModel ? 'active' : ''}" data-modelid="${modelDef.id}">
              <span>${modelDef.name}</span>
              <span class="badge-count">${count}</span>
            </button>
          </li>
        `;
            });
            html += `</ul></div>`;
        });
        menuContainer.innerHTML = html;
        menuContainer.querySelectorAll("[data-id='introduction']").forEach(btn => {
            btn.addEventListener("click", () => {
                this.activeItemKey = "introduction";
                localStorage.setItem("qmc_active_item_key", "introduction");
                this.activeSubmenuModelId = null;
                document.getElementById("qmc-submenu-drawer")?.classList.add("collapsed");
                this.renderSidebar();
                this.renderActiveView();
            });
        });
        menuContainer.querySelectorAll(".model-nav-item").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const currentTarget = e.currentTarget;
                const modelId = currentTarget.getAttribute("data-modelid");
                if (modelId) {
                    const rect = currentTarget.getBoundingClientRect();
                    this.submenuTopOffset = Math.max(10, Math.min(rect.top, window.innerHeight - 300));
                    this.activeSubmenuModelId = modelId;
                    this.renderSidebar();
                    this.renderSubmenuDrawer();
                }
            });
        });
        if (this.activeSubmenuModelId) {
            this.renderSubmenuDrawer();
        }
    }
    renderSubmenuDrawer() {
        const submenuDrawer = document.getElementById("qmc-submenu-drawer");
        const submenuTitle = document.getElementById("submenu-title");
        const submenuMenu = document.getElementById("submenu-menu");
        if (!submenuDrawer || !submenuTitle || !submenuMenu || !this.manifest)
            return;
        submenuDrawer.style.top = `${this.submenuTopOffset}px`;
        let modelDef = null;
        for (const g of MODEL_GROUPS) {
            const found = g.models.find(m => m.id === this.activeSubmenuModelId);
            if (found) {
                modelDef = found;
                break;
            }
        }
        let targetModel = null;
        if (modelDef) {
            targetModel = this.manifest.models.find(m => modelDef.aliases.includes(m.modelId));
        }
        submenuTitle.textContent = modelDef?.name || "Model Problems";
        const hiddenIds = this.storage.getHiddenIds();
        const archetypes = targetModel ? targetModel.archetypes : [];
        let html = `<ul style="padding: 0 1rem;">`;
        if (this.currentMode === "build") {
            html += `
        <li style="margin-bottom: 0.75rem; padding: 0 0.5rem;">
          <button class="btn-text add-model-arch-btn" data-modelid="${modelDef?.id || this.activeSubmenuModelId}" style="font-size: 0.8rem; color: #38bdf8; font-weight: 600; background: none; border: none; cursor: pointer;">+ Add New Problem</button>
        </li>
      `;
        }
        if (archetypes.length === 0) {
            html += `<li><span style="color: #64748b; font-size: 0.85rem; padding: 0.5rem; display: block;">No problems available</span></li>`;
        }
        else {
            archetypes.forEach((arch) => {
                const isHidden = hiddenIds.includes(arch.id);
                const isActive = this.activeItemKey === arch.id;
                html += `
          <li class="nav-item-wrapper" ${isHidden && this.currentMode === 'build' ? 'style="opacity: 0.5;"' : ''}>
            <button class="nav-link ${isActive ? 'active' : ''}" data-id="${arch.id}" style="font-size: 0.85rem; padding: 0.5rem 0.75rem;">
              ${arch.title} ${isHidden && this.currentMode === 'build' ? '<span style="font-size: 0.6rem; color: #ef4444; font-weight: bold;">(Hidden)</span>' : ''}
            </button>
        `;
                if (this.currentMode === "build") {
                    if (isHidden) {
                        html += `<button class="btn-text unhide-arch-btn" data-id="${arch.id}" title="Unhide in Teach Mode" style="font-size: 0.7rem; color: #22c55e; padding: 0.2rem 0.4rem;">[ Unhide ]</button>`;
                    }
                    else {
                        html += `<button class="btn-text hide-arch-btn" data-id="${arch.id}" title="Hide in Teach Mode" style="font-size: 0.7rem; color: #ef4444; padding: 0.2rem 0.4rem;">[ Hide ]</button>`;
                    }
                }
                html += `</li>`;
            });
        }
        html += `</ul>`;
        submenuMenu.innerHTML = html;
        submenuDrawer.classList.remove("collapsed");
        submenuMenu.querySelectorAll(".nav-link").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                if (id) {
                    this.activeItemKey = id;
                    localStorage.setItem("qmc_active_item_key", id);
                    this.renderSubmenuDrawer();
                    this.renderActiveView();
                    document.getElementById("qmc-sidebar")?.classList.add("collapsed");
                    document.getElementById("qmc-submenu-drawer")?.classList.add("collapsed");
                    this.activeSubmenuModelId = null;
                    this.renderSidebar();
                }
            });
        });
        submenuMenu.querySelectorAll(".hide-arch-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                if (id) {
                    this.storage.hideArchetype(id);
                    this.manifest = this.storage.getMergedManifest(this.currentMode === "build");
                    this.renderSidebar();
                    this.renderSubmenuDrawer();
                }
            });
        });
        submenuMenu.querySelectorAll(".unhide-arch-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.target.getAttribute("data-id");
                if (id) {
                    this.storage.unhideArchetype(id);
                    this.manifest = this.storage.getMergedManifest(this.currentMode === "build");
                    this.renderSidebar();
                    this.renderSubmenuDrawer();
                }
            });
        });
        submenuMenu.querySelectorAll(".add-model-arch-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const modelId = e.target.getAttribute("data-modelid");
                if (modelId) {
                    this.renderAuthoringForm(modelId);
                    document.getElementById("qmc-sidebar")?.classList.add("collapsed");
                    document.getElementById("qmc-submenu-drawer")?.classList.add("collapsed");
                    this.activeSubmenuModelId = null;
                    this.renderSidebar();
                }
            });
        });
    }
    async renderActiveView() {
        const workbench = document.getElementById("workbench-content-area");
        const bcModel = document.getElementById("bc-model");
        if (!workbench || !this.manifest)
            return;
        if (this.activeItemKey === "introduction") {
            if (bcModel)
                bcModel.textContent = "Course Introduction";
            if (this.currentMode === "build") {
                const introHtml = await this.storage.loadCourseIntro();
                workbench.innerHTML = `
          <div class="intro-container" style="margin-bottom: 2rem;">
            <h1>Quantitative Methods Companion (QMC)</h1>
            <p>Welcome to the QuantMethods Companion. This platform is designed to bridge the gap between descriptive, narrative business scenarios and rigorous mathematical problem-solving in tandem with the QMS Solver engine.</p>
            
            <h2 style="margin-top: 1.5rem; font-size: 1.25rem;">The Art of Quantitative Modeling</h2>
            <p>In operational research and management science, the most challenging step is rarely the arithmetic calculation—it is the translation of unstructured business realities into precise mathematical structures. QMC focuses heavily on this formulation phase.</p>

            <h2 style="margin-top: 1.5rem; font-size: 1.25rem;">How to Use This Companion</h2>
            <ul>
              <li><strong>Explore Problem Archetypes:</strong> Navigate through models using the sidebar catalog to examine standardized business challenges.</li>
              <li><strong>Analyze the 3-Part Framework:</strong> Review the Real-World Description (Part 1), Managerial Analysis & Key Elements (Part 2), and Problem Formulation (Part 3).</li>
              <li><strong>Live Solver Integration:</strong> Use the direct launch buttons in Part 3 to stream models instantly into the companion QMS Solver engine across browser tabs.</li>
            </ul>

            <h2 style="margin-top: 1.5rem; font-size: 1.25rem;">Teach Mode & Classroom Presentation</h2>
            <p>Designed for both in-person projection and remote web instruction, QMC provides clean, lecture-ready formatting that eliminates the need for separate slide decks.</p>
          </div>

          <div class="intro-container" style="border: 2px dashed var(--qmc-primary); background: #f8fafc; padding: 1.5rem; border-radius: var(--radius);">
            <div style="background: #e0e7ff; padding: 1rem; border-radius: var(--radius); margin-bottom: 1.25rem;">
              <h3 style="color: var(--qmc-primary); margin-bottom: 0.25rem; font-size: 1.1rem;">🛠️ Authoring Panel: Tailor Teach Mode Introduction</h3>
              <p style="font-size: 0.88rem; color: #312e81; margin: 0;">Use this editor to <strong>Add, Modify, or Delete</strong> the Course Introduction content presented to students in <strong>Teach Mode</strong>. Default content is seeded from <code>data/introduction.json</code>.</p>
            </div>

            <form id="intro-authoring-form">
              <div style="margin-bottom: 1.25rem;">
                <label style="display: block; font-weight: 700; margin-bottom: 0.5rem;">Teach Mode Introduction Content (HTML Supported):</label>
                <textarea id="auth-intro-content" rows="12" style="width: 100%; padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--qmc-border); font-family: monospace; font-size: 0.9rem; line-height: 1.4;">${introHtml}</textarea>
              </div>
              <div class="action-toolbar" style="display: flex; gap: 1rem;">
                <button type="submit" class="btn-primary">Save Tailored Introduction</button>
                <button type="button" id="reset-intro-btn" class="btn-secondary" style="color: #ef4444; border-color: #fca5a5;">Reset to Default (data/introduction.json)</button>
              </div>
            </form>
          </div>
        `;
                document.getElementById("intro-authoring-form")?.addEventListener("submit", (e) => {
                    e.preventDefault();
                    const content = document.getElementById("auth-intro-content").value;
                    this.storage.saveCourseIntro(content);
                    alert("Teach Mode course introduction updated successfully!");
                    this.renderActiveView();
                });
                document.getElementById("reset-intro-btn")?.addEventListener("click", () => {
                    if (confirm("Are you sure you want to reset the Teach Mode introduction to the default text from data/introduction.json?")) {
                        this.storage.resetCourseIntro();
                        this.renderActiveView();
                    }
                });
            }
            else {
                const introHtml = await this.storage.loadCourseIntro();
                workbench.innerHTML = `
          <div class="intro-container">
            ${introHtml}
          </div>
        `;
            }
            return;
        }
        let foundArch = null;
        let foundModelName = "";
        let foundModelId = "";
        for (const m of this.manifest.models) {
            const match = m.archetypes.find(a => a.id === this.activeItemKey);
            if (match) {
                foundArch = match;
                foundModelName = m.name;
                foundModelId = m.modelId;
                break;
            }
        }
        if (!foundArch) {
            workbench.innerHTML = `<p>Problem not found or hidden.</p>`;
            return;
        }
        const problemData = await this.storage.fetchProblemData(foundArch);
        if (!problemData) {
            workbench.innerHTML = `<p>Error loading problem data file.</p>`;
            return;
        }
        this.loadedProblem = problemData;
        if (bcModel)
            bcModel.textContent = `${foundModelName} / ${problemData.title}`;
        if (this.currentMode === "build") {
            this.renderAuthoringForm(foundModelId, problemData);
            return;
        }
        workbench.innerHTML = `
      <div class="archetype-intro-card">
        <h1>${problemData.title}</h1>
        <p>${problemData.summary}</p>
      </div>

      <article class="qmc-part-card desc-card">
        <div class="part-header"><h2>Problem Description</h2></div>
        <div class="part-body"><p>${problemData.part1}</p></div>
      </article>

      <article class="qmc-part-card analysis-card">
        <div class="part-header"><h2>Managerial Analysis & Key Elements</h2></div>
        <div class="part-body">${problemData.part2}</div>
      </article>

      <article class="qmc-part-card formulation-card">
        <div class="part-header"><h2>Problem Formulation & QMS Integration</h2></div>
        <div class="part-body">
          <div class="math-block">${problemData.formulation}</div>
          <div class="action-toolbar">
            <button id="launch-qms-btn" class="btn-primary">🚀 Launch Model in QMS Solver</button>
            <button id="toggle-json-btn" class="btn-text">[ ⚙️ View QMS Payload ]</button>
          </div>
          <div id="json-drawer" class="json-drawer" style="display: none;">
            <pre><code>${JSON.stringify(problemData.payload, null, 2)}</code></pre>
          </div>
        </div>
      </article>
    `;
        document.getElementById("launch-qms-btn")?.addEventListener("click", () => {
            // Package payload for QMS standard ingestion
            const qmsPayload = {
                qmsHeader: {
                    version: "2.0",
                    modelId: foundModelId,
                    title: problemData.title,
                    isDirty: false,
                    savedAt: new Date().toISOString()
                },
                payload: problemData.payload
            };
            // Store in localStorage to guarantee delivery on window.open()
            localStorage.setItem("qms_pending_payload", JSON.stringify(qmsPayload));
            // Broadcast to live channel if tab is already open
            this.qmsChannel.postMessage({ type: "LOAD_MODEL", payload: qmsPayload });
            // Open QMS solver tab
            window.open("../QMS/qms/index.html?autoLoad=true", "_blank");
        });
        document.getElementById("toggle-json-btn")?.addEventListener("click", () => {
            const drawer = document.getElementById("json-drawer");
            if (drawer) {
                drawer.style.display = drawer.style.display === "none" ? "block" : "none";
            }
        });
    }
    renderAuthoringForm(preselectedModelId, existingProblem) {
        const workbench = document.getElementById("workbench-content-area");
        const bcModel = document.getElementById("bc-model");
        if (!workbench || !this.manifest)
            return;
        const isEditing = !!existingProblem;
        if (bcModel)
            bcModel.textContent = isEditing ? `Authoring Mode / Edit: ${existingProblem.title}` : "Authoring Mode / Add Custom Problem";
        const cleanPart1 = existingProblem ? existingProblem.part1.replace(/<br>/g, "\n") : "";
        workbench.innerHTML = `
      <div class="intro-container">
        <h1>${isEditing ? `Edit Problem: ${existingProblem.title}` : 'Add Custom Problem Archetype'}</h1>
        <p>${isEditing ? 'Modify your narrative and analysis below. You can keep the existing QMS model or upload a new pristine <code>qms.json</code> export.' : 'Author your narrative and analysis below, then import the pristine <code>qms.json</code> exported directly from your QMS Solver session.'}</p>
        
        <form id="authoring-form" style="margin-top: 1.5rem;">
          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-weight: 700; margin-bottom: 0.5rem;">Target Model Category:</label>
            <select id="auth-model-id" style="width: 100%; padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--qmc-border); font-size: 1rem;">
              ${MODEL_GROUPS.flatMap(g => g.models).map(m => `<option value="${m.id}" ${m.id === (existingProblem?.modelId || preselectedModelId) ? 'selected' : ''}>${m.name}</option>`).join("")}
            </select>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-weight: 700; margin-bottom: 0.5rem;">Problem Title:</label>
            <input type="text" id="auth-title" value="${existingProblem?.title || ''}" placeholder="e.g. LP-2: Regional Product Mix" required style="width: 100%; padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--qmc-border); font-size: 1rem;">
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-weight: 700; margin-bottom: 0.5rem;">Short Summary:</label>
            <input type="text" id="auth-summary" value="${existingProblem?.summary || ''}" placeholder="One-sentence description of the decision model" required style="width: 100%; padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--qmc-border); font-size: 1rem;">
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-weight: 700; margin-bottom: 0.5rem;">Problem Description (HTML / Markdown supported):</label>
            <textarea id="auth-part1" rows="5" placeholder="Enter problem narrative..." required style="width: 100%; padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--qmc-border); font-size: 1rem;">${cleanPart1}</textarea>
          </div>

          <div style="margin-bottom: 1.25rem;">
            <label style="display: block; font-weight: 700; margin-bottom: 0.5rem;">Managerial Analysis & Key Elements:</label>
            <textarea id="auth-part2" rows="4" placeholder="<ul><li>Trade-offs...</li></ul>" required style="width: 100%; padding: 0.75rem; border-radius: var(--radius); border: 1px solid var(--qmc-border); font-size: 1rem;">${existingProblem?.part2 || ''}</textarea>
          </div>

          <div style="margin-bottom: 2rem;">
            <label style="display: block; font-weight: 700; margin-bottom: 0.5rem;">${isEditing ? 'Upload New QMS Payload (.json) [Optional]:' : 'Upload Exported QMS Payload (.json):'}</label>
            <input type="file" id="auth-qms-file" accept=".json" ${isEditing ? '' : 'required'} style="padding: 0.5rem 0;">
          </div>

          <div id="preview-gate-container" style="display: ${isEditing ? 'block' : 'none'}; background: #f8fafc; border: 2px dashed var(--qmc-primary); padding: 1.5rem; border-radius: var(--radius); margin-bottom: 2rem;">
            <h3 style="margin-bottom: 0.5rem; color: var(--qmc-primary);">🔍 Active QMS Payload Formulation</h3>
            <div id="live-preview-content" class="math-block">${existingProblem?.formulation || ''}</div>
          </div>

          <div class="action-toolbar">
            <button type="button" id="preview-qms-btn" class="btn-secondary">${isEditing ? 'Verify New QMS Payload' : 'Verify QMS Payload'}</button>
            <button type="submit" id="save-problem-btn" class="btn-primary" style="display: ${isEditing ? 'inline-block' : 'none'};">${isEditing ? 'Save Changes' : 'Save Custom Archetype'}</button>
          </div>
        </form>
      </div>
    `;
        let parsedPayload = existingProblem ? existingProblem.payload : null;
        let computedFormulation = existingProblem ? existingProblem.formulation : "";
        document.getElementById("preview-qms-btn")?.addEventListener("click", () => {
            const fileInput = document.getElementById("auth-qms-file");
            const file = fileInput.files?.[0];
            if (!file) {
                if (isEditing && existingProblem) {
                    alert("Using existing QMS payload.");
                    return;
                }
                alert("Please select a qms.json file first.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result);
                    parsedPayload = json;
                    const p = json.payload || json;
                    const objType = p.objectiveType || "MAXIMIZE";
                    const objName = p.objectiveName || "Z";
                    const vars = p.variables || [];
                    const coeffs = p.objectiveCoefficients || [];
                    const constraints = p.constraints || [];
                    let formulation = `${objType} Objective: ${objName} = ` + coeffs.map((c, idx) => `${c}${vars[idx]?.name || 'X' + (idx + 1)}`).join(" + ");
                    formulation += `<br>Subject to:<br>`;
                    constraints.forEach((con) => {
                        const opSymbol = con.operator === "LTE" ? "≤" : con.operator === "GTE" ? "≥" : "=";
                        const conExpr = con.coefficients.map((sc, si) => `${sc}${vars[si]?.name || 'X' + (si + 1)}`).join(" + ");
                        formulation += `&bull; ${con.name}: ${conExpr} ${opSymbol} ${con.rhs}<br>`;
                    });
                    computedFormulation = formulation;
                    let mathText = `<strong>Objective (${objType} ${objName}):</strong> `;
                    mathText += coeffs.map((c, idx) => `${c}(${vars[idx]?.name || 'X' + (idx + 1)})`).join(" + ");
                    mathText += `<br><strong>Constraints (${constraints.length} total):</strong><ul>`;
                    constraints.forEach((con) => {
                        const opSymbol = con.operator === "LTE" ? "≤" : con.operator === "GTE" ? "≥" : "=";
                        const conExpr = con.coefficients.map((sc, si) => `${sc}(${vars[si]?.name || 'X' + (si + 1)})`).join(" + ");
                        mathText += `<li>${con.name}: ${conExpr} ${opSymbol} ${con.rhs}</li>`;
                    });
                    mathText += `</ul>`;
                    const previewContainer = document.getElementById("preview-gate-container");
                    const previewContent = document.getElementById("live-preview-content");
                    const saveBtn = document.getElementById("save-problem-btn");
                    if (previewContainer && previewContent && saveBtn) {
                        previewContent.innerHTML = mathText;
                        previewContainer.style.display = "block";
                        saveBtn.style.display = "inline-block";
                    }
                }
                catch (err) {
                    alert("Invalid JSON file format.");
                    console.error(err);
                }
            };
            reader.readAsText(file);
        });
        document.getElementById("authoring-form")?.addEventListener("submit", (e) => {
            e.preventDefault();
            if (!parsedPayload) {
                alert("Please verify or upload a QMS payload first.");
                return;
            }
            const titleInput = document.getElementById("auth-title").value;
            const id = existingProblem ? existingProblem.id : titleInput.toLowerCase().replace(/[^a-z0-9]/g, "-");
            const modelId = document.getElementById("auth-model-id").value;
            const summary = document.getElementById("auth-summary").value;
            const part1 = document.getElementById("auth-part1").value;
            const part2 = document.getElementById("auth-part2").value;
            const updatedProblem = {
                id,
                title: titleInput,
                modelId,
                summary,
                part1: part1.replace(/\n/g, "<br>"),
                part2,
                formulation: computedFormulation || existingProblem?.formulation || "",
                payload: parsedPayload
            };
            this.storage.saveCustomArchetype(updatedProblem);
            this.manifest = this.storage.getMergedManifest(this.currentMode === "build");
            this.activeItemKey = id;
            alert("Problem saved successfully!");
            this.setMode("teach");
        });
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const app = new QMCApp();
    app.init();
});
