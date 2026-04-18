export interface Testimonial {
  id: string;
  name: string;
  role: string;
  rating: number;
  text: string;
}

const defaultTestimonials: Testimonial[] = [
  { id: "t1", name: "Dr. Amina Osei", role: "Senior Physician, KNH", rating: 5, text: "TrainHub transformed how our team stays up-to-date. The courses are practical and well-structured." },
  { id: "t2", name: "James Mutua", role: "Nurse, Coast General", rating: 5, text: "I completed my certification in just two weeks. The quiz system really helped reinforce what I learned." },
  { id: "t3", name: "Grace Wambui", role: "Lab Technician, Nairobi Hospital", rating: 4, text: "Easy to use, even on mobile. I love tracking my progress and picking up where I left off." },
];

let testimonials: Testimonial[] = [...defaultTestimonials];
let listeners: Array<() => void> = [];

export const testimonialStore = {
  getAll: () => testimonials,
  add: (t: Omit<Testimonial, "id">) => {
    testimonials = [{ ...t, id: `t${Date.now()}` }, ...testimonials];
    listeners.forEach((l) => l());
  },
  remove: (id: string) => {
    testimonials = testimonials.filter((t) => t.id !== id);
    listeners.forEach((l) => l());
  },
  subscribe: (listener: () => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },
};
