/* Reader-only settings workspace. Classic script; loaded after sheets.js. */
"use strict";

VIEWS.settings = function(){
  return `<div class="reader-workspace settings-page">
    ${readerPageHeading("Make yourself at home","A comfortable archive, on your terms.")}
    <div class="reader-settings-layout">
      <section class="reader-panel" aria-labelledby="appearance-title"><h2 id="appearance-title">Appearance</h2><p class="reader-note">Choose the atmosphere for your library. Chapter colors stay independent.</p>
        <div class="reader-theme-options">${[["dark","After dark"],["light","In the light"],["evil","Resident Evil"]].map(([theme,label])=>{ const locked=theme==="evil"&&!canUseEvilSiteTheme(), selected=effectiveSiteTheme()===theme; return `<button type="button" class="reader-theme-option ${selected?'selected':''}${locked?' is-locked':''}" data-act="choose-site-theme" data-theme="${theme}" aria-pressed="${selected}" ${locked?'disabled title="Requires Resident Evil membership"':''}><span class="theme-preview theme-preview-${theme}" aria-hidden="true"><i></i><i></i><i></i></span><span>${label} ${selected?I.check:locked?'<small>Resident Evil tier</small>':''}</span></button>`; }).join("")}</div>
        ${toggleRow("appBackground","Background artwork","Use the site artwork behind archive pages",store.settings.appBackground)}
      </section>
      <section class="reader-panel" aria-labelledby="notifications-title"><h2 id="notifications-title">Stay in the story</h2><p class="reader-note">Choose how chapter alerts reach you.</p>${notificationPreferencesForm()}</section>
      <section class="settings-reading-note"><span class="reader-section-icon" aria-hidden="true">${I.book}</span><div><h2>A page of your own</h2><p>Open a chapter and choose <strong>Aa</strong> to adjust its page color, type size, line spacing, reading width and Dyslexia mode. Those choices never change your library theme.</p><a class="reader-text-link" href="#/library" data-nav="/library">Find something to read ${I.chevR}</a></div></section>
    </div>
  </div>`;
};
