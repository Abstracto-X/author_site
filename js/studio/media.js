(function () {
  'use strict';
  const {$,show,notice,gate,start}=window.StudioShell;
  const model=window.StudioMedia, layout=window.MediaLayout, storage=window.MediaStorage;
  const labels={sfw:'SFW',nsfw:'NSFW','nsfw-extreme':'NSFW Extreme'};
  const audiences={public:'Public',registered:'Signed-in',paid:'Paid'};
  const formats={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4','video/webm':'webm'};
  const canvas=$('studio-canvas'), fields=$('editor-fields');
  let client,isActive=()=>false, posts=[], galleryGroups=[], stories=[], tiers=[], edit=null, selected=[], anchor=null, dirty=false, busy=false, route='', epoch=0, cols=new Map();
  const h=(name,className='',text='')=>{const el=document.createElement(name);el.className=className;el.textContent=text;return el;};
  const link=value=>/^(https?:\/\/|blob:)/i.test(value||'') ? value : '';
  function photo(src,alt='') {
    const el=h('img'); el.alt=alt; el.decoding='async'; el.draggable=false; el.loading='lazy'; el.src=src;
    el.addEventListener('error',()=>el.replaceWith(h('span','studio-blocker','Image unavailable')),{once:true});
    return el;
  }
  function data(result) { if(result.error) throw result.error; return result.data; }
  function status(result,fallback='Something went wrong.') { return result?.message || fallback; }
  let page=0, postsRequest=0, playing=null, signedAt=0, refreshing=false;
  const pageSize=24;
  const itemFields='id,media_type,media_url,poster_url,blur_thumb_url,content_label,studio_audience,required_tier_id,width,height,duration_seconds,sort_order';
  function sorted(items) { return Array.from(items||[]).sort((a,b)=>a.sort_order-b.sort_order); }
  function showPane(editor) {
    if (!isActive()) return;
    show('studio-gate',false);show('studio-editor',editor);show('studio-library',!editor);show('new-post',!editor);
    for (const id of ['editor-actions','back-posts','editor-state']) show(id,editor);
  }
  function focusPage() {window.scrollTo(0,0);$('page-title').focus({preventScroll:true});}
  function setInspector(open, focus=false) {
    const toggle=$('toggle-settings');
    toggle.setAttribute('aria-expanded',String(open));
    show('post-settings',open);
    if(focus) (open?$('settings-heading'):toggle).focus();
  }
  function setBusy(value) {
    busy=value;fields.disabled=value;
    for (const id of ['save-draft','save-live','unpublish-post','back-posts']) $(id).disabled=value;
  }
  async function loadPosts(more=false) {
    const ticket=++postsRequest, startAt=more?page:0, filter=$('post-filter').value;
    let query=client.from('media_posts').select('id,title,caption,story_id,updated_at,is_published,is_nsfw,studio_managed,media_post_items('+itemFields+')').order('updated_at',{ascending:false}).order('id');
    if(filter!=='all')query=query.eq('is_published',filter==='published');
    const rows=data(await query.range(startAt,startAt+pageSize-1));
    const signed=await storage.signFeed(client,rows.map(p=>({...p,items:sorted(p.media_post_items).slice(0,5).map(i=>({...i,studio_private:p.studio_managed})),count:p.media_post_items.length,
      audiences:[...new Set(p.media_post_items.map(i=>i.studio_audience).filter(Boolean))]})));
    if (ticket!==postsRequest || !isActive())return;
    posts=more?[...posts,...signed.filter(p=>!posts.some(old=>old.id===p.id))]:signed;
    signedAt=Date.now(); page=startAt+rows.length; show('load-more-posts',rows.length===pageSize); renderPosts();
  }
  async function loadGalleryArchiveGroups() {
    try {
      const { data: rows, error } = await client
        .from('character_gallery_images')
        .select('id,character_id,image_url,caption,image_tags,created_at,characters(name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(300);
      if (error || !Array.isArray(rows)) { galleryGroups = []; return; }
      const WINDOW_MS = 30 * 60 * 1000;
      const MAX_PER = 9;
      const matureSet = new Set(['r18', 'mature', 'nsfw', '18+']);
      const batches = [];
      rows.forEach(img => {
        if (!link(img.image_url)) return;
        const charId = img.character_id || 'general';
        const ts = new Date(img.created_at || 0).getTime() || 0;
        const match = batches.find(b => b.charId === charId && b.items.length < MAX_PER && Math.abs(b.anchorTs - ts) <= WINDOW_MS);
        if (match) match.items.push(img);
        else batches.push({ charId, anchorTs: ts, createdAt: img.created_at || '', items: [img] });
      });
      galleryGroups = batches.map((b, idx) => {
        const joined = b.items[0]?.characters;
        const charName = (Array.isArray(joined) ? joined[0]?.name : joined?.name) || 'Gallery Archive';
        const d = b.createdAt ? new Date(b.createdAt) : null;
        const dateStr = d && Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const firstCap = String(b.items.find(x => x.caption)?.caption || '').trim();
        const isNsfw = b.items.some(x => (x.image_tags || []).some(t => matureSet.has(String(t || '').toLowerCase().trim())));
        return {
          id: 'gallery-group-' + idx,
          is_gallery_archive: true,
          studio_managed: false,
          is_published: true,
          is_nsfw: isNsfw,
          title: firstCap || (charName + (dateStr ? ' · ' + dateStr : ' Set')),
          caption: '',
          count: b.items.length,
          audiences: [isNsfw ? 'paid' : 'public'],
          items: b.items.slice(0, 5).map(x => ({ media_type: 'image', media_url: x.image_url })),
          allItems: b.items.map((x, i) => {
            const mature = (x.image_tags || []).some(t => matureSet.has(String(t || '').toLowerCase().trim()));
            return {
              id: x.id || ('gal-' + idx + '-' + i),
              media_type: 'image',
              media_url: x.image_url,
              mediaSigned: x.image_url,
              content_label: mature ? 'nsfw' : 'sfw',
              studio_audience: mature ? 'paid' : 'public',
              required_tier_id: null,
              sort_order: i
            };
          })
        };
      });
    } catch (_) {
      galleryGroups = [];
    }
  }
  function renderPosts() {
    const grid=$('post-grid'); grid.replaceChildren();
    const filter=$('post-filter').value;
    const realVisible=posts.filter(p=>filter==='all'||p.is_published===(filter==='published'));
    const archiveVisible=(filter==='all'||filter==='published')?galleryGroups:[];
    const visible=[...realVisible,...archiveVisible];
    $('library-count').textContent=visible.length+' '+(visible.length===1?'post':'posts')+($('load-more-posts').hidden?'':' loaded');
    if(!visible.length) grid.append(h('p','studio-empty',filter==='all'?'No media posts yet. Use New post to upload your first batch.':'No '+filter+' posts.'));
    visible.forEach((p,index)=>{
      const card=h('a','studio-card'); card.href=p.is_gallery_archive?'#/media/'+p.id:(p.studio_managed?'#/media/'+p.id:'media-studio.html');
      const recipe=layout.compactMosaic(p.count,index);
      const mosaic=h('div','mp-mosaic '+recipe.className); mosaic.setAttribute('aria-hidden','true');
      p.items.slice(0,recipe.visibleCount).forEach((it,i)=>{
        const cell=h('div','mp-m-cell');
        const src=link(it.media_type==='video'?it.poster_url:it.media_url);
        cell.append(src?photo(src):h('span','studio-blocker',it.media_type==='video'?'Video':'No preview'));
        if(i===recipe.visibleCount-1 && p.count>recipe.visibleCount) cell.append(h('span','studio-more','+'+(p.count-recipe.visibleCount)+' more'));
        mosaic.append(cell);
      });
      if(!p.count) mosaic.append(h('span','studio-blocker','No attachments'));
      const foot=h('div','studio-card-foot'), title=h('div','studio-card-title');
      const tag=h('span','studio-tag',p.is_gallery_archive?'Gallery Set':(p.is_published?'Published':'Draft'));
      tag.dataset.published=String(p.is_published && !p.is_gallery_archive);
      title.append(h('strong','',p.title),tag);
      foot.append(title,h('small','',[p.count+' '+(p.count===1?'file':'files'),p.is_nsfw?'NSFW':'',
        p.is_gallery_archive?'Time-grouped archive':(p.studio_managed?p.audiences.map(a=>audiences[a]).join(' · '):'Open in legacy Media Studio')].filter(Boolean).join(' · ')));
      card.append(mosaic,foot); grid.append(card);
    });
  }
  function optionList(select,empty,items,label) {
    select.replaceChildren(new Option(empty,''),...items.map(x=>new Option(label(x),x.id)));
  }
  function clean() {
    if(edit) for(const it of edit.items) release(it);
    edit=null; selected=[];anchor=null;dirty=false;cols=new Map();playing=null;
  }
  function markDirty(){dirty=true;}
  function modeOf(e){if(window._studioMultiSelectMode)return 'toggle';return e.shiftKey?'range':e.metaKey||e.ctrlKey||matchMedia('(pointer:coarse)').matches?'toggle':'single';}
  function setSelected(ids){const stop=playing && !ids.includes(playing);selected=ids;if(stop){playing=null;renderCanvas();}else updateSelection();}
  function selectTile(id,e) {
    const next=model.select(edit.items.map(x=>x.id),selected,anchor,id,modeOf(e)); anchor=next.anchor; setSelected(next.ids);
  }
  function updateSelection() {
    const count=selected.length;
    $('studio-bulk').classList.toggle('has-selection',count>0);
    $('selected-count').textContent=count?count+' selected':'Select tiles to edit';
    $('select-all').disabled=!edit?.items.length;
    for(const id of ['clear-selection','bulk-label-wrap','bulk-audience-wrap','remove-media']) show(id,count>0);
    const video=count===1 && edit?.items.find(it=>it.id===selected[0] && it.media_type==='video' && model.appearance(it,$('viewer').value)==='original' && link(it.local||it.mediaSigned));
    show('play-selected',!!video);$('play-selected').textContent=playing?'Stop video':'Play video';
    for(const tile of canvas.querySelectorAll('[data-id]')) tile.setAttribute('aria-pressed',String(selected.includes(tile.dataset.id)));
  }
  function reflow() {
    if(!edit || canvas.clientWidth<=0) return;
    const ratios=edit.items.map(it=>({ratio:it.width&&it.height?it.width/it.height:it.media_type==='video'?16/9:.75}));
    const result=layout.solveOrganicMasonry(ratios,0,cols,canvas.clientWidth,10);
    cols=result.nextCols; canvas.style.height=result.totalH+'px';
    Array.from(canvas.children).forEach((tile,i)=>{
      const r=result.rects.get(i); if(r) Object.assign(tile.style,{left:r.x+'px',top:r.y+'px',width:r.w+'px',height:r.h+'px'});
    });
  }
  function renderCanvas() {
    if(!edit) return;
    const previous=document.activeElement?.dataset.id, viewer=$('viewer').value;
    const populated=edit.items.length>0;
    canvas.replaceChildren();
    $('studio-upload').classList.toggle('is-empty',!populated);
    for (const id of ['studio-bulk','canvas-help','studio-canvas']) show(id,populated);
    $('attachment-count').textContent=edit.items.length+' '+(edit.items.length===1?'attachment':'attachments');
    edit.items.forEach((it,index)=>{
      const tile=h('button','studio-tile'); tile.type='button';tile.dataset.id=it.id;
      const appearance=model.appearance(it,viewer);
      const realTeaser=link(it.teaserLocal||it.teaserSigned);
      const fallbackTeaser=link(it.media_type==='video'?(it.posterLocal||it.posterSigned):(it.local||it.mediaSigned));
      const src=appearance==='original'?fallbackTeaser:(appearance==='teaser'?(realTeaser||fallbackTeaser):'');
      const needsCssBlur=appearance==='teaser' && !realTeaser && !!fallbackTeaser;
      if(needsCssBlur) tile.classList.add('is-preview-blur');
      const badge=(index+1)+' · '+labels[it.content_label]+' · '+audiences[it.studio_audience];
      const blocked=appearance==='blocker'?'Locked':appearance==='teaser'?'Teaser unavailable':it.media_type==='video'?'Video':'Preview unavailable';
      tile.setAttribute('aria-label',badge+(appearance!=='original'?' · '+(src?'Blurred teaser':blocked):''));
      tile.append(src?photo(src):h('span','studio-blocker',blocked),h('span','studio-badge',badge));
      tile.addEventListener('click',e=>selectTile(it.id,e));
      tile.addEventListener('contextmenu',e=>{
        if(typeof window.openStudioTileContextMenu==='function'){
          e.preventDefault();
          if(!selected.includes(it.id)){
            const next=model.select(edit.items.map(x=>x.id),selected,anchor,it.id,window._studioMultiSelectMode?'toggle':'single');
            anchor=next.anchor; setSelected(next.ids);
          }
          window.openStudioTileContextMenu(e,it,selected.length);
        }
      });
      if(playing===it.id && appearance==='original'){
        const v=h('video');v.src=link(it.local||it.mediaSigned);v.muted=true;v.autoplay=true;v.playsInline=true;v.loop=true;
        tile.prepend(v); if(tile.children.length>2)tile.children[1].remove();
      }
      canvas.append(tile);
      if(previous===it.id) tile.focus({preventScroll:true});
    });
    updateSelection(); reflow();
  }
  function setEditor(post,items) {
    edit={...post,items}; selected=[];anchor=null;cols=new Map();dirty=false;
    $('page-title').textContent=post.title||'New media post';
    $('post-title').value=post.title||'';$('post-caption').value=post.caption||'';$('post-story').value=post.story_id||'';
    const ids=[...new Set(items.filter(i=>i.studio_audience==='paid').map(i=>i.required_tier_id||''))];
    $('post-tier').value=ids.length===1?ids[0]:'';$('viewer').value='author';
    $('editor-state').textContent=post.is_published?'Published':'Draft';
    $('editor-state').dataset.published=String(post.is_published);
    $('save-live').textContent=post.is_published?'Save live changes':'Publish post';
    const isArchive=!!post.is_gallery_archive;
    show('view-live-post',!!post.is_published);
    show('save-draft',!post.is_published && !isArchive);
    show('unpublish-post',post.is_published && !isArchive);
    show('save-live',!isArchive);
    $('batch-label').value='sfw';
    setInspector(false); showPane(true); renderCanvas(); focusPage();
    if(isArchive) notice('Viewing time-grouped Gallery Set (read-only archive). Use View live to open in Reader, or New post to create a Studio post.');
  }
  async function navigate() {
    if(!isActive()) return;
    const requested=location.hash.startsWith('#/media')?location.hash:'#/media';
    if ((busy || (dirty && !confirm('Leave this post and discard unsaved changes?'))) && requested!==route) {
      history.replaceState(null,'',route||'#/media'); return;
    }
    if (requested===route) return;
    const first=!route;
    const ticket=++epoch;route=requested; clean();notice();
    if(route==='#/media'){
      $('page-title').textContent='All Posts';showPane(false);renderPosts();if(!first)focusPage();return;
    }
    if(route==='#/media/new'){
      setEditor({id:crypto.randomUUID(),is_published:false},[]);return;
    }
    const id=route.split('/')[2];
    if(id && id.startsWith('gallery-group-')){
      const group=galleryGroups.find(g=>g.id===id);
      if(group){ setEditor(group, group.allItems || []); return; }
    }
    for (const id of ['studio-editor','studio-library','new-post','editor-actions','back-posts','editor-state']) show(id,false);
    notice('Loading post…');
    try {
      const post=data(await client.from('media_posts').select('id,title,caption,story_id,updated_at,is_published,studio_managed,media_post_items('+itemFields+')').eq('id',id).eq('studio_managed',true).maybeSingle());
      if(!post) throw new Error('This post is unavailable in Studio.');
      const items=sorted(post.media_post_items);
      const [signed]=await storage.signFeed(client,[{items:items.map(it=>({...it,studio_private:true}))}]);
      if(ticket!==epoch||!isActive())return;
      signedAt=Date.now(); notice();setEditor(post,items.map((it,i)=>({...it,mediaSigned:signed.items[i].media_url,posterSigned:signed.items[i].poster_url,teaserSigned:signed.items[i].blur_thumb_url})));
    } catch (err) {
      if(ticket!==epoch||!isActive())return;
      route='#/media'; history.replaceState(null,'',route);$('page-title').textContent='All Posts';showPane(false);focusPage();notice(status(err),true);
    }
  }
  function go(target){ if(location.hash!==target) location.hash=target; else void navigate(); }
  $('new-post').addEventListener('click',()=>go('#/media/new'));
  $('back-posts').addEventListener('click',()=>go('#/media'));
  $('toggle-settings').addEventListener('click',()=>setInspector($('post-settings').hidden,true));
  $('close-settings').addEventListener('click',()=>setInspector(false,true));
  $('post-filter').addEventListener('change',async()=>{
    posts=[];$('library-count').textContent='Loading posts…';show('load-more-posts',false);$('post-grid').replaceChildren();
    try{await loadPosts();}catch(e){$('library-count').textContent='';$('post-grid').replaceChildren();if(isActive())notice(status(e),true);}
  });
  $('load-more-posts').addEventListener('click',async()=>{
    $('load-more-posts').disabled=true;
    try{await loadPosts(true);}catch(e){if(isActive())notice(status(e),true);}
    finally{$('load-more-posts').disabled=false;}
  });
  $('viewer').addEventListener('change',()=>{playing=null;renderCanvas();});
  $('play-selected').addEventListener('click',()=>{playing=playing?null:selected[0];renderCanvas();});
  $('select-all').addEventListener('click',()=>setSelected(edit.items.map(x=>x.id)));
  $('clear-selection').addEventListener('click',()=>{anchor=null;setSelected([]);$('select-all').focus();});
  for (const id of ['post-title','post-caption','post-story','post-tier']) $(id).addEventListener('input',markDirty);
  $('remove-media').addEventListener('click',()=>{
    if (busy || !selected.length || !confirm('Remove the selected attachments from this post?')) return;
    for (const it of edit.items) if(selected.includes(it.id)) release(it);
    edit.items=edit.items.filter(it=>!selected.includes(it.id)); selected=[]; anchor=null;markDirty();renderCanvas();
    (edit.items.length?$('select-all'):$('media-files')).focus();
  });
  for(const [id,apply] of [['bulk-label',model.label],['bulk-audience',model.setAudience]]) $(id).addEventListener('change',e=>{
    if(!e.target.value || busy) return;
    try {
      const value=e.target.value;
      const next=edit.items.map(it=>selected.includes(it.id)?{...apply(it,value),teaserTask:null}:it);
      edit.items=next; markDirty(); renderCanvas();
      void prepareLocalTeasers(next.filter(it=>selected.includes(it.id)));
    } catch(err) { notice(status(err),true); }
    e.target.value='';
  });
  let marquee=null;
  function bounds(a,b,x,y){return {left:Math.min(a,x),top:Math.min(b,y),right:Math.max(a,x),bottom:Math.max(b,y)};}
  canvas.addEventListener('pointerdown',e=>{
    if(busy || e.target!==canvas || e.button!==0 || e.pointerType==='touch') return;
    canvas.setPointerCapture(e.pointerId);
    const box=h('div','studio-marquee');document.body.append(box);
    marquee={x:e.clientX,y:e.clientY,box,base:e.ctrlKey||e.metaKey?[...selected]:[]};
  });
  canvas.addEventListener('pointermove',e=>{
    if(!marquee)return;
    const r=bounds(marquee.x,marquee.y,e.clientX,e.clientY);
    Object.assign(marquee.box.style,{left:r.left+'px',top:r.top+'px',width:r.right-r.left+'px',height:r.bottom-r.top+'px'});
    if(r.right-r.left<4 && r.bottom-r.top<4)return;
    const ids=[...canvas.children].filter(tile=>{const t=tile.getBoundingClientRect();return t.left<r.right&&t.right>r.left&&t.top<r.bottom&&t.bottom>r.top;}).map(t=>t.dataset.id);
    setSelected([...new Set([...marquee.base,...ids])]); anchor=selected.at(-1)||null;
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name,()=>{marquee?.box.remove();marquee=null;});
  new ResizeObserver(reflow).observe(canvas);
  window.addEventListener('hashchange',navigate);
  window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
  // Renew admin-only thumbnails on long sessions, without discarding edits or selection.
  setInterval(async()=>{
    if(!isActive() || busy || refreshing || document.hidden || !signedAt || Date.now()-signedAt<480000 || (playing && Date.now()-signedAt<540000))return;
    refreshing=true;
    const post=edit, previous=posts;
    try {
      if(post) {
        const [signed]=await storage.signFeed(client,[{items:post.items.filter(it=>it.media_url).map(it=>({...it,studio_private:true}))}]);
        if(edit!==post || !isActive())return;
        for(const item of post.items) {
          const it=signed.items.find(i=>i.id===item.id && i.media_url);
          if(it) Object.assign(item,{mediaSigned:it.media_url,posterSigned:it.poster_url,teaserSigned:it.blur_thumb_url});
        }
        if(signed.items.some(it=>it.media_url)) {signedAt=Date.now();renderCanvas();}
      } else if(previous.length) {
        const rows=previous.map(p=>({...p,items:sorted(p.media_post_items).slice(0,5).map(it=>({...it,studio_private:p.studio_managed}))}));
        const latest=await storage.signFeed(client,rows);
        if(!edit && posts===previous && isActive()) {posts=latest;signedAt=Date.now();renderPosts();}
      }
    } finally {refreshing=false;}
  },60000);
  function release(it){for(const key of ['local','posterLocal','teaserLocal']) if(it[key]) URL.revokeObjectURL(it[key]);}
  function loadImage(src){
    const img=new Image(); if(!src.startsWith('blob:'))img.crossOrigin='anonymous';
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Image preview timed out.')),8000);
      img.onload=()=>{clearTimeout(timer);resolve(img);};img.onerror=()=>{clearTimeout(timer);reject(new Error('Image preview unavailable.'));};img.src=src;
    });
  }
  function asJpeg(c){return new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(new Error('Could not prepare an image.')),'image/jpeg',.8));}
  function frame(source,w,h,max) {
    const c=document.createElement('canvas'),scale=Math.min(1,max/Math.max(w,h));c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
    c.getContext('2d').drawImage(source,0,0,c.width,c.height);return c;
  }
  async function blurAsset(src){
    const img=await loadImage(src);
    const tiny=frame(img,img.naturalWidth,img.naturalHeight,12);
    const c=document.createElement('canvas'),scale=320/Math.max(tiny.width,tiny.height);
    c.width=Math.round(tiny.width*scale);c.height=Math.round(tiny.height*scale);
    const ctx=c.getContext('2d');ctx.fillStyle='#172327';ctx.fillRect(0,0,c.width,c.height);ctx.filter='blur(12px)';
    ctx.drawImage(tiny,-12,-12,c.width+24,c.height+24);return asJpeg(c);
  }
  function videoFrame(src){
    return new Promise((resolve,reject)=>{
      const v=document.createElement('video');v.muted=true;v.preload='auto';v.playsInline=true;
      function finish(err) {
        clearTimeout(timer);
        try {
          if(err) reject(err);
          else resolve({width:v.videoWidth,height:v.videoHeight,duration:Number.isFinite(v.duration)?v.duration:null,poster:asJpeg(frame(v,v.videoWidth,v.videoHeight,900))});
        } catch(e){reject(e);}
        v.onloadeddata=null;v.onerror=null;v.removeAttribute('src');v.load();
      }
      const timer=setTimeout(()=>finish(new Error('Video poster timed out.')),10000);
      v.onerror=()=>finish(new Error('This browser cannot read the video.'));
      v.onloadeddata=()=>finish();v.src=src;
    });
  }
  async function prepare(it){
    if(!it.local)return;
    if(it.media_type==='image'){const img=await loadImage(it.local);it.width=img.naturalWidth;it.height=img.naturalHeight;}
    else {const info=await videoFrame(it.local);it.width=info.width;it.height=info.height;it.duration_seconds=info.duration;it.posterBlob=await info.poster;it.posterLocal=URL.createObjectURL(it.posterBlob);}
  }
  async function prepareLocalTeasers(items) {
    const post=edit;
    await Promise.all(items.map(it=>{
      if(it.content_label!=='nsfw'||it.blur_thumb_url||it.teaserBlob)return;
      if(it.teaserTask)return it.teaserTask;
      const source=it.media_type==='image'?(it.local||it.mediaSigned):(it.posterLocal||it.posterSigned);
      if(!source)return;
      it.teaserTask=blurAsset(source).then(blob=>{
        if(edit!==post || !post.items.includes(it)) return;
        it.teaserBlob=blob; it.teaserLocal=URL.createObjectURL(blob);
      }).catch(()=>{ /* Missing teaser renders a blocker. */ }).finally(()=>{it.teaserTask=null;});
      return it.teaserTask;
    }));
    if(edit===post && isActive())renderCanvas();
  }
  async function addFiles(files){
    if(busy || !edit || !isActive())return;
    const added=[],rejected=[];
    for(const file of files){
      if(!formats[file.type]||file.size>104857600||!file.size||edit.items.length+added.length>=60){rejected.push(file.name);continue;}
      added.push(model.label({id:crypto.randomUUID(),file,local:URL.createObjectURL(file),media_type:file.type.startsWith('video/')?'video':'image'},$('batch-label').value));
    }
    if(!added.length){if(rejected.length)notice('No files added. Check file type, 100 MB per file, and the 60 attachment limit.',true);return;}
    const activeEdit=edit;
    edit.items.push(...added);markDirty();
    setBusy(true); notice('Preparing '+added.length+' attachments…');renderCanvas();
    const previews=await Promise.allSettled(added.map(prepare));
    await prepareLocalTeasers(added);
    setBusy(false);
    if(edit!==activeEdit || !isActive())return;
    const count=previews.filter(r=>r.status==='rejected').length;
    notice([rejected.length?rejected.length+' files skipped (type, size, or post limit).':'',count?count+' previews unavailable; those files remain attached.':''].filter(Boolean).join(' '),!!(count||rejected.length));
  }
  const fileInput=$('media-files'), drop=$('studio-upload');
  fileInput.addEventListener('change',()=>{const list=Array.from(fileInput.files);fileInput.value='';void addFiles(list);});
  for(const type of ['dragover','dragleave','drop'])drop.addEventListener(type,e=>{
    if(type==='dragleave') {
      if(!(e.relatedTarget instanceof Node) || !drop.contains(e.relatedTarget)) drop.classList.remove('is-over');
      return;
    }
    if(!Array.from(e.dataTransfer.types).includes('Files'))return;
    e.preventDefault();drop.classList.toggle('is-over',type==='dragover'&&!busy);
    if(type==='drop')void addFiles(Array.from(e.dataTransfer.files));
  });
  async function put(post,kind,blob,ext){
    const path=post.id+'/'+kind+'/'+crypto.randomUUID()+'.'+ext;
    data(await client.storage.from(storage.bucket).upload(path,blob,{contentType:blob.type,upsert:false}));
    return path;
  }
  async function save(publish) {
    if(busy||!edit||!isActive())return;
    const post=edit, title=$('post-title').value.trim(), story=$('post-story').value, caption=$('post-caption').value, tier=$('post-tier').value;
    if(!title){notice('Enter a title before saving.',true);setInspector(true);$('post-title').focus();return;}
    if(publish&&!story){notice('Choose a published story before publishing.',true);setInspector(true);$('post-story').focus();return;}
    if(publish&&!post.items.length){notice('Add at least one attachment before publishing.',true);$('media-files').focus();return;}
    if(publish&&!tier&&post.items.some(it=>it.studio_audience==='paid')){notice('Choose the required paid tier before publishing.',true);setInspector(true);$('post-tier').focus();return;}
    if(!publish && post.is_published && !confirm('Unpublish this post and save the current edits as a draft?'))return;
    if(publish && !confirm(post.is_published?'Save these changes to the live post?':'Publish this post to the reader feed?'))return;
    setBusy(true);let sent=false;
    try {
      await prepareLocalTeasers(post.items);
      for (const [i,it] of post.items.entries()){
        notice('Preparing attachment '+(i+1)+' of '+post.items.length+'…');
        if(!it.media_url)it.media_url=await put(post,'original',it.file,formats[it.file.type]);
        if(it.posterBlob&&!it.poster_url)it.poster_url=await put(post,'poster',it.posterBlob,'jpg');
        if(it.content_label==='nsfw'&&it.teaserBlob&&!it.blur_thumb_url)it.blur_thumb_url=await put(post,'teaser',it.teaserBlob,'jpg');
      }
      sent=true;
      const stamp=data(await client.rpc('save_studio_media_post',{p_id:post.id,p_expected:post.updated_at||null,
        p_post:{title,story_id:story||null,caption,is_published:publish},
        p_items:post.items.map(it=>({id:it.id,media_type:it.media_type,media_url:it.media_url,poster_url:it.poster_url||null,
          blur_thumb_url:it.content_label==='nsfw'?it.blur_thumb_url||null:null,content_label:it.content_label,studio_audience:it.studio_audience,
          required_tier_id:it.studio_audience==='paid'?tier||null:null,width:it.width||null,height:it.height||null,duration_seconds:it.duration_seconds??null}))}));
      if(!isActive())return;
      for(const it of post.items) if(it.content_label!=='nsfw') {it.blur_thumb_url=null;it.teaserSigned=null;}
      Object.assign(post,{updated_at:stamp,title,caption,story_id:story,is_published:publish});
      for(const it of post.items) it.required_tier_id=it.studio_audience==='paid'?tier||null:null;
      dirty=false;route='#/media/'+post.id; history.replaceState(null,'',route);
      $('page-title').textContent=title;$('editor-state').textContent=publish?'Published':'Draft';
      $('editor-state').dataset.published=String(publish);
      $('save-live').textContent=publish?'Save live changes':'Publish post';show('save-draft',!publish);show('unpublish-post',publish);
      notice(publish?'Live post saved.':'Draft saved.');
      try {await loadPosts();} catch(_){notice('Post saved. All Posts could not refresh; reload Studio.',true);}
    } catch(err) {
      if(isActive())notice((sent?'Save not confirmed. ': 'Upload failed. ') + status(err) + (sent?' Check All Posts before retrying.':' Your batch is still here; retry Save.'),true);
    } finally {setBusy(false);}
  }
  $('unpublish-post').addEventListener('click',()=>save(false));
  $('save-draft').addEventListener('click',()=>save(false));$('save-live').addEventListener('click',()=>save(true));
  void (async()=>{
    try{
      const session=await start();if(!session)return;({client,isActive}=session);
      const [storyRows,tierRows]=await Promise.all([
        client.from('stories').select('id,title').eq('is_published',true).order('title'),
        client.from('reader_access_tiers').select('id,name,slug,tier_rank').eq('is_active',true).order('tier_rank')
      ]);
      stories=data(storyRows);tiers=data(tierRows).filter(t=>t.slug!=='free');
      optionList($('post-story'),'Choose a story',stories,x=>x.title);optionList($('post-tier'),'Choose a tier',tiers,x=>x.name);
      await Promise.all([loadPosts(), loadGalleryArchiveGroups()]);
      renderPosts();
      if(isActive())await navigate();
    } catch(err){
      if(client && !isActive())return;
      gate('Media Studio not ready','Could not load the workspace. Check configuration and the staged Studio migration. '+status(err),{retry:true});
    }
  })();
}());
