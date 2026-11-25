(function () {
  'use strict';
  const bucket='studio-media';
  const lifetimeSeconds=600;
  const fields=['media_url','poster_url','blur_thumb_url'];
  async function signFeed(client, rows) {
    const paths=[...new Set(rows.flatMap(row=>(row.items||[]).filter(it=>it.studio_private).flatMap(it=>fields.filter(key=>!it.locked||key==='blur_thumb_url').map(key=>it[key]).filter(Boolean))))];
    const urls=new Map();
    for (let i=0;i<paths.length;i+=100) {
      try {
        const {data}=await client.storage.from(bucket).createSignedUrls(paths.slice(i,i+100),lifetimeSeconds);
        for (const item of data||[]) if (item.path && /^https?:\/\//.test(item.signedUrl||'')) urls.set(item.path,item.signedUrl);
      } catch (_) { /* Storage failure never exposes an object path. */ }
    }
    return rows.map(row=>({...row,items:(row.items||[]).map(it=>{
      if (!it.studio_private) return it;
      const result={...it};
      for (const field of fields) result[field]=(!it.locked||field==='blur_thumb_url') ? urls.get(it[field])||null : null;
      if (!result.media_url) result.locked=true;
      return result;
    })}));
  }
  window.MediaStorage={bucket,lifetimeSeconds,signFeed};
}());
