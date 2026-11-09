const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('deployment environment template documents every directly referenced Edge environment name',()=>{
 const template=fs.readFileSync(path.join(root,'ENV.example'),'utf8');
 for(const file of files(path.join(root,'supabase/functions')).filter(f=>f.endsWith('.ts'))){const code=fs.readFileSync(file,'utf8');for(const m of code.matchAll(/(?:Deno\.env\.get|requireEnv|optionalEnv)\(['"]([A-Z0-9_]+)['"]/g))assert.ok(template.includes(m[1]+'='),m[1]);}
 assert.doesNotMatch(fs.readFileSync(path.join(root,'supabase/functions/send-reader-email-queue/index.ts'),'utf8'),/EvilArchives/);
});
