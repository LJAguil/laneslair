import { addDays, PROTOTYPE_TODAY as T } from "@/lib/dates";
import type { AppNotification, Conversation, ScheduleItem, UserProfile } from "@/lib/types";

export const sampleProfile: UserProfile = {
  name: "Lane",
  email: "lane@example.com",
  timeZone: "America/Los_Angeles",
};

const at = (offset: number, time: string) => `${addDays(T, offset)}T${time}:00`;

export const sampleSchedule: ScheduleItem[] = [
  { id: "s1", title: "CS 171 lecture", startsAt: at(0, "10:00"), endsAt: at(0, "11:20"), location: "Hall B, Room 104", kind: "class" },
  { id: "s2", title: "Study group — problem set 4", startsAt: at(0, "13:30"), endsAt: at(0, "15:00"), location: "Library, 3rd floor", kind: "meeting" },
  { id: "s3", title: "Gym — leg day", startsAt: at(0, "17:30"), endsAt: at(0, "18:30"), kind: "personal" },
  { id: "s4", title: "Dinner with Jordan", startsAt: at(0, "19:30"), endsAt: at(0, "21:00"), location: "Sora Ramen", kind: "personal" },
  { id: "s5", title: "Advisor office hours", startsAt: at(1, "11:00"), endsAt: at(1, "11:30"), location: "Zoom", kind: "meeting" },
  { id: "s6", title: "Thursday Night Jazz", startsAt: at(1, "20:00"), endsAt: at(1, "22:30"), location: "The Blue Room", kind: "event" },
];

export const sampleNotifications: AppNotification[] = [
  { id: "n1", kind: "reminder", title: "Due today", body: "Finish CS 171 problem set 4", createdAt: at(0, "08:00"), read: false, href: "/tasks" },
  { id: "n2", kind: "reminder", title: "Overdue", body: "Renew car registration was due yesterday", createdAt: at(0, "08:00"), read: false, href: "/tasks" },
  { id: "n3", kind: "habit", title: "Keep the streak alive", body: "Morning workout — 5 days in a row", createdAt: at(0, "07:30"), read: false, href: "/habits" },
  { id: "n4", kind: "event", title: "Saved event tomorrow", body: "Thursday Night Jazz at 8 PM", createdAt: at(-1, "18:00"), read: true, href: "/discover" },
  { id: "n5", kind: "project", title: "Milestone reached", body: "Internship search hit 19 applications", createdAt: at(-2, "15:10"), read: true, href: "/projects" },
];

export const sampleConversations: Conversation[] = [
  {
    id: "c1",
    title: "Plan my Thursday",
    messages: [
      { id: "c1m1", role: "user", content: "Can you help me plan tomorrow? I have office hours at 11 and want to go to the jazz show." },
      {
        id: "c1m2",
        role: "assistant",
        content:
          "Here's a balanced plan for Thursday:\n\n• 8:00 – Morning workout (keeps your streak going)\n• 9:00 – Sketch the onboarding flow for Lane's Lair (due tomorrow)\n• 11:00 – Advisor office hours — bring your spring schedule questions\n• 1:00 – Two focused hours on interview prep\n• 6:00 – Dinner, then head to The Blue Room for 8:00\n\nWant me to turn any of these into tasks?",
      },
    ],
  },
  {
    id: "c2",
    title: "Weekend ideas",
    messages: [
      { id: "c2m1", role: "user", content: "What's happening this weekend that's outdoors?" },
      {
        id: "c2m2",
        role: "assistant",
        content:
          "Two good options: the Sunrise Ridge Trail Hike on Sunday at 7 AM (free, 5 miles), and the Community Garden Volunteer Day on Monday morning. You already saved the hike.",
      },
    ],
  },
  {
    id: "c3",
    title: "Reading goal check-in",
    messages: [
      { id: "c3m1", role: "user", content: "Am I on track for my reading goal?" },
      {
        id: "c3m2",
        role: "assistant",
        content:
          "You've read 17 of 24 books. With about 11 weeks left in the year, that's roughly one book every 11 days — doable if you keep your 20-pages-a-day habit.",
      },
    ],
  },
];

export const suggestedPrompts: string[] = [
  "What should I focus on today?",
  "Summarize my overdue tasks",
  "Find a free event this weekend",
  "How are my habits trending?",
];
