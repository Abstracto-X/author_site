/* Reader-only settings workspace. Classic script; loaded after sheets.js. */
"use strict";

VIEWS.settings = function(){
  return `<div class="reader-workspace settings-page">
    ${readerPageHeading("Make yourself at home","A comfortable archive, on your terms.")}
    <div class="reader-settings-layout">
      <section class="reader-panel" aria-labelledby="appearance-title"><h2 id="appearance-title">Appearance</h2><p class="reader-note">Choose the atmosphere for your library. Chapter colors stay independent.</p>
        <div class="reader-theme-options">${["dark","light"].map(theme=>`<button type="button" class="reader-theme-option ${store.theme===theme?'selected':''}" data-act="choose-site-theme" data-theme="${theme}" aria-pressed="${store.theme===theme}"><span class="theme-preview theme-preview-${theme}" aria-hidden="true"><i></i><i></i><i></i></span><span>${theme==='dark'?'After dark':'In the light'} ${store.theme===theme?I.check:''}</span></button>`).join("")}</div>
        ${toggleRow("appBackground","Background artwork","Use the site artwork behind archive pages",store.settings.appBackground)}
      </section>
      <section class="reader-panel" aria-labelledby="notifications-title"><h2 id="notifications-title">Stay in the story</h2><p class="reader-note">Choose how chapter alerts reach you.</p>${notificationPreferencesForm()}</section>
      <section class="settings-reading-note"><span class="reader-section-icon" aria-hidden="true">${I.book}</span><div><h2>A page of your own</h2><p>Open a chapter and choose <strong>Aa</strong> to adjust its page color, type size, line spacing, reading width and Dyslexia mode. Those choices never change your library theme.</p><a class="reader-text-link" href="#/library" data-nav="/library">Find something to read ${I.chevR}</a></div></section>
    </div>
  </div>`;
};
