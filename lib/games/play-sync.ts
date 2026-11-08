import { mergePlayProgress,type PlayStorage,type PlayStore } from "./play-store";
import { previewImport,sameProgress,type PlayAccountAdapter } from "./catalog";
import type { PlayProgress,LockDay } from "./rune-lock";
import { createGameSync,type GameSyncSnapshot } from "./game-sync";
export type SyncSnapshot=GameSyncSnapshot<PlayProgress>;
export function createPlaySync(accountId:string,store:PlayStore,adapter:PlayAccountAdapter,storage:PlayStorage){return createGameSync<PlayProgress,LockDay>(store,adapter,storage,{merge:mergePlayProgress,preview:previewImport,same:sameProgress},{key:`lanes-lair-play-sync-v1:${accountId}`,backupKey:`lanes-lair-play-before-sync-v1:${accountId}`});}
export type PlaySync=ReturnType<typeof createPlaySync>;
