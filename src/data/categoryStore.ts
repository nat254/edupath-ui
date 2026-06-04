import { Category, AudienceType } from "./types";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

let categoryList: Category[] = [];
let categoryNames: string[] = [];
let listeners: (() => void)[] = [];

function emit() {
  categoryNames = categoryList.map((c) => c.name);
  listeners.forEach((l) => l());
}

export const categoryStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  },
  getAll() { return categoryList; },
  getNames(): string[] { return categoryNames; },

  async fetchAll() {
    try {
      const res = await fetch(`${API}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      categoryList = await res.json();
      emit();
    } catch (err) {
      console.error("categoryStore.fetchAll error:", err);
    }
  },

  async add(name: string, audienceType: AudienceType = "both"): Promise<Category> {
    const res = await fetch(`${API}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, audienceType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      throw new Error(err.error);
    }
    const created: Category = await res.json();
    categoryList = [...categoryList, created].sort((a, b) => a.name.localeCompare(b.name));
    emit();
    return created;
  },

  async update(id: string, name: string, audienceType?: AudienceType): Promise<Category> {
    const res = await fetch(`${API}/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, audienceType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      throw new Error(err.error);
    }
    const updated: Category = await res.json();
    categoryList = categoryList.map((c) => (c.id === id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name));
    emit();
    return updated;
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API}/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Server error" }));
      throw new Error(err.error);
    }
    categoryList = categoryList.filter((c) => c.id !== id);
    emit();
  },
};
