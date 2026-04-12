import { Course, courses as initialCourses } from "./mockData";

let courseList: Course[] = [...initialCourses];
let listeners: (() => void)[] = [];

function emit() {
  listeners.forEach((l) => l());
}

export const courseStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
  getAll() {
    return courseList;
  },
  getById(id: string) {
    return courseList.find((c) => c.id === id) ?? null;
  },
  add(course: Omit<Course, "id">) {
    const newCourse: Course = { ...course, id: crypto.randomUUID() };
    courseList = [...courseList, newCourse];
    emit();
    return newCourse;
  },
  update(id: string, data: Partial<Omit<Course, "id">>) {
    courseList = courseList.map((c) => (c.id === id ? { ...c, ...data } : c));
    emit();
  },
  remove(id: string) {
    courseList = courseList.filter((c) => c.id !== id);
    emit();
  },
};
