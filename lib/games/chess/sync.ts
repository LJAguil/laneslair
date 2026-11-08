import { createGameSync } from "../game-sync";
import { mergeChess,type ChessDay,type ChessProgress } from "./rules";
import { previewChess,sameChess,sameChessDay,type ChessAccountAdapter } from "./progress";
import type { PlayStorage } from "../play-store";
import type { ChessStore } from "./store";
export function createChessSync(accountId:string,store:ChessStore,adapter:ChessAccountAdapter,storage:PlayStorage){return createGameSync<ChessProgress,ChessDay>(store,adapter,storage,{merge:mergeChess,preview:previewChess,same:sameChess,sameEntry:sameChessDay},{key:`lanes-lair-chess-sync-v1:${accountId}`,backupKey:`lanes-lair-chess-before-sync-v1:${accountId}`});}
export type ChessSync=ReturnType<typeof createChessSync>;
