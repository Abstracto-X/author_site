(function () {
  "use strict";
  const state = { storyId:null, contextChapterId:null, includeContext:false, payload:null, pageId:null, open:false, observer:null, request:0 };

  function ensureStore(){ if(!store.systemProgress || typeof store.systemProgress!=="object") store.systemProgress={}; }
  function activeContext(){
    if(route?.name==="read" && currentChapter) return {story:currentChapter.story,chapterId:currentChapter.ch.id,include:false};
    if(!["story","chapters","recap","extras","storyUpdates"].includes(route?.name)) return null;
    const story=typeof getActiveStory==="function"?getActiveStory():null;
    if(!story)return null;
    ensureStore();
    return {story,chapterId:authState.user?null:(store.systemProgress[story.id]?.chapterId||null),include:true};
  }
  function injectShell(){
    if(document.getElementById("reader-system-launcher"))return;
    const style=document.createElement("style");style.id="reader-system-panel-style";style.textContent=`
      .reader-system-launcher{position:fixed;right:1rem;bottom:5.2rem;z-index:64;border:1px solid rgba(94,231,255,.45);background:rgba(4,12,20,.94);color:#aef5ff;border-radius:999px;padding:.75rem 1rem;box-shadow:0 0 28px rgba(34,211,238,.18);display:none;align-items:center;gap:.55rem;cursor:pointer}.reader-system-launcher.visible{display:flex}.reader-system-launcher .update-dot{width:.55rem;height:.55rem;background:#fbbf24;border-radius:50%;box-shadow:0 0 10px #fbbf24}
      .reader-system-panel{position:fixed;inset:0;z-index:80;display:none}.reader-system-panel.open{display:block}.reader-system-panel-scrim{position:absolute;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(5px)}.reader-system-panel-body{position:absolute;right:0;top:0;bottom:0;width:min(48rem,94vw);background:#05090f;border-left:1px solid rgba(94,231,255,.24);box-shadow:-20px 0 60px rgba(0,0,0,.55);display:flex;flex-direction:column}.reader-system-panel-head{display:flex;justify-content:space-between;align-items:center;padding:.85rem 1rem;border-bottom:1px solid rgba(255,255,255,.09)}.reader-system-panel-head button{border:0;background:transparent;color:#cbd5e1;font-size:1.5rem;cursor:pointer}.reader-system-panel-content{padding:1rem;overflow:auto;flex:1}.reader-system-panel-empty{padding:3rem;text-align:center;color:#94a3b8}
      #system-checkpoint-sentinel{height:2px;width:100%}
      @media(max-width:640px){.reader-system-launcher{right:.7rem;bottom:4.7rem;padding:.65rem .8rem}.reader-system-launcher span{display:none}.reader-system-panel-body{width:100%;top:4vh;border-left:0;border-top:1px solid rgba(94,231,255,.24);border-radius:1rem 1rem 0 0}}
    `;document.head.appendChild(style);
    const launcher=document.createElement("button");launcher.id="reader-system-launcher";launcher.className="reader-system-launcher";launcher.innerHTML='<span aria-hidden="true">◈</span><span>System</span>';launcher.setAttribute("aria-label","Open story system");launcher.addEventListener("click",open);
    const panel=document.createElement("div");panel.id="reader-system-panel";panel.className="reader-system-panel";panel.innerHTML='<div class="reader-system-panel-scrim" data-system-close></div><section class="reader-system-panel-body" role="dialog" aria-modal="true" aria-label="Story system"><header class="reader-system-panel-head"><strong>System</strong><button type="button" data-system-close aria-label="Close">×</button></header><div class="reader-system-panel-content"></div></section>';
    panel.addEventListener("click",event=>{const page=event.target.closest("[data-system-page]");if(page){state.pageId=page.dataset.systemPage;renderPanel();return;}if(event.target.closest("[data-system-close]"))close();});
    document.body.append(launcher,panel);window.AetherSystemCore?.injectStyles();
  }
  async function loadFor(context){
    const client=getSupabase();if(!client||!context?.story)return;
    const token=++state.request;state.storyId=context.story.id;state.contextChapterId=context.chapterId||null;state.includeContext=!!context.include;
    const {data,error}=await client.rpc("get_reader_system_state",{target_story_id:context.story.id,context_chapter_id:context.chapterId||null,include_context:!!context.include});
    if(token!==state.request)return;
    if(error){console.warn("System checkpoint unavailable",error);state.payload=null;updateLauncher();return;}
    state.payload=data&&data.available?data:null;
    if(state.payload&&!state.pageId)state.pageId=state.payload.definition?.startPageId;
    if(state.payload&&!state.payload.definition?.pages?.some(page=>page.id===state.pageId))state.pageId=state.payload.definition?.startPageId;
    updateLauncher();if(state.open)renderPanel();
  }
  function updateLauncher(updated){
    const launcher=document.getElementById("reader-system-launcher");if(!launcher)return;
    launcher.classList.toggle("visible",!!state.payload);
    const old=launcher.querySelector(".update-dot");if(old)old.remove();
    if(updated&&state.payload?.checkpoint?.changes?.length){const dot=document.createElement("i");dot.className="update-dot";launcher.prepend(dot);launcher.title=`${state.payload.checkpoint.changes.length} system field(s) updated`;}
  }
  function renderPanel(){
    const content=document.querySelector(".reader-system-panel-content");if(!content)return;
    content.innerHTML=state.payload?window.AetherSystemCore.render(state.payload,{pageId:state.pageId}):'<div class="reader-system-panel-empty">The system has not been revealed at this point in the story.</div>';
  }
  function open(){if(!state.payload)return;state.open=true;document.getElementById("reader-system-panel")?.classList.add("open");renderPanel();document.body.style.overflow="hidden";}
  function close(){state.open=false;document.getElementById("reader-system-panel")?.classList.remove("open");document.body.style.overflow="";}
  async function revealCurrent(){
    if(!currentChapter||state.includeContext)return;
    const story=currentChapter.story,chapter=currentChapter.ch;
    await loadFor({story,chapterId:chapter.id,include:true});
    state.includeContext=true;ensureStore();
    const current=store.systemProgress[story.id];const currentOrder=Number(current?.order||-1),nextOrder=Number(chapter.chapter_order||0);
    if(nextOrder>=currentOrder){store.systemProgress[story.id]={chapterId:chapter.id,order:nextOrder,updatedAt:Date.now()};saveStore();}
    if(authState.user){getSupabase().rpc("advance_reader_system_progress",{target_story_id:story.id,target_chapter_id:chapter.id}).catch(()=>{});}
    updateLauncher(true);
  }
  function observeEnd(){
    state.observer?.disconnect();state.observer=null;
    const sentinel=document.getElementById("system-checkpoint-sentinel");if(!sentinel||route?.name!=="read")return;
    state.observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))revealCurrent().catch(error=>console.warn("Could not reveal system checkpoint",error));},{threshold:.1});
    state.observer.observe(sentinel);
  }
  async function afterRender(){
    injectShell();close();state.pageId=null;
    const context=activeContext();
    if(!context){state.payload=null;updateLauncher();state.observer?.disconnect();return;}
    await loadFor(context);observeEnd();
  }
  window.ReaderSystemPanel={afterRender,open,close,revealCurrent};
})();
