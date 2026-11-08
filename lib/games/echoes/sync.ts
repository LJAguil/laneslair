import type { SyncAccount,SyncAdapter,SyncPreview } from "../game-sync";
import { createGameSync } from "../game-sync";
import { mergeEcho,parseEcho,sameEcho,sameEchoDay,type EchoDay,type EchoProgress } from "./rules";
import type { EchoStore } from "./store";
import type { PlayStorage } from "../play-store";
export type EchoAccount=SyncAccount<EchoProgress>;
export type EchoAdapter=SyncAdapter<EchoProgress,EchoDay>;
export function previewEcho(local:EchoProgress,account:EchoProgress):SyncPreview<EchoProgress>{
 parseEcho(JSON.stringify(local));parseEcho(JSON.stringify(account));const dates=[...new Set([...Object.keys(local.days),...Object.keys(account.days)])].sort();const conflicts=dates.filter(key=>{try{mergeEcho({...account,days:account.days[key]?{[key]:account.days[key]}:{}},{...local,days:local.days[key]?{[key]:local.days[key]}:{}});return false;}catch{return true;}});return {dates,conflicts,merged:conflicts.length?null:mergeEcho(account,local),localDays:Object.keys(local.days).length,accountDays:Object.keys(account.days).length};
}
export function createEchoSync(accountId:string,store:EchoStore,adapter:EchoAdapter,storage:PlayStorage){return createGameSync<EchoProgress,EchoDay>(store,adapter,storage,{merge:mergeEcho,preview:previewEcho,same:sameEcho,sameEntry:sameEchoDay},{key:`lanes-lair-echoes-sync-v1:${accountId}`,backupKey:`lanes-lair-echoes-before-sync-v1:${accountId}`});}
export type EchoSync=ReturnType<typeof createEchoSync>;
