import { describe,expect,it } from "vitest";
import { runInNewContext } from "node:vm";
import { THEMES,validTheme,THEME_BOOTSTRAP } from "./themes";
function luminance(hex:string) { const rgb=hex.slice(1).match(/../g)!.map((n) => parseInt(n,16)/255).map((n) => n <= 0.04045 ? n/12.92 : ((n+0.055)/1.055)**2.4); return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722; }
describe("theme preferences",() => {
  it("accepts only supported themes and recovers invalid saved preferences",() => { expect(validTheme("voyage")).toBe("voyage"); expect(validTheme("shire")).toBe("shire"); for(const bad of [null,"light","<script>",{}]) expect(validTheme(bad)).toBe("lair"); });
  it("keeps primary text readable against each theme's surfaces",() => { for(const t of THEMES) for(const surface of [t.background,t.panel]) expect((luminance(t.ink)+0.05)/(luminance(surface)+0.05)).toBeGreaterThanOrEqual(4.5); });
  it("restores a saved theme before hydration and ignores unexpected storage values",() => {
    for (const [saved,expected] of [["shire","shire"],["voyage","voyage"],["<script>","lair"]]) {
      const dataset:Record<string,string>={};
      runInNewContext(THEME_BOOTSTRAP,{localStorage:{getItem:() => saved},document:{documentElement:{dataset}}});
      expect(dataset.theme).toBe(expected);
    }
    expect(() => runInNewContext(THEME_BOOTSTRAP,{localStorage:{getItem:() => {throw Error("blocked");}}})).not.toThrow();
  });
});
