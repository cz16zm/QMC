const STORAGE_KEY_HIDDEN = "qmc_hidden_archetypes";
const STORAGE_KEY_CUSTOM = "qmc_custom_archetypes";
const STORAGE_KEY_COURSE_INTRO = "qmc_custom_course_intro";
const STORAGE_KEY_COURSE_TITLE = "qmc_custom_course_title";
const STORAGE_KEY_COURSE_SUBTITLE = "qmc_custom_course_subtitle";
export class StorageManager {
    pristineManifest = null;
    async loadManifest() {
        try {
            const response = await fetch("data/manifest.json");
            this.pristineManifest = await response.json();
            return this.getMergedManifest(false);
        }
        catch (error) {
            console.error("Failed to load pristine manifest:", error);
            return { models: [] };
        }
    }
    getCourseTitle() {
        return localStorage.getItem(STORAGE_KEY_COURSE_TITLE) || "INSTRUCTOR HUB";
    }
    saveCourseTitle(title) {
        localStorage.setItem(STORAGE_KEY_COURSE_TITLE, title);
    }
    getCourseSubtitle() {
        return localStorage.getItem(STORAGE_KEY_COURSE_SUBTITLE) || "Curriculum & Course Companion";
    }
    saveCourseSubtitle(subtitle) {
        localStorage.setItem(STORAGE_KEY_COURSE_SUBTITLE, subtitle);
    }
    async loadCourseIntro() {
        const customIntro = localStorage.getItem(STORAGE_KEY_COURSE_INTRO);
        if (customIntro) {
            return customIntro;
        }
        try {
            const response = await fetch("data/introduction.json");
            const data = await response.json();
            return data.content;
        }
        catch (error) {
            console.error("Failed to load default course introduction:", error);
            return "<p>Welcome to the Quantitative Methods Companion.</p>";
        }
    }
    saveCourseIntro(htmlContent) {
        localStorage.setItem(STORAGE_KEY_COURSE_INTRO, htmlContent);
    }
    resetCourseIntro() {
        localStorage.removeItem(STORAGE_KEY_COURSE_INTRO);
    }
    getMergedManifest(includeHidden = false) {
        if (!this.pristineManifest)
            return { models: [] };
        const hiddenIds = this.getHiddenIds();
        const customArchetypes = this.getCustomArchetypes();
        const merged = JSON.parse(JSON.stringify(this.pristineManifest));
        if (!includeHidden) {
            merged.models.forEach(model => {
                model.archetypes = model.archetypes.filter(arch => !hiddenIds.includes(arch.id));
            });
        }
        // Update titles for any edited pristine archetypes
        merged.models.forEach(model => {
            model.archetypes.forEach(arch => {
                const foundCustom = customArchetypes.find(c => c.id === arch.id);
                if (foundCustom) {
                    arch.title = foundCustom.title;
                }
            });
        });
        customArchetypes.forEach(customItem => {
            if (!includeHidden && hiddenIds.includes(customItem.id))
                return;
            const targetModel = merged.models.find(m => m.modelId === customItem.modelId);
            if (targetModel) {
                const exists = targetModel.archetypes.some(a => a.id === customItem.id);
                if (!exists) {
                    targetModel.archetypes.push({
                        id: customItem.id,
                        title: customItem.title,
                        file: `custom/${customItem.id}.json`
                    });
                }
            }
        });
        return merged;
    }
    getHiddenIds() {
        const raw = localStorage.getItem(STORAGE_KEY_HIDDEN);
        return raw ? JSON.parse(raw) : [];
    }
    hideArchetype(id) {
        const hidden = this.getHiddenIds();
        if (!hidden.includes(id)) {
            hidden.push(id);
            localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(hidden));
        }
    }
    unhideArchetype(id) {
        const hidden = this.getHiddenIds().filter(h => h !== id);
        localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(hidden));
    }
    getCustomArchetypes() {
        const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
        return raw ? JSON.parse(raw) : [];
    }
    saveCustomArchetype(problem) {
        const custom = this.getCustomArchetypes();
        const existingIndex = custom.findIndex(p => p.id === problem.id);
        if (existingIndex >= 0) {
            custom[existingIndex] = problem;
        }
        else {
            custom.push(problem);
        }
        localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(custom));
    }
    async fetchProblemData(archetypeRef) {
        const custom = this.getCustomArchetypes();
        const found = custom.find(c => c.id === archetypeRef.id);
        if (found)
            return found;
        try {
            const response = await fetch(`data/${archetypeRef.file}`);
            const data = await response.json();
            return data;
        }
        catch (error) {
            console.error(`Failed to load problem data for ${archetypeRef.id}:`, error);
            return null;
        }
    }
    exportCoursePackage() {
        const packageData = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            courseTitle: this.getCourseTitle(),
            courseSubtitle: this.getCourseSubtitle(),
            hidden: this.getHiddenIds(),
            custom: this.getCustomArchetypes()
        };
        const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "instructor-course-package.qmc.json";
        a.click();
        URL.revokeObjectURL(url);
    }
    importCoursePackage(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.courseTitle) {
                this.saveCourseTitle(data.courseTitle);
            }
            if (data.courseSubtitle) {
                this.saveCourseSubtitle(data.courseSubtitle);
            }
            if (data.hidden) {
                localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(data.hidden));
            }
            if (data.custom) {
                localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(data.custom));
            }
            return true;
        }
        catch (error) {
            console.error("Invalid course package format:", error);
            return false;
        }
    }
}
