/* Studio route placeholders. Real CMS work lives in admin.html; author-studio.js may override writer/media routes. */
"use strict";

function studioAdminRedirect(title, body){
  return `<div class="empty"><div class="em">${I.shield}</div><h3>${title}</h3><p>${body}</p><a class="btn story" href="admin.html">${I.external}Open Admin CMS</a></div>`;
}

VIEWS.studioOverview = function(){
  return studioAdminRedirect("Studio dashboard moved", "Use the Admin CMS for stories, chapters, tiers, keys, media, and announcements.");
};
VIEWS.studioAccess = function(){
  return studioAdminRedirect("Access management lives in Admin CMS", "Create tiers, access keys, and entitlement records in the real Supabase-backed admin page.");
};
VIEWS.studioAnnouncements = function(){
  return studioAdminRedirect("Announcements moved", "Publish updates through the admin workflow.");
};
VIEWS.studioAnalytics = function(){
  return studioAdminRedirect("Analytics unavailable", "Connect an analytics source before rendering this view.");
};
VIEWS.studioSettings = function(){
  return studioAdminRedirect("Studio settings moved", "Manage story identity, covers, backgrounds, loader themes, and storage-backed media in Admin CMS.");
};
