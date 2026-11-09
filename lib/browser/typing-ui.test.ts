import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe,it,expect } from "vitest";
import { KeyboardControls } from "@/components/ui/keyboard-controls";
import { Dialog } from "@/components/ui/dialog";
import { Input,Textarea } from "@/components/ui/field";
describe('typing controls (simulated markup, not physical iPhone)',()=>{
 it('provides an explicitly non-saving, non-submitting dismiss control',()=>{const html=renderToStaticMarkup(createElement(KeyboardControls));expect(html).toContain('Done typing');expect(html).toContain('doesn’t save');expect(html).toContain('type="button"');expect(html).toContain('keyboard-controls-global');});
 it('puts a separate accessible control inside the native modal top layer',()=>{const html=renderToStaticMarkup(createElement(Dialog,{open:true,onClose:()=>{},title:'Capture'} as Parameters<typeof Dialog>[0],createElement(Textarea,{'aria-label':'Your note'})));expect(html).toContain('keyboard-controls-dialog');expect(html).toContain('Done typing');expect(html).toContain('aria-labelledby');expect(html).toContain('Your note');});
 it('keeps mobile form text readable while retaining native inputs and multiline behavior',()=>{const html=renderToStaticMarkup(createElement(Input,{type:'email'})),text=renderToStaticMarkup(createElement(Textarea,{rows:5}));expect(html).toContain('text-base sm:text-sm');expect(html).toContain('type="email"');expect(text).toContain('rows="5"');expect(text).not.toContain('contenteditable');});
});
