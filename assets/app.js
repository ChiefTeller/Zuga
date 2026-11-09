(()=>{
  'use strict';
  const feed=document.querySelector('.feed');
  let reels=[...document.querySelectorAll('.reel[data-reel]')];
  // Each visit starts with the brand and ends with TellerBP; shuffle the
  // middle independently from the SEO/static source order. Stable reel URLs
  // and server-rendered content are deliberately untouched.
  if(feed && reels.length > 2){
    const first=reels.find(node=>node.dataset.reel==='intro') || reels[0];
    const last=reels.find(node=>node.dataset.reel==='tellerbp-library');
    const middle=reels.filter(node=>node!==first && node!==last);
    function randomIndex(max){
      if(max <= 0)return 0;
      if(window.crypto?.getRandomValues){
        const value=new Uint32Array(1);crypto.getRandomValues(value);
        return value[0] % max;
      }
      return Math.floor(Math.random()*max);
    }
    for(let i=middle.length-1;i>0;i--){
      const j=randomIndex(i+1);
      [middle[i],middle[j]]=[middle[j],middle[i]];
    }
    // Ensure the very next reel differs from the last visit when possible.
    try{
      const key='zuga.lastFirstDiscovery.v1';
      const previous=localStorage.getItem(key);
      if(middle.length>1 && middle[0].dataset.reel===previous){
        const i=1+randomIndex(middle.length-1);
        [middle[0],middle[i]]=[middle[i],middle[0]];
      }
      if(middle[0])localStorage.setItem(key,middle[0].dataset.reel);
    }catch{}
    const ordered=[first,...middle,...(last?[last]:[])];
    // Flex visual order avoids reparenting 36 rich animated DOM trees at startup.
    // This keeps the server HTML and crawler-visible source order unchanged.
    ordered.forEach((node,index)=>{node.style.order=String(index);});
    reels=ordered;
    const directoryList=document.querySelector('#reel-directory .directory-list');
    if(directoryList){
      const items=new Map([...directoryList.querySelectorAll('.directory-item')].map(node=>[node.dataset.target,node]));
      ordered.forEach((reel,index)=>{
        const item=items.get(reel.dataset.reel);
        if(item){item.querySelector('span').textContent=String(index+1).padStart(2,'0');directoryList.appendChild(item);}
      });
    }
    ordered.forEach((reel,index)=>{
      const number=reel.querySelector('.reel-index');
      if(number)number.textContent=String(index+1).padStart(2,'0')+' / '+String(ordered.length).padStart(2,'0');
      const existingLabel=reel.getAttribute('aria-label')||'';
      reel.setAttribute('aria-label',existingLabel.replace(/^Reel\s+\d+:/,'Reel '+(index+1)+':'));
    });
    const jump=new URLSearchParams(location.search).get('reel');
    if(!jump || jump==='intro'){
      try{history.scrollRestoration='manual';}catch{}
      feed.scrollTop=0;
      requestAnimationFrame(()=>{feed.scrollTop=0;});
      window.addEventListener('pageshow',()=>{
        requestAnimationFrame(()=>{feed.scrollTop=0;setActive('intro');});
      },{once:true});
    }
  }
  const nav=[...document.querySelectorAll('.rail-link')];
  const directory=document.getElementById('reel-directory');
  const directorySearch=document.getElementById('directory-search');
  const directoryItems=[...document.querySelectorAll('.directory-item')];
  const reelCounter=document.getElementById('reel-current');
  const progressBar=document.querySelector('.reel-progress-line');
  const progressFill=document.getElementById('reel-progress-fill');
  const share=document.querySelector('[data-action="share"]');
  const sound=document.querySelector('[data-action="sound"]');
  const like=document.querySelector('[data-action="like"]');
  const commentButton=document.querySelector('[data-action="comments"]');
  const commentsDialog=document.querySelector('#comments-dialog');
  const commentsList=document.querySelector('#comments-list');
  const commentsTitle=document.querySelector('#comments-title');
  const commentsMode=document.querySelector('#comment-mode');
  const commentsForm=document.querySelector('#comment-form');
  const commentsInput=document.querySelector('#comment-input');
  const charCount=document.querySelector('#comment-charcount');
  const audio=document.querySelector('#zuga-audio');
  const toast=document.querySelector('#toast');
  const siteUrl=(document.querySelector('meta[name="zuga:base"]')?.content||location.origin).replace(/\/$/,'');
  const engagementMode=document.querySelector('meta[name="zuga:engagement"]')?.content==='api'?'api':'local';
  const storageKey='zuga.engagement.v2';
  let current=reels[0]?.dataset.reel||'intro';
  let toastTimer=0, localEngagement={}, apiEngagement={};
  const sessionVisitorKey='zuga.session.visitor';
  let visitorId='';
  try{
    localEngagement=JSON.parse(localStorage.getItem(storageKey)||'{}')||{};
    visitorId=localStorage.getItem(sessionVisitorKey)||'';
    if(!visitorId){visitorId=(crypto.randomUUID?.()||'visitor-'+Math.random().toString(36).slice(2));localStorage.setItem(sessionVisitorKey,visitorId);}
  }catch{localEngagement={};visitorId='guest-'+Math.random().toString(36).slice(2);}
  const safeRecord=(id)=>{if(!localEngagement[id])localEngagement[id]={liked:false,comments:[]};return localEngagement[id];};
  const save=()=>{try{localStorage.setItem(storageKey,JSON.stringify(localEngagement));}catch{}};
  const notify=(message)=>{if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2800);};
  const currentUrl=()=>siteUrl+'/reels/'+encodeURIComponent(current)+'/';
  const reelLabel=()=>reels.find(x=>x.dataset.reel===current)?.dataset.title||'ZUGA';
  const apiUrl=(id)=>'/api/reels/'+encodeURIComponent(id);

  function updateEngagement(){
    const record=safeRecord(current);
    const counts=engagementMode==='api'?apiEngagement[current]:null;
    const likesCount=counts?.likes??(record.liked?1:0);
    const commentsCount=counts?.comments??record.comments.length;
    if(like){like.setAttribute('aria-pressed',String(record.liked));like.setAttribute('aria-label',record.liked?'בטל לייק':'אהבתי את הריל');}
    const likesLabel=document.querySelector('[data-count="likes"]');
    const commentsLabel=document.querySelector('[data-count="comments"]');
    if(likesLabel)likesLabel.textContent=String(likesCount);
    if(commentsLabel)commentsLabel.textContent=String(commentsCount);
  }
  async function readEngagement(id){
    if(engagementMode!=='api')return;
    try{
      const res=await fetch(apiUrl(id)+'/engagement?visitor='+encodeURIComponent(visitorId),{cache:'no-store'});
      if(!res.ok)throw Error('engagement unavailable');
      const state=await res.json();
      apiEngagement[id]=state;
      if(typeof state.liked==='boolean'){safeRecord(id).liked=state.liked;save();}
      if(current===id){updateEngagement();if(commentsDialog?.open)renderComments();}
    }catch{if(current===id)notify('חיבור התגובות עדיין אינו זמין');}
  }
  function setActive(id){
    if(!id)return;
    const changed=current!==id;
    current=id;
    nav.forEach(a=>a.setAttribute('aria-current',String(a.dataset.target===id)));
    const idx=reels.findIndex(reel=>reel.dataset.reel===id);
    if(idx>=0){
      let ordinal=idx+1,total=reels.length;
      if(!feed){const label=reels[0]?.querySelector('.reel-index')?.textContent||'';const match=label.match(/(\d+)\s*\/\s*(\d+)/);if(match){ordinal=Number(match[1]);total=Number(match[2]);}}
      if(reelCounter)reelCounter.textContent=String(ordinal).padStart(2,'0')+' / '+String(total).padStart(2,'0');
      if(progressBar){progressBar.setAttribute('aria-valuenow',String(ordinal));progressBar.setAttribute('aria-valuemax',String(total));}
      if(progressFill)progressFill.style.width=((ordinal/Math.max(1,total))*100).toFixed(3)+'%';
    }
    reels.forEach(reel=>reel.classList.toggle('is-active',reel.dataset.reel===id));
    updateEngagement();
    if(changed)readEngagement(id);
  }
  if(feed&&reels.length){
    const observer=new IntersectionObserver(entries=>{
      const candidates=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);
      if(candidates[0])setActive(candidates[0].target.dataset.reel);
    },{root:feed,threshold:[.25,.4,.55,.7]});
    reels.forEach(reel=>observer.observe(reel));
    nav.forEach(link=>link.addEventListener('click',ev=>{
      const target=document.getElementById('reel-'+link.dataset.target);
      if(target){ev.preventDefault();target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
    }));
    const initial=new URLSearchParams(location.search).get('reel');
    if(initial){const selected=document.getElementById('reel-'+initial);if(selected)requestAnimationFrame(()=>selected.scrollIntoView({behavior:'instant'}));}
    // Wheel/trackpad navigation across the whole reel, including its center.
    // Long quotations remain scrollable until the visitor reaches their edge.
    // Once at the edge, the next gesture advances the feed instead of getting trapped.
    let wheelAccum=0, wheelDirection=0, lastWheel=0, wheelLock=0;
    const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
    const goToReel=(delta)=>{
      const idx=reels.findIndex(reel=>reel.dataset.reel===current);
      const next=Math.max(0,Math.min(reels.length-1,idx+delta));
      if(next===idx)return;
      setActive(reels[next].dataset.reel);
      reels[next].scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'start'});
    };
    feed.addEventListener('wheel',ev=>{
      if(ev.ctrlKey||ev.metaKey||directory?.open||commentsDialog?.open || Math.abs(ev.deltaX)>Math.abs(ev.deltaY))return;
      // Let visitors read long paragraphs, opened notes or source comments normally.
      const panel=ev.target instanceof Element ? ev.target.closest('.book-scroll, .story-content--quote, .genesis-meaning-copy') : null;
      if(panel && panel.scrollHeight>panel.clientHeight+3){
        const down=ev.deltaY>0;
        const canScroll=down ? panel.scrollTop+panel.clientHeight<panel.scrollHeight-2 : panel.scrollTop>2;
        if(canScroll){wheelAccum=0;return;}
      }
      ev.preventDefault();
      const now=performance.now();
      if(now<wheelLock)return;
      if(now-lastWheel>280 || wheelDirection!==Math.sign(ev.deltaY))wheelAccum=0;
      lastWheel=now;
      wheelDirection=Math.sign(ev.deltaY);
      wheelAccum+=Math.abs(ev.deltaY)*(ev.deltaMode===1?18:ev.deltaMode===2?window.innerHeight:1);
      if(wheelAccum<48 || !wheelDirection)return;
      wheelAccum=0;
      wheelLock=now+720;
      goToReel(wheelDirection);
    },{capture:true,passive:false});
    // Native mobile swipe works on the whole card. Allow momentum to pass
    // from long text to the next reel at boundaries.
    window.addEventListener('keydown',ev=>{
      if(commentsDialog?.open)return;
      if(['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;
      const scrollPanel=document.activeElement?.closest?.('.book-scroll');
      if(scrollPanel)return;
      if(ev.key==='ArrowDown'||ev.key==='PageDown'){
        ev.preventDefault();const idx=reels.findIndex(reel=>reel.dataset.reel===current);
        reels[Math.min(reels.length-1,idx+1)]?.scrollIntoView({behavior:'smooth'});
      }
      if(ev.key==='ArrowUp'||ev.key==='PageUp'){
        ev.preventDefault();const idx=reels.findIndex(reel=>reel.dataset.reel===current);
        reels[Math.max(0,idx-1)]?.scrollIntoView({behavior:'smooth'});
      }
    });
  }
  // Scalable topic directory, used instead of one dot for each reel.
  document.querySelector('[data-action="directory"]')?.addEventListener('click',()=>{
    if(!directory)return;
    directory.showModal();
    if(directorySearch){directorySearch.value='';directorySearch.dispatchEvent(new Event('input'));directorySearch.focus();}
  });
  document.querySelector('[data-action="close-directory"]')?.addEventListener('click',()=>directory?.close());
  directory?.addEventListener('click',ev=>{if(ev.target===directory)directory.close();});
  directorySearch?.addEventListener('input',()=>{
    const q=directorySearch.value.trim().toLocaleLowerCase('he');
    let shown=0;
    directoryItems.forEach(item=>{const match=!q||(item.dataset.search||'').includes(q);item.hidden=!match;if(match)shown++;});
    const empty=directory?.querySelector('.directory-empty');if(empty)empty.hidden=shown!==0;
  });
  directoryItems.forEach(link=>link.addEventListener('click',ev=>{
    if(!feed)return; // On a standalone reel, follow its proper URL.
    const target=document.getElementById('reel-'+link.dataset.target);
    if(!target)return;
    ev.preventDefault();directory?.close();target.scrollIntoView({behavior:'instant'});
  }));
  setActive(current);readEngagement(current);

  like?.addEventListener('click',async()=>{
    const id=current, rec=safeRecord(id), before=rec.liked;
    rec.liked=!before;save();updateEngagement();
    if(engagementMode!=='api'){notify(rec.liked?'נשמר לייק במכשיר הזה':'הלייק הוסר');return;}
    like.disabled=true;
    try{
      const response=await fetch(apiUrl(id)+'/like',{
        method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({visitorId,liked:rec.liked})
      });
      if(!response.ok)throw Error('Like failed');
      const data=await response.json();apiEngagement[id]={...apiEngagement[id],likes:data.likes,liked:data.liked};
      rec.liked=data.liked;save();if(current===id)updateEngagement();
    }catch{rec.liked=before;save();if(current===id)updateEngagement();notify('לא ניתן לשמור לייק כרגע');}
    finally{like.disabled=false;}
  });

  function renderComments(){
    if(!commentsList)return;
    commentsList.replaceChildren();
    const data=engagementMode==='api'?apiEngagement[current]?.items||[]:safeRecord(current).comments;
    commentsTitle.textContent='תגובות · '+reelLabel();
    commentsMode.textContent=engagementMode==='api'?'תגובות מתפרסמות לאחר בדיקה.':'הדגמה מקומית — תגובות ולייקים נשמרים רק בדפדפן הזה.';
    if(!data.length){const empty=document.createElement('p');empty.className='comment-empty';empty.textContent='אין עדיין תגובות. אפשר להתחיל את השיחה.';commentsList.append(empty);return;}
    data.forEach(c=>{
      const item=document.createElement('article');item.className='comment-item';
      const title=document.createElement('span');title.className='comment-author';title.textContent='אורח/ת';
      const time=document.createElement('time');
      const stamp=new Date(c.createdAt||c.created_at||Date.now());
      time.textContent=Number.isNaN(stamp.getTime())?'':stamp.toLocaleDateString('he-IL');
      const p=document.createElement('p');p.textContent=c.text||c.body||'';
      item.append(title,time,p);commentsList.append(item);
    });
  }
  commentButton?.addEventListener('click',()=>{
    renderComments();commentsDialog?.showModal();commentsInput?.focus();
  });
  document.querySelector('[data-action="close-comments"]')?.addEventListener('click',()=>commentsDialog?.close());
  commentsDialog?.addEventListener('click',ev=>{if(ev.target===commentsDialog)commentsDialog.close();});
  commentsInput?.addEventListener('input',()=>{if(charCount)charCount.textContent=commentsInput.value.length+' / 500';});
  commentsForm?.addEventListener('submit',async ev=>{
    ev.preventDefault();const text=commentsInput?.value.trim()||'';
    if(text.length<3||text.length>500){notify('יש לכתוב תגובה באורך 3–500 תווים');return;}
    const id=current;
    const submit=commentsForm.querySelector('[type="submit"]');
    submit.disabled=true;
    try{
      if(engagementMode==='api'){
        const res=await fetch(apiUrl(id)+'/comments',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({visitorId,text})});
        if(!res.ok)throw Error('Cannot submit');
        notify('התגובה נשלחה לבדיקה לפני פרסום');
        readEngagement(id);
      }else{
        safeRecord(id).comments.unshift({text,createdAt:new Date().toISOString(),id:Date.now()});
        save();notify('התגובה נשמרה בדפדפן שלך');
      }
      commentsInput.value='';if(charCount)charCount.textContent='0 / 500';
      renderComments();updateEngagement();
    }catch{notify('לא ניתן לשמור את התגובה כעת');}
    finally{submit.disabled=false;}
  });

  share?.addEventListener('click',async()=>{
    const title=reelLabel();const url=currentUrl();
    try{
      if(navigator.share){await navigator.share({title,url});return;}
      if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(url);notify('קישור לריל הועתק');return;}
      window.prompt('קישור לריל — אפשר להעתיק:',url);
    }catch(err){if(err?.name!=='AbortError')notify('לא ניתן לשתף כרגע');}
  });

  // Try to begin the original soundtrack immediately. Major browsers usually
  // block unmuted autoplay until the visitor interacts with the page. If that
  // happens, retain the intent and start on the first valid gesture instead.
  let userStoppedMusic=false;
  let wantsAutomaticMusic=!!audio;
  let musicPlayAttempt=null;
  let resumeOnReturn=false;
  function showMusicState(playing){
    if(!sound)return;
    sound.dataset.on=String(playing);
    sound.dataset.pending=String(!playing && wantsAutomaticMusic && !userStoppedMusic);
    sound.setAttribute('aria-label',playing?'כבה מוזיקה':'הפעל מוזיקה');
    sound.setAttribute('aria-pressed',String(playing));
    sound.title=playing?'כבה את המוזיקה':'הפעל מוזיקה (דפדפנים מסוימים דורשים לחיצה ראשונה)';
  }
  async function startMusic(announce=false){
    if(!audio||userStoppedMusic)return false;
    if(!audio.paused){wantsAutomaticMusic=false;showMusicState(true);return true;}
    if(musicPlayAttempt)return musicPlayAttempt;
    audio.volume=.42;
    musicPlayAttempt=audio.play().then(()=>{
      wantsAutomaticMusic=false;
      showMusicState(true);
      if(announce)notify('ZUGA PULSE · פסקול מקורי הופעל');
      return true;
    }).catch(()=>{
      wantsAutomaticMusic=true;
      showMusicState(false);
      return false;
    }).finally(()=>{musicPlayAttempt=null;});
    return musicPlayAttempt;
  }
  function resumeMusicFromGesture(event){
    if(!wantsAutomaticMusic||userStoppedMusic||document.hidden||!audio?.paused)return;
    // Do not start in capture phase before the sound button's own click handler:
    // otherwise that same click would immediately mute it again.
    if(event.target instanceof Element && event.target.closest('[data-action="sound"]'))return;
    void startMusic();
  }
  for(const eventName of ['pointerdown','touchend','keydown']){
    document.addEventListener(eventName,resumeMusicFromGesture,{capture:true,passive:true});
  }
  sound?.addEventListener('click',async()=>{
    if(!audio){notify('המוזיקה אינה זמינה');return;}
    if(!audio.paused){
      userStoppedMusic=true;
      wantsAutomaticMusic=false;
      audio.pause();
      showMusicState(false);
      return;
    }
    userStoppedMusic=false;
    wantsAutomaticMusic=true;
    const success=await startMusic(true);
    if(!success)notify('הדפדפן דורש אינטראקציה להפעלת המוזיקה');
  });
  audio?.addEventListener('pause',()=>showMusicState(false));
  audio?.addEventListener('playing',()=>showMusicState(true));
  document.addEventListener('visibilitychange',()=>{
    if(!audio)return;
    if(document.hidden){
      if(!audio.paused){resumeOnReturn=true;audio.pause();}
    }else if(resumeOnReturn&&!userStoppedMusic){
      resumeOnReturn=false;
      wantsAutomaticMusic=true;
      void startMusic();
    }
  });
  // On capable browsers, sound begins on load; otherwise the first tap/key
  // will trigger it. Autoplay with sound cannot be guaranteed by any website.
  if(audio){showMusicState(false);void startMusic();}

  // Lightweight animated stars on hero only (paused offscreen/reduced-motion).
  const canvas=document.getElementById('star-canvas');
  if(!canvas||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
  let points=[],running=false,raf=0,last=0,w=0,h=0;
  function resize(){
    const box=canvas.getBoundingClientRect();w=box.width;h=box.height;
    const ratio=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);
    points=Array.from({length:Math.min(130,Math.max(48,Math.floor(w*h/12000)))},()=>({x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.1+.25,a:Math.random()*.65+.18,p:Math.random()*Math.PI*2,s:.2+Math.random()*.65}));
  }
  function draw(t){
    if(!running)return;
    raf=requestAnimationFrame(draw);if(t-last<32)return;last=t;
    ctx.clearRect(0,0,w,h);
    points.forEach(p=>{
      const a=p.a*(.55+.45*Math.sin(t*.00055*p.s+p.p));
      ctx.fillStyle=`rgba(207,227,255,${a})`;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
      if(p.r>.8){ctx.strokeStyle=`rgba(129,206,255,${a*.15})`;ctx.beginPath();ctx.moveTo(p.x-4,p.y);ctx.lineTo(p.x+4,p.y);ctx.stroke();}
    });
  }
  const hero=document.querySelector('.reel-brand');
  resize();window.addEventListener('resize',resize,{passive:true});
  const watch=new IntersectionObserver(entries=>{
    const visible=entries.some(entry=>entry.isIntersecting);
    if(visible&&!running){running=true;raf=requestAnimationFrame(draw);}else if(!visible&&running){running=false;cancelAnimationFrame(raf);}
  },{threshold:.1,root:feed||null});
  if(hero)watch.observe(hero);
})();
