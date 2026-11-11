import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReminderRule } from "./types";
const mock=vi.hoisted(()=>({rule:undefined as ReminderRule|undefined,addTask:vi.fn(),editTask:vi.fn(),addHabit:vi.fn(),editHabit:vi.fn(),save:vi.fn()}));
vi.mock("@/lib/store/app-store",()=>({
  useAppState:()=>({today:"2027-01-01",tasks:[],projects:[],projectsStatus:"ready",habits:[]}),
  useAppActions:()=>({addTask:mock.addTask,editTask:mock.editTask,addHabit:mock.addHabit,editHabit:mock.editHabit,notify:vi.fn()}),
}));
vi.mock("@/components/reminders/reminder-provider",()=>({useItemReminder:()=>({rule:mock.rule,rules:mock.rule?[mock.rule]:[],status:"ready",error:null,preferences:{time_zone:"America/Chicago",paused:false},reload:vi.fn(),save:mock.save,remove:vi.fn()})}));
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { ReminderButton } from "@/components/reminders/reminder-button";

beforeEach(()=>{mock.rule=undefined;vi.clearAllMocks();});
describe("reminder entry points (rendered markup, not an interactive browser)",()=>{
  it("puts opted-out reminder controls in both creation forms without writing data",()=>{
    for(const Component of [TaskFormDialog,HabitFormDialog]){
      const html=renderToStaticMarkup(createElement(Component,{open:true,onClose:vi.fn()}));
      expect(html).toContain("Remind me");expect(html).not.toContain("Reminder time zone");expect(html).not.toMatch(/>(Daily reminder time|Reminder time)<\/label>/);
    }
    expect(mock.addTask).not.toHaveBeenCalled();expect(mock.addHabit).not.toHaveBeenCalled();expect(mock.save).not.toHaveBeenCalled();
  });
  it("prefills an existing task's explicit reminder independently of its due date",()=>{
    mock.rule={id:"rule",task_id:"task",habit_id:null,enabled:true,local_date:"2027-02-05",local_time:"09:30:00",time_zone:"America/Chicago"};
    const html=renderToStaticMarkup(createElement(TaskFormDialog,{open:true,onClose:vi.fn(),task:{id:"task",title:"Read",dueDate:"2027-02-01",dueTime:"15:45",priority:"medium",status:"todo",createdAt:"2027-01-01"}}));
    expect(html).toContain('value="2027-02-05"');expect(html).toContain('value="2027-02-01"');expect(html).toContain('value="09:30"');expect(html).toContain('value="America/Chicago"');
    expect(html).toContain('value="15:45"');
    expect(mock.editTask).not.toHaveBeenCalled();expect(mock.save).not.toHaveBeenCalled();
  });
  it("provides a named bell action with active reminder feedback",()=>{
    let html=renderToStaticMarkup(createElement(ReminderButton,{kind:"habit",id:"habit",name:"Water"}));
    expect(html).toContain('aria-label="Set reminder for “Water”"');
    mock.rule={id:"rule",task_id:null,habit_id:"habit",enabled:true,local_date:null,local_time:"18:00:00",time_zone:"UTC"};
    html=renderToStaticMarkup(createElement(ReminderButton,{kind:"habit",id:"habit",name:"Water"}));
    expect(html).toContain('aria-label="Edit reminder for “Water”"');expect(html).toContain('Reminder at 18:00');
  });
});
