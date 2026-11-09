"use client";
import { Keyboard } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
/** Dismisses the keyboard only. Drafts stay intact; no submit, save or navigation. */
export function KeyboardControls({inDialog=false}:{inDialog?:boolean}){
 return <div role="group" data-keyboard-controls className={cn('keyboard-controls',inDialog?'keyboard-controls-dialog':'keyboard-controls-global')} aria-label="Typing controls">
  <span className="text-xs text-muted">Keeps your text · doesn’t save</span>
  <Button size="sm" className="min-h-11 shrink-0" onPointerDown={event=>event.preventDefault()} onClick={()=>{const focused=document.activeElement;if(focused instanceof HTMLElement)focused.blur();}}>
   <Keyboard aria-hidden="true" className="h-4 w-4" />Done typing
  </Button>
 </div>;
}
