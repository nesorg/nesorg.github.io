/* NES public website: functional menus, application forms, live published content and certificate lookup. */
(()=>{'use strict';
  const cfg=window.NES_CONFIG||{};
  const connected=Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey&&/^https:\/\//.test(cfg.supabaseUrl));
  const base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
  const escape=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl=(v)=>{try{const u=new URL(String(v||''),location.href);return ['https:','http:'].includes(u.protocol)?escape(u.href):''}catch{return ''}};
  const fmt=(v)=>{if(!v)return '';const d=new Date(v);return isNaN(d)?String(v):new Intl.DateTimeFormat('en-PK',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Karachi'}).format(d)};
  const liveTag=()=>connected;
  async function request(path,method='GET',body){
    if(!connected)throw Error('The online database has not been connected yet. Please contact NES administration.');
    const r=await fetch(base+path,{method,headers:{'apikey':cfg.supabaseAnonKey,'Content-Type':'application/json',...(method==='POST'&&path.includes('/rest/v1/applications')?{'Prefer':'return=minimal'}:{})},body:body==null?undefined:JSON.stringify(body)});
    if(!r.ok){let msg='Request failed. Please try again.';try{const j=await r.json();if(j.message)msg=j.message}catch{}throw Error(msg)}
    if(r.status===204)return null;const responseText=await r.text();return responseText?JSON.parse(responseText):null;
  }
  function demoRecords(name){try{return JSON.parse(localStorage.getItem('nes_demo:'+name)||'[]')}catch{return []}}
  async function list(name,limit=80){
    if(!connected)return demoRecords(name).filter(x=>x.status==='published').slice(0,limit);
    const ordering=name==='programs'?'priority.asc,created_at.desc':name==='events'?'event_date.asc':'created_at.desc';
    return await request('/rest/v1/'+name+'?select=*&status=eq.published&order='+ordering+'&limit='+limit);
  }
  function empty(title,message,ico='✧'){return `<div class="empty-state" style="grid-column:1/-1"><span class="big">${ico}</span><h3>${escape(title)}</h3><p>${escape(message)}</p></div>`}
  const initials=s=>String(s||'NES').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  function img(url,title,kind='profile'){
    const good=safeUrl(url);
    if(good)return `<img src="${good}" alt="${escape(title)}" loading="lazy" onerror="this.style.display='none'">`;
    return kind==='profile'?`<div class="avatar-large" aria-hidden="true">${escape(initials(title))}</div>`:'';
  }
  function rendered(name,r){
    const title=escape(r.title||r.name||'Untitled');
    const summary=escape(r.summary||r.description||'');
    if(name==='events'){
      const past=r.event_date&&new Date(r.event_date).getTime()<Date.now();
      const reg=r.registration_open!==false&&!past;
      return `<article class="card"><div class="item-top"><span class="tag">${escape(r.category||'NES Event')}</span><span class="badge-status ${past?'closed':'pending'}">${past?'Completed':'Upcoming'}</span></div><h3>${title}</h3><p class="item-meta">📅 ${escape(fmt(r.event_date)||'Date to be announced')} &nbsp; · &nbsp; 📍 ${escape(r.venue||'Venue to be confirmed')}</p><p>${summary}</p>${reg?`<a class="card-foot" href="join.html#event?event=${encodeURIComponent(r.id)}">Register interest ↗</a>`:''}</article>`;
    }
    if(name==='programs')return `<article class="card"><div class="card-icon">${escape(r.icon||'📘')}</div><h3>${title}</h3><p>${summary}</p>${r.category?`<span class="tag">${escape(r.category)}</span>`:''}</article>`;
    if(name==='opportunities')return `<article class="card"><div class="item-top"><span class="tag">${escape(r.category||'Opportunity')}</span></div><h3>${title}</h3><p class="item-meta">${r.deadline?'⏰ Apply by '+escape(fmt(r.deadline)):'Check official details'}</p><p>${summary}</p>${safeUrl(r.url)?`<a class="card-foot" href="${safeUrl(r.url)}" target="_blank" rel="noopener noreferrer">Official application ↗</a>`:''}</article>`;
    if(name==='posts')return `<article class="card">${img(r.image_url,title,'media')}<p class="item-meta">${escape(fmt(r.created_at))}</p><h3>${title}</h3><p>${summary}</p>${r.body?`<details><summary class="card-foot">Read update</summary><p>${escape(r.body).replace(/\n/g,'<br>')}</p></details>`:''}</article>`;
    if(name==='team'||name==='ambassadors')return `<article class="card profile-card">${img(r.image_url,r.name)}<h3>${escape(r.name||'NES Member')}</h3><p class="item-meta">${escape(r.role||r.designation||'Representative')}</p><p>${escape(r.institution||r.department||'')}${r.city?' · '+escape(r.city):''}</p></article>`;
    if(name==='media')return `<article class="card profile-card">${img(r.image_url,title,'media')}<h3>${title}</h3><p>${summary}</p></article>`;
    return '';
  }
  async function loadCollections(){
    const els=[...document.querySelectorAll('[data-collection]')];
    await Promise.all(els.map(async el=>{
      const name=el.dataset.collection;
      try{const items=await list(name,90);if(!items.length)return;el.dataset.items=JSON.stringify(items);
        paintCollection(el,items);
      }catch(e){if(connected)console.warn('Unable to load '+name,e.message)}
    }));
  }
  function paintCollection(el,all){
    const name=el.dataset.collection,search=document.getElementById(name==='events'?'event-search':'op-search'),fil=document.getElementById(name==='events'?'event-filter':'op-filter');
    let arr=all.filter(x=>{
      if(search&&search.value&&!JSON.stringify([x.title,x.name,x.venue,x.summary]).toLowerCase().includes(search.value.toLowerCase().trim()))return false;
      if(fil&&fil.value!=='all'){
        if(name==='events'){const past=x.event_date&&new Date(x.event_date).getTime()<Date.now();if(fil.value==='past'&&!past)return false;if(fil.value==='upcoming'&&past)return false}
        else if((x.category||'').toLowerCase()!==fil.value.toLowerCase())return false;
      }return true
    });
    if(el.dataset.limit)arr=arr.slice(0,Number(el.dataset.limit));
    el.innerHTML=arr.length?arr.map(x=>rendered(name,x)).join(''):empty('No matching results','Try adjusting your search or browse other sections.','🔎');
  }
  function setupFiltering(){for(const name of ['events','opportunities']){const el=document.querySelector(`[data-collection="${name}"][data-filtered]`);if(!el)continue;const search=document.getElementById(name==='events'?'event-search':'op-search'),fil=document.getElementById(name==='events'?'event-filter':'op-filter');for(const input of [search,fil])input?.addEventListener('input',()=>{if(el.dataset.items)paintCollection(el,JSON.parse(el.dataset.items));});}}
  async function loadSettings(){
    let rows=[];
    try{rows=connected?await request('/rest/v1/site_settings?select=key,value'):demoRecords('site_settings')}catch{}
    const map=Object.fromEntries(rows.map(x=>[x.key,x.value]));
    for(const el of document.querySelectorAll('[data-setting]')){
      const val=map[el.dataset.setting];if(!val)continue;
      el.textContent=val;
      if(el.dataset.setting==='contact_email'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){
        const a=document.createElement('a');a.href='mailto:'+val;a.textContent=val;el.replaceChildren(a);
      }
      if(el.dataset.setting==='whatsapp'&&/^[+()0-9\s-]{10,24}$/.test(val)){
        let phone=val.replace(/\D/g,'');if(phone.startsWith('0'))phone='92'+phone.slice(1);
        const a=document.createElement('a');a.href='https://wa.me/'+phone;a.target='_blank';a.rel='noopener noreferrer';a.textContent=val;el.replaceChildren(a);
      }
    }
    for(const el of document.querySelectorAll('[data-social-links]')){
      el.replaceChildren();for(const key of ['facebook','instagram','linkedin']){
        if(!map[key]||!/^https:\/\//i.test(map[key]))continue;
        const a=document.createElement('a');a.href=map[key];a.rel='noopener noreferrer';a.target='_blank';a.className='tag';a.textContent=key[0].toUpperCase()+key.slice(1);el.append(a);
      }
    }
  }
  function status(form,msg,ok){const el=form.querySelector('.form-status');if(!el)return;el.className='form-status show '+(ok?'success':'error');el.textContent=msg}
  const tokenRef=()=>{const a=new Uint8Array(6);crypto.getRandomValues(a);return 'NES-'+Date.now().toString(36).toUpperCase()+'-'+[...a].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase()};
  function setupForms(){for(const form of document.querySelectorAll('.nes-form'))form.addEventListener('submit',async ev=>{
    ev.preventDefault();if(!form.reportValidity())return;
    if(form.elements.website?.value){status(form,'Submission could not be processed.',false);return}
    if(!connected){status(form,'Online applications are not active yet. NES must connect its secure database before accepting applications.',false);return}
    const fd=new FormData(form),kind=form.dataset.kind;
    const eventId=String(fd.get('event_id')||'');
    if(kind==='event'&&!eventId){status(form,'Please select a published event.',false);return}
    const record={reference:tokenRef(),kind,full_name:String(fd.get('full_name')||'').trim(),email:String(fd.get('email')||'').trim(),phone:String(fd.get('phone')||'').trim()||null,city:String(fd.get('city')||'').trim()||null,institution:String(fd.get('institution')||'').trim()||null,qualification:String(fd.get('qualification')||'').trim()||null,department:String(fd.get('department')||'').trim()||null,semester:String(fd.get('semester')||'').trim()||null,detail:String(fd.get('detail')||'').trim()||null,event_id:kind==='event'?eventId:null,consent:fd.get('consent')==='on',status:'pending'};
    if(!record.full_name||!record.email||!record.consent){status(form,'Please complete all required fields.',false);return}
    const btn=form.querySelector('[type="submit"]');btn.disabled=true;const label=btn.textContent;btn.textContent='Submitting…';
    try{await request('/rest/v1/applications','POST',record);form.reset();status(form,'Application received. Your reference number is '+record.reference+'. Please save it for your records.',true)}catch(e){status(form,'Could not submit: '+e.message,false)}finally{btn.disabled=false;btn.textContent=label}
  })}
  async function loadEventSelect(){const select=document.querySelector('#e-event');if(!select)return;
    let events=[];try{events=await list('events',100)}catch{};
    const open=events.filter(e=>e.registration_open!==false&&(!e.event_date||new Date(e.event_date).getTime()>Date.now()));
    select.innerHTML='<option value="">'+(open.length?'Choose an event':'No events accepting registration')+'</option>'+open.map(e=>`<option value="${escape(e.id)}">${escape(e.title)}${e.event_date?' — '+escape(fmt(e.event_date)):''}</option>`).join('');
    const params=new URLSearchParams(location.search);const id=params.get('event')||new URLSearchParams((location.hash.split('?')[1]||'')).get('event');if(id&&open.some(x=>String(x.id)===id))select.value=id;
  }
  function setupTabs(){const buttons=[...document.querySelectorAll('[data-tab]')];if(!buttons.length)return;
    function activate(name,write=true){if(!['membership','ambassador','event'].includes(name))return;for(const b of buttons){const sel=b.dataset.tab===name;b.setAttribute('aria-selected',String(sel));document.getElementById(b.dataset.tab)?.classList.toggle('active',sel)}if(write)history.replaceState(null,'','#'+name)}
    buttons.forEach((b,index)=>{b.addEventListener('click',()=>activate(b.dataset.tab));b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const next=buttons[(index+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length];next.focus();activate(next.dataset.tab)})});
    const initial=location.hash.replace('#','').split('?')[0];activate(['membership','ambassador','event'].includes(initial)?initial:'membership',false);
    window.addEventListener('hashchange',()=>activate(location.hash.slice(1).split('?')[0],false));
  }
  function setupMenu(){const button=document.getElementById('menu-toggle'),menu=document.getElementById('mobile-nav');if(!button||!menu)return;button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Close navigation':'Open navigation');button.textContent=open?'✕':'☰';menu.classList.toggle('open',open)});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');button.setAttribute('aria-expanded','false');button.textContent='☰'}))}
  function setupVerify(){const form=document.getElementById('verify-form');if(!form)return;
    const result=document.getElementById('verify-result');const pre=new URLSearchParams(location.search).get('code');if(pre)document.getElementById('certificate-code').value=pre;
    form.addEventListener('submit',async e=>{e.preventDefault();const code=document.getElementById('certificate-code').value.trim().toUpperCase();result.innerHTML='Checking certificate…';if(!connected){result.innerHTML='<div class="note-box">The verification service is not active until the secure NES database is connected.</div>';return}
      try{const data=await request('/rest/v1/rpc/verify_certificate','POST',{p_code:code});const r=Array.isArray(data)?data[0]:data;
        if(!r){result.innerHTML='<div class="form-status show error">No valid NES certificate was found with that code. Please check the characters and try again.</div>';return}
        result.innerHTML=`<div class="form-status show success">✓ Verified NES certificate</div><div class="table-wrap mt-4"><table><tbody><tr><th>Recipient</th><td>${escape(r.recipient_name)}</td></tr><tr><th>Certificate</th><td>${escape(r.certificate_type)}</td></tr><tr><th>Issued on</th><td>${escape(fmt(r.issue_date))}</td></tr><tr><th>Event / Program</th><td>${escape(r.event_title||'NES')}</td></tr><tr><th>Verification code</th><td>${escape(code)}</td></tr></tbody></table></div>`;
      }catch(err){result.innerHTML='<div class="form-status show error">Verification service is temporarily unavailable: '+escape(err.message)+'</div>'}
    });if(pre&&connected)form.requestSubmit();
  }
  document.addEventListener('DOMContentLoaded',async()=>{
    const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();setupMenu();setupTabs();setupForms();setupFiltering();setupVerify();
    await Promise.all([loadCollections(),loadSettings(),loadEventSelect()]);
  });
  window.NES_PUBLIC={connected:liveTag,escape,fmt};
})();
