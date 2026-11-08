import { createClient } from "@/lib/supabase/client";
import { getVerifiedUserId,TaskDataError } from "./tasks";
import { chessKey,emptyChess,parseChess,type ChessDay } from "@/lib/games/chess/rules";
import type { Difficulty } from "@/lib/games/chess/pack";
import type { ChessAccountAdapter } from "@/lib/games/chess/progress";
import type { PostgrestError } from "@supabase/supabase-js";
function fail(error:PostgrestError):never{
 if(['42P01','42883','PGRST202','PGRST205','23514'].includes(error.code))throw new TaskDataError('Chess sync needs reviewed migration 006. Local history is preserved.');
 if(error.code==='40001')throw new TaskDataError('Different chess progress or preferences on another device. Preview again; neither copy was replaced.');
 throw new TaskDataError('Chess sync failed. Your local progress is preserved; retry after checking your connection.');
}
export function chessAccountAdapter(accountId:string):ChessAccountAdapter{
 async function db(){if(await getVerifiedUserId()!==accountId)throw new TaskDataError('Your account changed. Reload before syncing chess.');return createClient();}
 return {
  load:async()=>{const client=await db(),progress=emptyChess();for(let start=0;;start+=1000){const {data,error}=await client.from('game_progress').select('puzzle_date,difficulty,state').eq('user_id',accountId).eq('game_id','chess').eq('puzzle_version',1).order('puzzle_date').order('difficulty').range(start,start+999);if(error)fail(error);for(const row of data??[])progress.days[chessKey(row.puzzle_date,row.difficulty as Difficulty)]=row.state;if((data?.length??0)<1000)break;}
   const {data,error}=await client.from('game_preferences').select('show_streak,revision').eq('user_id',accountId).eq('game_id','chess').maybeSingle();if(error)fail(error);progress.showStreak=data?.show_streak??false;return {progress:parseChess(JSON.stringify(progress)),preference:data?{showStreak:data.show_streak,revision:Number(data.revision)}:null};},
  submit:async(key:string,state:ChessDay,id:string)=>{const match=/^chess\/v1\/(\d{4}-\d{2}-\d{2})\/(beginner|intermediate|advanced)$/.exec(key);if(!match)throw new TaskDataError('Invalid chess identity.');parseChess(JSON.stringify({...emptyChess(),days:{[key]:state}}));const {error}=await(await db()).rpc('submit_chess_progress',{p_operation_id:id,p_date:match[1],p_difficulty:match[2],p_state:state});if(error)fail(error);},
  preference:async(show,revision,id)=>{const {error}=await(await db()).rpc('set_chess_streak',{p_operation_id:id,p_show_streak:show,p_expected_revision:revision});if(error)fail(error);},
 };
}
