import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { EntertainmentPicker } from "@/components/entertainment/picker";
it("labels local rules honestly and exposes explicit phone-friendly preferences", () => {
  const html = renderToStaticMarkup(createElement(EntertainmentPicker, { items: [], onOpen: () => {} }));
  for (const text of ["Local rules, not AI", "Available minutes", "Mood / tags", "Pick randomly", "Include unknown lengths", 'inputMode="numeric"']) expect(html).toContain(text);
  expect(html).not.toContain("API key");
  expect(html).toMatch(/type="checkbox" checked=""/);
});
