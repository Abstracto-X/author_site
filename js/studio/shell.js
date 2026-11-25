(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const show=(id,value=true)=>{$(id).hidden=!value;};
  function gate(title,message,{signin=false,retry=false}={}) {
    $('gate-heading').textContent=title; $('gate-message').textContent=message;
    show('gate-signin',signin); show('gate-retry',retry); show('studio-gate');
  }
  function notice(message='',error=false) {
    $('studio-notice').textContent=message;
    $('studio-notice').dataset.error=String(error);
    show('studio-notice',!!message);
  }
  async function start() {
    const cfg=window.SUBSCRIPTION_SITE_CONFIG?.supabase;
    if (!cfg || !window.supabase || !window.AuthorSession || window.SITE_CONFIGURATION_STATUS?.ok!==true) {
      gate('Studio setup required','The site configuration or a required script did not load.',{retry:true}); return null;
    }
    const lifetime=window.AuthorSession.create((...args)=>window.fetch(...args));
    const client=window.supabase.createClient(cfg.url,cfg.anonKey,{
      global:{fetch:lifetime.fetch},auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'pkce'}
    });
    const {data,error}=await client.auth.getSession();
    if (error) throw error;
    const user=data.session?.user;
    if (!user || user.is_anonymous) {
      gate('Administrator sign-in required','Sign in with the administrator account, then reopen Studio.',{signin:true}); return null;
    }
    lifetime.bind(user.id);
    let invalid=false;
    client.auth.onAuthStateChange((event,session)=>{
      if ((!session || session.user?.id!==user.id || session.user.is_anonymous) && !invalid) {
        invalid=true; lifetime.invalidate();
        for (const id of ['studio-library','studio-editor','new-post','editor-actions','back-posts','editor-state']) show(id,false);
        notice();
        gate('Session changed','Reload Studio before continuing. Verify any in-flight save before retrying.',{retry:true});
      }
    });
    const {data:profile,error:err}=await client.from('profiles').select('id,role').eq('id',user.id).maybeSingle();
    if (invalid) return null;
    if (err) throw err;
    if (profile?.role!=='admin') {
      gate('Administrator access required','The current account does not have permission to open Studio.',{signin:true}); return null;
    }
    return {client,isActive:()=>!invalid};
  }
  $('gate-retry').addEventListener('click',()=>location.reload());
  window.StudioShell={$ , show, gate, notice, start};
}());
