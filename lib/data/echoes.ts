import { createClient } from "@/lib/supabase/client";
import { getVerifiedUserId,TaskDataError } from "./tasks";
import { echoKey,emptyEcho,parseEcho,type EchoDay } from "@/lib/games/echoes/rules";
import type { EchoAdapter } from "@/lib/games/echoes/sync";
import type { PostgrestError } from "@supabase/supabase-js";
function fail(error:PostgrestError):never{
 if(['42P01','42883','PGRST202','PGRST205','23514'].includes(error.code))throw new TaskDataError('Echoes sync needs reviewed migration 007. Local history is preserved.');
 if(error.code==='40001')throw new TaskDataError('Different Echoes progress or preferences on another device. Preview again; neither copy was replaced.');
 throw new TaskDataError('Echoes sync failed. Your local progress is preserved; retry after checking your connection.');
}
export function echoesAccountAdapter(accountId:string):EchoAdapter{
 async function db(){if(await getVerifiedUserId()!==accountId)throw new TaskDataError('Your account changed. Reload before syncing Echoes.');return createClient();}
 return {
  load:async()=>{const client=await db(),progress=emptyEcho();for(let start=0;;start+=1000){const {data,error}=await client.from('game_progress').select('puzzle_date,state').eq('user_id',accountId).eq('game_id','echoes').eq('puzzle_version',1).eq('difficulty','standard').order('puzzle_date').range(start,start+999);if(error)fail(error);for(const row of data??[])progress.days[echoKey(row.puzzle_date)]=row.state;if((data?.length??0)<1000)break;}
   const {data,error}=await client.from('game_preferences').select('show_streak,revision').eq('user_id',accountId).eq('game_id','echoes').maybeSingle();if(error)fail(error);progress.showStreak=data?.show_streak??false;return {progress:parseEcho(JSON.stringify(progress)),preference:data?{showStreak:data.show_streak,revision:Number(data.revision)}:null};},
  submit:async(key:string,state:EchoDay,id:string)=>{const match=/^echoes\/v1\/(\d{4}-\d{2}-\d{2})\/standard$/.exec(key);if(!match)throw new TaskDataError('Invalid Echoes identity.');parseEcho(JSON.stringify({...emptyEcho(),days:{[key]:state}}));const {error}=await(await db()).rpc('submit_echoes_progress',{p_operation_id:id,p_date:match[1],p_state:state});if(error)fail(error);},
  preference:async(show,revision,id)=>{const {error}=await(await db()).rpc('set_echoes_streak',{p_operation_id:id,p_show_streak:show,p_expected_revision:revision});if(error)fail(error);},
 };
}
