export interface ArchetypeRef {
  id: string;
  title: string;
  file: string;
}

export interface ModelCategory {
  modelId: string;
  name: string;
  archetypes: ArchetypeRef[];
}

export interface Manifest {
  models: ModelCategory[];
}

export interface ProblemPayload {
  id: string;
  title: string;
  modelId: string;
  summary: string;
  part1: string;
  part2: string;
  formulation: string;
  payload: any;
}

const STORAGE_KEY_HIDDEN = "qmc_hidden_archetypes";
const STORAGE_KEY_CUSTOM = "qmc_custom_archetypes";
const STORAGE_KEY_COURSE_INTRO = "qmc_custom_course_intro";
const STORAGE_KEY_COURSE_TITLE = "qmc_custom_course_title";
const STORAGE_KEY_COURSE_SUBTITLE = "qmc_custom_course_subtitle";

export class StorageManager {
  private pristineManifest: Manifest | null = null;

  async loadManifest(): Promise<Manifest> {
    try {
      const response = await fetch("data/manifest.json");
      this.pristineManifest = await response.json();
      return this.getMergedManifest(false);
    } catch (error) {
      console.error("Failed to load pristine manifest:", error);
      return { models: [] };
    }
  }

  getCourseTitle(): string {
    return localStorage.getItem(STORAGE_KEY_COURSE_TITLE) || "INSTRUCTOR HUB";
  }

  saveCourseTitle(title: string): void {
    localStorage.setItem(STORAGE_KEY_COURSE_TITLE, title);
  }

  getCourseSubtitle(): string {
    return localStorage.getItem(STORAGE_KEY_COURSE_SUBTITLE) || "Curriculum & Course Companion";
  }

  saveCourseSubtitle(subtitle: string): void {
    localStorage.setItem(STORAGE_KEY_COURSE_SUBTITLE, subtitle);
  }

  async loadCourseIntro(): Promise<string> {
    const customIntro = localStorage.getItem(STORAGE_KEY_COURSE_INTRO);
    if (customIntro) {
      return customIntro;
    }

    try {
      const response = await fetch("data/introduction.json");
      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error("Failed to load default course introduction:", error);
      return "<p>Welcome to the Quantitative Methods Companion.</p>";
    }
  }

  saveCourseIntro(htmlContent: string): void {
    localStorage.setItem(STORAGE_KEY_COURSE_INTRO, htmlContent);
  }

  resetCourseIntro(): void {
    localStorage.removeItem(STORAGE_KEY_COURSE_INTRO);
  }

  getMergedManifest(includeHidden: boolean = false): Manifest {
    if (!this.pristineManifest) return { models: [] };

    const hiddenIds = this.getHiddenIds();
    const customArchetypes = this.getCustomArchetypes();

    const merged: Manifest = JSON.parse(JSON.stringify(this.pristineManifest));

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
      if (!includeHidden && hiddenIds.includes(customItem.id)) return;
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

  getHiddenIds(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY_HIDDEN);
    return raw ? JSON.parse(raw) : [];
  }

  hideArchetype(id: string): void {
    const hidden = this.getHiddenIds();
    if (!hidden.includes(id)) {
      hidden.push(id);
      localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(hidden));
    }
  }

  unhideArchetype(id: string): void {
    const hidden = this.getHiddenIds().filter(h => h !== id);
    localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify(hidden));
  }

  getCustomArchetypes(): ProblemPayload[] {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    return raw ? JSON.parse(raw) : [];
  }

  saveCustomArchetype(problem: ProblemPayload): void {
    const custom = this.getCustomArchetypes();
    const existingIndex = custom.findIndex(p => p.id === problem.id);
    if (existingIndex >= 0) {
      custom[existingIndex] = problem;
    } else {
      custom.push(problem);
    }
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(custom));
  }

  async fetchProblemData(archetypeRef: ArchetypeRef): Promise<ProblemPayload | null> {
    const custom = this.getCustomArchetypes();
    const found = custom.find(c => c.id === archetypeRef.id);
    if (found) return found;

    try {
      const response = await fetch(`data/${archetypeRef.file}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to load problem data for ${archetypeRef.id}:`, error);
      return null;
    }
  }

  exportCoursePackage(): void {
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

  importCoursePackage(jsonString: string): boolean {
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
    } catch (error) {
      console.error("Invalid course package format:", error);
      return false;
    }
  }
}