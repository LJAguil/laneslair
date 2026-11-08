import { describe, expect, it } from "vitest";
import { reminderDraft, reminderInput } from "./reminder-draft";

const ID="11111111-1111-4111-8111-111111111111";
describe("reminders beside items",()=>{
  it("starts opted out with no inferred date or time, even when the item has a due date",()=>{
    expect(reminderDraft(undefined,"America/Chicago")).toEqual({enabled:false,date:"",time:"",zone:"America/Chicago"});
  });
  it("prefills the saved rule without shifting its calendar date or time zone",()=>{
    const draft=reminderDraft({id:ID,task_id:ID,habit_id:null,enabled:true,local_date:"2027-03-14",local_time:"09:00:00",time_zone:"America/Chicago"},"UTC");
    expect(draft).toEqual({enabled:true,date:"2027-03-14",time:"09:00",zone:"America/Chicago"});
    expect(reminderInput("task",ID,draft)).toMatchObject({task_id:ID,habit_id:null,local_date:"2027-03-14",local_time:"09:00",time_zone:"America/Chicago"});
  });
  it("requires explicit task dates and times before creating the item",()=>{
    expect(()=>reminderInput("task",ID,{enabled:true,date:"",time:"09:00",zone:"UTC"})).toThrow(/date/);
    expect(()=>reminderInput("task",ID,{enabled:true,date:"2027-01-01",time:"",zone:"UTC"})).toThrow(/time/);
  });
  it("stores habit reminders as daily times, not one-time task dates",()=>{
    expect(reminderInput("habit",ID,{enabled:true,date:"2027-01-01",time:"18:00",zone:"UTC"})).toEqual({task_id:null,habit_id:ID,local_date:null,local_time:"18:00",time_zone:"UTC",enabled:true});
  });
});
