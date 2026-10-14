import { addDays, PROTOTYPE_TODAY as T } from "@/lib/dates";
import type { Project } from "@/lib/types";

export const sampleProjects: Project[] = [
  {
    id: "p1",
    name: "Lane's Lair",
    description: "Personal command center — phase 1 visual prototype.",
    status: "active",
    dueDate: addDays(T, 30),
    color: "violet",
  },
  {
    id: "p2",
    name: "CS 171 — Algorithms",
    description: "Problem sets, midterm prep, and final project.",
    status: "active",
    dueDate: addDays(T, 58),
    color: "blue",
  },
  {
    id: "p3",
    name: "Fall reading list",
    description: "Six technical and fiction books before winter break.",
    status: "active",
    dueDate: addDays(T, 64),
    color: "emerald",
  },
  {
    id: "p4",
    name: "Thanksgiving trip",
    description: "Flights, packing list, and plans with family.",
    status: "planning",
    dueDate: addDays(T, 42),
    color: "amber",
  },
  {
    id: "p5",
    name: "Internship search",
    description: "Summer 2027 applications and interview prep.",
    status: "active",
    dueDate: addDays(T, 21),
    color: "rose",
  },
  {
    id: "p6",
    name: "Apartment refresh",
    description: "New shelves, desk lamp, and a plant corner.",
    status: "on_hold",
    color: "cyan",
  },
];
