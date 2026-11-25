(function () {
  'use strict';
  const defaults = {sfw:'public',nsfw:'paid','nsfw-extreme':'paid'};
  function label(item,value) {
    if (!Object.hasOwn(defaults,value)) throw new Error('Choose a content label.');
    return {...item,content_label:value,studio_audience:defaults[value]};
  }
  function setAudience(item,value) {
    if (!['public','registered','paid'].includes(value) || (value==='public' && item.content_label!=='sfw') ||
        (item.content_label==='nsfw-extreme' && value!=='paid')) throw new Error('That audience is not available for the selected labels.');
    return {...item,studio_audience:value};
  }
  function appearance(item,viewer) {
    if (viewer==='author' || item.studio_audience==='public' ||
        (item.studio_audience==='registered' && ['registered','paid'].includes(viewer)) ||
        (item.studio_audience==='paid' && viewer==='paid')) return 'original';
    return item.content_label==='nsfw' ? 'teaser' : 'blocker';
  }
  function select(order,selected,anchor,id,mode) {
    if (!order.includes(id)) return {ids:selected,anchor};
    if (mode==='range' && order.includes(anchor)) {
      const [a,b]=[order.indexOf(anchor),order.indexOf(id)].sort((x,y)=>x-y);
      return {ids:order.slice(a,b+1),anchor};
    }
    const set=new Set(mode==='toggle'?selected:[]);
    if (set.has(id)) set.delete(id); else set.add(id);
    return {ids:order.filter(key=>set.has(key)),anchor:id};
  }
  window.StudioMedia={label,setAudience,appearance,select};
}());
