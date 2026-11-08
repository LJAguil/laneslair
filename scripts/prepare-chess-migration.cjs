/* eslint-disable @typescript-eslint/no-require-imports -- Local-only author tool needs CommonJS hooks to transpile repository TypeScript without adding a loader dependency. */
// Local authoring tool only: regenerates review-only chess manifest and SQL from frozen content.
// No network, credentials, database connections or remote writes.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,...args);};
require.extensions['.ts']=function(module,file){module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);};
const {Chess}=require('chess.js'),{CHESS_PACK}=require('../lib/games/chess/pack.ts'),{startPuzzle,validatePuzzle,uci}=require('../lib/games/chess/rules.ts');
const counts={},manifest=CHESS_PACK.map(p=>{validatePuzzle(p);const board=startPuzzle(p).board,paths=[],prefix=[];
 for(let index=0;index<p.line.length;index+=2){
  for(const move of board.moves({verbose:true})){const copy=new Chess(board.fen());copy.move(move);if(copy.isCheckmate())paths.push([...prefix,move.lan]);}
  board.move(uci(p.line[index]));prefix.push(p.line[index]);if(index+1<p.line.length)board.move(uci(p.line[index+1]));
 }
 paths.push(prefix);const unique=[...new Map(paths.map(line=>[JSON.stringify(line),line])).values()];
 return {id:p.id,difficulty:p.difficulty,index:(counts[p.difficulty]=(counts[p.difficulty]??0)+1)-1,paths:unique};
});
fs.writeFileSync(path.join(root,'lib/games/chess/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const template=fs.readFileSync(path.join(root,'database/chess-migration-template.sql'),'utf8');
const old=fs.readFileSync(path.join(root,'database/migrations/20261108_005_game_progress.sql'),'utf8');
const preference=old.slice(old.indexOf('create function public.set_game_streak'),old.indexOf('revoke all on function public.rune_v1_answer')).replaceAll('set_game_streak','set_chess_streak').replaceAll("'rune-lock'","'chess'").replace("'kind','preference'","'kind','chess-preference'");
fs.writeFileSync(path.join(root,'database/migrations/20261108_006_chess_progress.sql'),template.replace('/* CHESS_MANIFEST */',JSON.stringify(manifest)).replace('/* CHESS_PREFERENCE_FUNCTION */',()=>preference));
console.log(`Validated ${manifest.length} puzzles; generated review-only migration 006 (no database connection).`);
