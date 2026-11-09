const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
test('offline preflight accepts current public config and rejects unconfigured target placeholder',()=>{
 const ok=spawnSync(process.execPath,['scripts/check-site-config.js'],{cwd:root,encoding:'utf8'});assert.equal(ok.status,0,ok.stderr);assert.match(ok.stdout,/NOT checked/);
 const missing=spawnSync(process.execPath,['scripts/check-site-config.js','js/subscription/site-config.abstracto.template.js'],{cwd:root,encoding:'utf8'});assert.equal(missing.status,1);assert.doesNotMatch(missing.stderr,/YOUR_SUPABASE|sb_publishable_/);
});
