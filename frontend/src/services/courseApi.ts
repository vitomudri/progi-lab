// src/services/courseApi.ts
export type Role = "student" | "instructor" | "admin" | null;

export type Course = {
  course_id: number;
  title: string;
  description: string | null;
  instructor_id: string | null;
  is_published: boolean;
};

export type LessonType = "video" | "text" | "recipe";
export type LessonDifficulty = "easy" | "medium" | "hard";
export type Nutrition = Record<string, any>;

export type LessonSummary = {
  lesson_id: number;
  module_id: number;
  title: string;
  order_index: number;
  type: LessonType;

  _editing?: boolean;
  _loadingEdit?: boolean;

  _editTitle?: string;
  _editType?: LessonType;
  _editContent?: string;
  _editVideoUrl?: string;

  _editStepsText?: string;
  _editIngredientsText?: string;
  _editPrepTimeMin?: number | null;
  _editCookTimeMin?: number | null;
  _editDifficulty?: LessonDifficulty | null;
  _editShoppingList?: string;
  _editAllergens?: string;
  _editNutritionJson?: string;
};

export type ModuleSummary = {
  module_id: number;
  course_id: number;
  title: string;
  order_index: number;
  lessons: LessonSummary[];

  _editTitle?: string;

  _newLesson: {
    title: string;
    type: LessonType;
    content?: string;
    video_url?: string;

    steps_text?: string;
    ingredients_text?: string;
    prep_time_min?: number | null;
    cook_time_min?: number | null;
    difficulty?: LessonDifficulty | null;
    shopping_list?: string;
    allergens?: string;
    nutrition_json?: string;
  };
};

export type LessonDetail = {
  lesson_id: number;
  module_id: number;
  title: string;
  order_index: number;
  type: LessonType;

  content: string | null;
  video_url: string | null;

  steps_text: string | null;
  ingredients_text: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  difficulty: LessonDifficulty | null;
  shopping_list: string | null;
  allergens: string | null;
  nutrition: Nutrition | null;
};

export type ActivityType = "quiz" | "photo_upload";

export type ActivitySubmissionStatus = "submitted" | "approved" | "rejected";
export type ActivitySubmission = {
  submission_id: number;
  activity_id: number;
  student_id: string;
  answer: any;
  file_id: string | null;
  status: ActivitySubmissionStatus;
  created_at: string;

  _fileUrl?: string | null; // frontend-only
};

export type LessonActivity = {
  activity_id: number;
  lesson_id: number;
  type: ActivityType;
  title: string;
  payload: any;
  is_required: boolean;

  _editing?: boolean;
  _saving?: boolean;
  _saveMsg?: string;

  _editTitle?: string;
  _editType?: ActivityType;
  _editRequired?: boolean;
  _editPayloadJson?: string;

  _submitting?: boolean;
  _submitMsg?: string;

  _submitted?: boolean; // frontend lock (localStorage)

  _subsOpen?: boolean;
  _subsLoading?: boolean;
  _subsMsg?: string;
  _subs?: ActivitySubmission[];
};

async function jsonOrThrow(res: Response, fallbackMsg: string) {
  if (res.ok) return res.json();
  let msg = fallbackMsg;
  try {
    const err = await res.json();
    msg = err?.error ?? msg;
  } catch {}
  throw new Error(msg);
}

export const api = {
  async me(): Promise<{ role: Role }> {
    const res = await fetch("/api/v1/profile/me", { credentials: "include" });
    if (!res.ok) return { role: null };
    const data = await res.json();
    const role =
      data?.content?.role ??
      data?.content?.user?.role ??
      data?.role ??
      data?.user?.role ??
      null;
    return { role };
  },

  async getCourse(courseId: number): Promise<Course> {
    const res = await fetch(`/api/v1/courses/${courseId}`, { credentials: "include" });
    const data = await jsonOrThrow(res, "Ne mogu dohvatiti tečaj.");
    return data.course as Course;
  },

  async getModules(courseId: number): Promise<any[]> {
    const res = await fetch(`/api/v1/courses/${courseId}/modules`, { credentials: "include" });
    const data = await jsonOrThrow(res, "Ne mogu dohvatiti module.");
    return data.modules ?? [];
  },

  async getLessonsForModule(moduleId: number): Promise<any[]> {
    const res = await fetch(`/api/v1/modules/${moduleId}/lessons`, { credentials: "include" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.lessons ?? [];
  },

  async getLessonDetail(lessonId: number): Promise<LessonDetail> {
    const res = await fetch(`/api/v1/lessons/${lessonId}`, { credentials: "include" });
    const data = await jsonOrThrow(res, "Ne mogu dohvatiti lekciju.");
    return data.lesson as LessonDetail;
  },

  async publishCourse(courseId: number) {
    const res = await fetch(`/api/v1/courses/${courseId}/publish`, { method: "POST", credentials: "include" });
    if (!res.ok) throw new Error("Neuspješno publishanje.");
  },

  async unpublishCourse(courseId: number) {
    const res = await fetch(`/api/v1/courses/${courseId}/unpublish`, { method: "POST", credentials: "include" });
    if (!res.ok) throw new Error("Neuspješno unpublishanje.");
  },

  async addModule(courseId: number, title: string) {
    const res = await fetch(`/api/v1/courses/${courseId}/modules`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    await jsonOrThrow(res, "Neuspješno dodavanje modula.");
  },

  async saveModuleTitle(moduleId: number, title: string) {
    const res = await fetch(`/api/v1/modules/${moduleId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    await jsonOrThrow(res, "Neuspješno spremanje modula.");
  },

  async addLesson(moduleId: number, payload: any) {
    const res = await fetch(`/api/v1/modules/${moduleId}/lessons`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await jsonOrThrow(res, "Neuspješno dodavanje lekcije.");
  },

  async saveLesson(lessonId: number, payload: any) {
    const res = await fetch(`/api/v1/lessons/${lessonId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await jsonOrThrow(res, "Neuspješno spremanje lekcije.");
  },

  // Activities
  async getLessonActivities(lessonId: number) {
    const res = await fetch(`/api/v1/lessons/activities/${lessonId}`, { credentials: "include" });
    const data = await jsonOrThrow(res, "Ne mogu dohvatiti aktivnosti.");
    return data.activities ?? [];
  },

  async createActivity(lessonId: number, payload: any) {
    const res = await fetch(`/api/v1/lessons/activities/${lessonId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await jsonOrThrow(res, "Neuspješno dodavanje aktivnosti.");
  },

  async updateActivity(activityId: number, payload: any) {
    const res = await fetch(`/api/v1/lessons/activities/${activityId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await jsonOrThrow(res, "Neuspješno spremanje aktivnosti.");
    return data.activity;
  },

  async submitActivity(activityId: number, payload: any) {
    const res = await fetch(`/api/v1/lessons/activities/${activityId}/submit`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await jsonOrThrow(res, "Neuspješno slanje.");
  },

  async getSubmissions(activityId: number) {
    const res = await fetch(`/api/v1/lessons/activities/${activityId}/submissions`, { credentials: "include" });
    const data = await jsonOrThrow(res, "Ne mogu dohvatiti submissions.");
    return data.submissions ?? [];
  },

  async reviewSubmission(submissionId: number, status: "approved" | "rejected") {
    const res = await fetch(`/api/v1/lessons/submissions/${submissionId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await jsonOrThrow(res, "Neuspješno ažuriranje statusa.");
  },

  // Files
  async uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/v1/files", {
      method: "POST",
      credentials: "include",
      body: fd,
    });

    const data = await jsonOrThrow(res, "Upload nije uspio.");
    const file_id = data.file_id as string;
    if (!file_id) throw new Error("Upload nije vratio file_id.");
    return file_id;
  },

  async getFileUrl(fileId: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/v1/files/${fileId}/url`, { credentials: "include" });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.url ?? null;
    } catch {
      return null;
    }
  },
};
