/* Offline preflight for reviewed public config files; not a sandbox for untrusted code. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const configFile = path.resolve(process.argv[2] || path.join(root, 'js/subscription/site-config.js'));
const c = { window:{}, URL, atob };
try {
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(configFile,'utf8'), c, {timeout:1000});
  vm.runInContext(fs.readFileSync(path.join(root,'js/subscription/site-settings.js'),'utf8'), c);
  const config = c.window.SUBSCRIPTION_SITE_CONFIG;
  const result = c.window.SiteSettings.resolve({siteKey:config.siteKey,backendUrl:config.supabase?.url}, config.siteProfiles);
  if (!result.ok) throw new Error(result.error);
  if (!c.window.SiteSettings.publicKeyAllowed(config.supabase.anonKey)) throw new Error('invalid_public_key');
  c.window.SiteSettings.publicRoot(config.publicBaseUrl,'https://preview.invalid/sub/index.html');
  const assets = new Set([...result.stylesheets, ...result.profileFrames.map(frame=>frame.src)]);
  for (const visual of Object.values(result.tierPresentation)) for (const field of ['banner','topbarBanner']) if (visual[field]) assets.add(visual[field]);
  for (const asset of assets) if (!fs.statSync(path.join(root,asset)).isFile()) throw new Error('missing_local_asset');
  for (const file of ['index.html','admin.html','writer.html']) {
    const html=fs.readFileSync(path.join(root,file),'utf8');
    const scripts=['site-config.js','site-settings.js','site-bootstrap.js','site-storage.js'];
    if (file !== 'index.html' && !html.includes('js/author-session.js')) throw new Error('missing_author_request_guard');
    let previous=-1;
    for (const script of scripts) {const index=html.indexOf('js/subscription/'+script);if(index<=previous)throw new Error('invalid_script_order:'+file);previous=index;}
  }
  console.log('PASS: public configuration, site/backend pairing, local assets and three entrypoint script orders.');
  console.log('Live database, Auth/provider allowlists, Edge secrets, storage and browser behavior NOT checked.');
} catch (error) {
  // Do not print config content, keys, arbitrary VM errors or credential-bearing URLs.
  console.error('FAIL: public site configuration preflight. Review settings shape, pairing, public key, roots and local assets.');
  process.exitCode=1;
}
