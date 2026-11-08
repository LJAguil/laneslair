import { createClient } from "@/lib/supabase/client";
import { getVerifiedUserId, TaskDataError } from "./tasks";
import { emptyProgress, parseProgress, type LockDay } from "@/lib/games/rune-lock";
import type { PlayAccountAdapter } from "@/lib/games/catalog";
import type { PostgrestError } from "@supabase/supabase-js";
function fail(error:PostgrestError):never {
  if(["42P01","42883","PGRST202","PGRST205"].includes(error.code))throw new TaskDataError("Account game sync needs setup. Review migration 005 with the owner; local progress is unchanged.");
  if(error.code==="40001")throw new TaskDataError("Another device has different progress or preferences. Preview again; neither history has been replaced.");
  throw new TaskDataError("Couldn’t sync game progress. Local history is preserved. Check your connection and retry.");
}
export function accountPlayAdapter(accountId:string):PlayAccountAdapter {
  async function db(){if(await getVerifiedUserId()!==accountId)throw new TaskDataError("Your account changed. Reload before syncing.");return createClient();}
  return {
    load:async()=>{
      const client=await db(),progress=emptyProgress();
      for(let start=0;;start+=1000){
        const {data,error}=await client.from("game_progress").select("puzzle_date,state").eq("user_id",accountId).eq("game_id","rune-lock").eq("puzzle_version",1).eq("difficulty","standard").order("puzzle_date").range(start,start+999);
        if(error)fail(error);for(const row of data??[])progress.days[row.puzzle_date]=row.state;
        if((data?.length??0)<1000)break;
      }
      const {data,error}=await client.from("game_preferences").select("show_streak,revision").eq("user_id",accountId).eq("game_id","rune-lock").maybeSingle();
      if(error)fail(error);progress.showStreak=data?.show_streak??false;
      return {progress:parseProgress(JSON.stringify(progress)),preference:data?{showStreak:data.show_streak,revision:Number(data.revision)}:null};
    },
    submit:async(date:string,state:LockDay,operationId:string)=>{
      const {error}=await (await db()).rpc("submit_rune_progress",{p_operation_id:operationId,p_date:date,p_state:state});if(error)fail(error);
    },
    preference:async(showStreak,revision,operationId)=>{
      const {error}=await (await db()).rpc("set_game_streak",{p_operation_id:operationId,p_show_streak:showStreak,p_expected_revision:revision});if(error)fail(error);
    },
  };
}
