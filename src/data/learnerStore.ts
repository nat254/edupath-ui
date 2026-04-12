import { mockLearners } from "./mockData";

export interface Learner {
  id: string;
  name: string;
  nationalId: string;
  organization: string;
  coursesCompleted: number;
  coursesInProgress: number;
}

let learnerList: Learner[] = [...mockLearners];
let listeners: (() => void)[] = [];

function emit() {
  listeners.forEach((l) => l());
}

export const learnerStore = {
  subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
  getAll() {
    return learnerList;
  },
  getById(id: string) {
    return learnerList.find((l) => l.id === id) ?? null;
  },
  add(learner: Omit<Learner, "id">) {
    const newLearner: Learner = { ...learner, id: crypto.randomUUID() };
    learnerList = [...learnerList, newLearner];
    emit();
    return newLearner;
  },
  update(id: string, data: Partial<Omit<Learner, "id">>) {
    learnerList = learnerList.map((l) => (l.id === id ? { ...l, ...data } : l));
    emit();
  },
  remove(id: string) {
    learnerList = learnerList.filter((l) => l.id !== id);
    emit();
  },
};
