/* eslint-disable @typescript-eslint/no-require-imports -- Local authoring tool uses CommonJS hooks to read typed content without another loader dependency. */
// Generates reviewable SQL locally. No network, credentials or database connection.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,...args);};
require.extensions['.ts']=function(module,file){module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);};
const {ECHO_PACK,ROUNDS_PER_DAY}=require('../lib/games/echoes/pack.ts'),{validatePack}=require('../lib/games/echoes/rules.ts');validatePack();
if(ECHO_PACK.length!==18||ROUNDS_PER_DAY!==3)throw new Error('Frozen v1 rotation must remain 18 scenes / 3 per day.');
const manifest=Array.from({length:6},(_,index)=>ECHO_PACK.slice(index*3,index*3+3).map(round=>({id:round.id,choices:round.choices.map(c=>c.id),answers:round.answers})));
const template=fs.readFileSync(path.join(root,'database/echoes-migration-template.sql'),'utf8'),old=fs.readFileSync(path.join(root,'database/migrations/20261108_005_game_progress.sql'),'utf8');
const preference=old.slice(old.indexOf('create function public.set_game_streak'),old.indexOf('revoke all on function public.rune_v1_answer')).replaceAll('set_game_streak','set_echoes_streak').replaceAll("'rune-lock'","'echoes'").replace("'kind','preference'","'kind','echoes-preference'");
fs.writeFileSync(path.join(root,'database/migrations/20261108_007_echoes_progress.sql'),template.replace('/* ECHO_MANIFEST */',()=>JSON.stringify(manifest)).replace('/* ECHO_PREFERENCE_FUNCTION */',()=>preference));
console.log('Validated 18 original scenes; generated review-only migration 007 (no database connection).');
console.log('Frozen content SHA-256:',require('node:crypto').createHash('sha256').update(JSON.stringify(ECHO_PACK)).digest('hex')); 
