/** Resident UI — framework-free theme and component helpers. */
(function(global){
 'use strict';
 const tiers={
  licker:{label:'Resident Licker',accent:'#e26e75',frame:'assets/licker-frame.png',motto:'THE HUNT BEGINS',bannerLabel:'BIOLOGICAL ANOMALY'},
  tyrant:{label:'Resident Tyrant',accent:'#b6a38c',frame:'assets/tyrant-frame.png',motto:'RELENTLESS PURSUIT',bannerLabel:'CLASSIFIED / T-103'},
  nemesis:{label:'Resident Nemesis',accent:'#c9a45a',frame:'assets/nemesis-frame.png',motto:'CONTAINMENT BREACHED',bannerLabel:'NEMESIS / T-TYPE'},
  evil:{label:'Resident Evil',accent:'#ee2737',frame:'assets/evil-frame.png',motto:'ENTER THE NIGHTMARE',bannerLabel:'BIOHAZARD / ULTIMATE'}
 };
 const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeAsset=s=>String(s??'').replace(/[^a-z0-9_./-]/gi,'');
 function create(options={}){
   const root=typeof options.root==='string'?document.querySelector(options.root):options.root;
   if(!root)throw Error('ResidentUI: missing root element');
   const base=options.assetBase??'./';let tier='nemesis';
   root.classList.add('rui-root','rui-theming');
   function apply(next){if(!tiers[next])throw Error('Unknown tier: '+next);tier=next;root.dataset.ruiTier=next;root.dispatchEvent(new CustomEvent('residentui:tierchange',{detail:{tier}}));return api}
   function file(name){return base.replace(/\/?$/,'/')+safeAsset(name)}
   function avatar({src='',size='normal',alt='Profile photo'}={}){const frame=file(tiers[tier].frame);return `<span class="rui-avatar ${size==='small'?'rui-avatar--small':''}"><img class="rui-avatar__photo" src="${escapeHTML(src)}" alt="${escapeHTML(alt)}"><img class="rui-avatar__frame" src="${escapeHTML(frame)}" alt="" aria-hidden="true"></span>`}
   function badge(label=tiers[tier].label){return `<span class="rui-tier-badge">${escapeHTML(label)}</span>`}
   function banner(){const t=tiers[tier];return `<div class="rui-banner"><span class="rui-banner__mark" aria-hidden="true">${escapeHTML(tier==='evil'?'VII':tier==='nemesis'?'N':tier==='tyrant'?'T':'L')}</span><div class="rui-banner__title">${escapeHTML(t.motto)}</div><div class="rui-banner__subtitle">${escapeHTML(t.bannerLabel)}</div></div>`}
   function profile({name='Resident',handle='@resident',photo='',bio='Member of the archive'}={}){return `<article class="rui-card rui-card--elevated">${banner()}<div class="rui-profile-top">${avatar({src:photo})}<div class="rui-profile-top__copy"><h2>${escapeHTML(name)}</h2><p>${escapeHTML(handle)}</p></div></div><div class="rui-card__body" style="padding-top:16px">${badge()}<p class="rui-muted" style="font-size:13px;margin:14px 0 0">${escapeHTML(bio)}</p></div></article>`}
   function comment({name='Resident',photo='',text='',date='Just now'}={}){return `<div class="rui-comment">${avatar({src:photo,size:'small'})}<div class="rui-comment__content"><div class="rui-comment__meta"><strong>${escapeHTML(name)}</strong>${badge()}<span class="rui-caption">${escapeHTML(date)}</span></div><p class="rui-comment__body">${escapeHTML(text)}</p></div></div>`}
   function progress(value=50){const n=Math.min(100,Math.max(0,Number(value)||0));return `<div class="rui-progress" role="progressbar" aria-label="Reading progress" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="100"><div class="rui-progress__fill" style="--rui-value:${n}%"></div></div>`}
   function initTabs(scope=root){scope.querySelectorAll('[data-rui-tabs]').forEach(el=>{const tabs=Array.from(el.querySelectorAll('[role=tab]'));tabs.forEach(tab=>tab.addEventListener('click',()=>{tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));const panel=document.getElementById(t.getAttribute('aria-controls'));if(panel)panel.hidden=!active})}))})}
   const api={tiers,get tier(){return tier},setTier:apply,avatar,badge,banner,profile,comment,progress,initTabs};apply(options.tier||'nemesis');return api;
 }
 global.ResidentUI={create,tiers};
})(window);
