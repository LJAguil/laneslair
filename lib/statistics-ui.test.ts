import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StatisticsReport } from "@/components/statistics/statistics-view";
import { statisticsRange } from "./statistics";
import { loadingStatistics, type StatisticsSnapshot } from "./data/statistics";
import { navItems } from "@/components/shell/nav-items";
const range=statisticsRange("2026-11-08",7);
const empty:StatisticsSnapshot={journal:{status:"ready",data:[]},habits:{status:"ready",data:{habits:[],logs:[]}},tasks:{status:"ready",data:[]}};
function render(snapshot:StatisticsSnapshot,quantityId=""){return renderToStaticMarkup(createElement(StatisticsReport,{range,snapshot,quantityId,onQuantityChange:vi.fn(),loadedAt:null,refresh:vi.fn(async()=>{})}));}
describe("Statistics presentation (rendered markup, not live browser)",()=>{
  it("separates loading from real empty source results",()=>{
    const loading=render(loadingStatistics());expect(loading).toContain("Loading this source");expect(loading).not.toContain("No saved entries dated");
    const html=render(empty);expect(html).toContain("No saved entries dated");expect(html).toContain("No habit logs recorded");expect(html).toContain("No currently completed tasks");
  });
  it("keeps failed journal data unavailable without suppressing successful task/habit counts",()=>{
    const html=render({...empty,journal:{status:"error",error:"Journal unavailable"},tasks:{status:"ready",data:[{id:"task",status:"done",completedAt:"2026-11-08T12:00:00"}]}});
    expect(html).toContain("Journal unavailable");expect(html).toContain("Unavailable");expect(html).not.toContain("No saved entries dated");expect(html).toContain("Tasks still marked Done");
  });
  it("provides exact quantity values and saved targets in a captioned accessible table",()=>{
    const html=render({...empty,habits:{status:"ready",data:{habits:[{id:"water",name:"Water",unit:"glasses",trackingType:"quantity",isActive:false}],logs:[{habitId:"water",date:"2026-11-08",amount:8,target:8}]}}});
    expect(html).toContain("8 glasses");expect(html).toContain("Saved target");expect(html).toContain("Quantity trend values");expect(html).toContain("archived now");expect(html).toContain("Average denominator: logged days only");expect(html).toContain("Unknown");
  });
  it("renders the explicitly selected quantity without adding values from other units",()=>{
    const html=render({...empty,habits:{status:"ready",data:{habits:[{id:"a",name:"Cups",unit:"cups",trackingType:"quantity",isActive:true},{id:"b",name:"Metric water",unit:"mL",trackingType:"quantity",isActive:true}],logs:[{habitId:"a",date:"2026-11-08",amount:4,target:8},{habitId:"b",date:"2026-11-08",amount:500,target:1000}]}}},"b");
    expect(html).toContain("500 mL");expect(html).not.toContain("504 mL");expect(html).not.toContain("504 cups");
  });
  it("labels metric limits and separates local games and sample features from account statistics",()=>{
    const html=render(empty);expect(html).toContain("not an adherence rate");expect(html).toContain("Excludes reopened/cancelled tasks");expect(html).toContain("device-local games are excluded");expect(html).toContain("Dates follow this device");expect(html).toContain('href="/overview"');
  });
  it("preserves Overview and primary phone navigation with one separate Statistics destination",()=>{
    expect(navItems.filter(item=>item.href==="/statistics")).toHaveLength(1);expect(navItems.find(item=>item.href==="/overview")?.label).toBe("Overview");expect(navItems.slice(0,4).map(item=>item.href)).toEqual(["/","/inbox","/tasks","/projects"]);
  });
});
