import { afterEach, describe, expect, it, vi } from "vitest";
import { habitStatistics, journalStatistics, quantityStatistics, statisticsRange, taskStatistics, type HabitStatisticsData } from "./statistics";
const range=()=>statisticsRange("2026-11-08",7);
const data:HabitStatisticsData={habits:[{id:"glass",name:"Water",unit:"glasses",trackingType:"quantity",isActive:true},{id:"ml",name:"More water",unit:"mL",trackingType:"quantity",isActive:false},{id:"read",name:"Read",unit:"check-in",trackingType:"check",isActive:true}],logs:[{habitId:"glass",date:"2026-11-02",amount:8,target:8},{habitId:"glass",date:"2026-11-03",amount:3,target:10},{habitId:"glass",date:"2026-11-04",amount:0,target:8},{habitId:"ml",date:"2026-11-02",amount:500,target:500},{habitId:"read",date:"2026-11-08",amount:1,target:1}]};
afterEach(()=>vi.unstubAllEnvs());
describe("Statistics metrics and calendar boundaries",()=>{
  it("uses exact inclusive 7/30/90-day calendar ranges with correct year/leap boundaries",()=>{
    expect(range().from).toBe("2026-11-02");for(const length of [7,30,90] as const)expect(statisticsRange("2026-11-08",length).dates).toHaveLength(length);
    expect(statisticsRange("2024-03-01",7).dates).toContain("2024-02-29");expect(statisticsRange("2027-01-02",7).from).toBe("2026-12-27");
  });
  it("uses local half-open timestamp boundaries across DST rather than assuming 24-hour days",()=>{
    vi.stubEnv("TZ","America/Chicago");const fall=statisticsRange("2026-11-01",7);
    expect(fall.utcFrom).toBe("2026-10-26T05:00:00.000Z");expect(fall.utcUntil).toBe("2026-11-02T06:00:00.000Z");
    const spring=statisticsRange("2027-03-14",7);expect(spring.utcFrom).toBe("2027-03-08T06:00:00.000Z");expect(spring.utcUntil).toBe("2027-03-15T05:00:00.000Z");
  });
  it("counts distinct journal entry dates using all calendar days as denominator",()=>{
    const result=journalStatistics(["2026-11-01","2026-11-02","2026-11-02","2026-11-08","2026-11-09"],range());expect(result.count).toBe(2);expect(result.denominator).toBe(7);expect(result.percent).toBeCloseTo(200/7);
    expect(journalStatistics([],range()).count).toBe(0);
  });
  it("uses recorded logs as the habit denominator, including archived/zero records and saved targets",()=>{
    const result=habitStatistics(data,range());expect(result.recorded).toBe(5);expect(result.reached).toBe(3);expect(result.percent).toBe(60);expect(result.days).toBe(4);
    expect(habitStatistics({habits:data.habits,logs:[]},range()).percent).toBeNull();
  });
  it("never combines units and averages quantities over logged days, not the whole date range",()=>{
    const glass=quantityStatistics(data,"glass",range())!;expect(glass.total).toBe(11);expect(glass.recordedDays).toBe(3);expect(glass.mean).toBeCloseTo(11/3);expect(glass.reached).toBe(1);
    expect(glass.rows.find(row=>row.date==="2026-11-04")?.log?.amount).toBe(0);expect(glass.rows.find(row=>row.date==="2026-11-05")?.log).toBeUndefined();
    expect(quantityStatistics(data,"ml",range())?.total).toBe(500);expect(quantityStatistics(data,"read",range())).toBeNull();
  });
  it("excludes reopened, cancelled, undated and out-of-range tasks without inventing historical totals",()=>{
    const result=taskStatistics([{id:"a",status:"done",completedAt:"2026-11-02T00:00:00"},{id:"b",status:"done",completedAt:"2026-11-08T23:59:59"},{id:"c",status:"todo",completedAt:"2026-11-04T12:00:00"},{id:"d",status:"cancelled",completedAt:"2026-11-04T12:00:00"},{id:"e",status:"done"},{id:"f",status:"done",completedAt:"2026-11-01T23:59:59"},{id:"g",status:"done",completedAt:"2026-11-09T00:00:00"}],range());expect(result.count).toBe(2);
  });
  it("deduplicates records by their database identity and does not mutate inputs",()=>{
    const duplicate={...data,logs:[...data.logs,data.logs[0]]};const before=JSON.stringify(duplicate);expect(habitStatistics(duplicate,range()).recorded).toBe(5);quantityStatistics(duplicate,"glass",range());expect(JSON.stringify(duplicate)).toBe(before);
  });
});
