"use client";
import { useEffect } from "react";
import { watchKeyboard } from "@/lib/browser/keyboard";
/** Track the visible keyboard area without moving the user's cursor or page. */
export function ViewportSync(){useEffect(()=>watchKeyboard(window,document.documentElement),[]);return null;}
