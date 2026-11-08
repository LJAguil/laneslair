import type { InboxNote, JournalEntry, JournalSource } from "@/lib/types";

export const MAX_JOURNAL_LENGTH=100000;
export function validJournalDate(date:string):boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
}
export function journalBody(body:string):string {
  if(!body.trim())throw new Error("Write something before saving your entry.");
  if(body.length>MAX_JOURNAL_LENGTH)throw new Error("Keep each entry under 100,000 characters.");
  return body;
}
export function appendJournalBody(existing:string,capture:string):string {return existing?`${existing}\n\n${capture}`:capture;}
export function journalDirty(body:string,base:JournalEntry|null):boolean {return body!==(base?.body??"");}
export function captureIsUnsorted(note:InboxNote,sources:JournalSource[]):boolean {
  return !note.archivedAt&&!note.convertedAt&&!sources.some(source=>source.noteId===note.id);
}
