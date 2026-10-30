/* NES administration: Supabase authenticated CRUD with RLS. Local mode is explicitly preview-only. */
(()=>{'use strict';
const cfg=window.NES_CONFIG||{},base=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const online=/^https:\/\//.test(base)&&Boolean(cfg.supabaseAnonKey);
let preview=false,session=null,current='dashboard',rows=[],filterText='',statusFilter='all',editId=null;
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const field=(key,label,type='text',opts={})=>({key,label,type,...opts});
const statusField=field('status','Visibility','select',{options:['draft','published']});
const imgField=field('image_url','Photo / image URL','image',{wide:true});
const defs={
 events:{title:'Events',subtitle:'Create public events and manage registration availability.',cols:['title','category','event_date','venue','status'],fields:[field('title','Event title','text',{required:true,wide:true}),field('category','Category','select',{options:['Seminar','Workshop','Talent Hunt','Competition','Community','Career','Other']}),field('event_date','Event date & time','datetime-local',{required:true}),field('venue','Venue','text'),field('summary','Short description','textarea',{wide:true,required:true}),field('registration_open','Accept registrations','checkbox'),statusField]},
 programs:{title:'Programs',subtitle:'Edit the programs shown on the public Programs page.',cols:['title','category','priority','status'],fields:[field('title','Program title','text',{required:true,wide:true}),field('icon','Icon (emoji)','text'),field('category','Category','text'),field('priority','Display order','number'),field('summary','Short description','textarea',{wide:true,required:true}),statusField]},
 opportunities:{title:'Opportunities',subtitle:'Publish scholarships, internships and training opportunities.',cols:['title','category','deadline','status'],fields:[field('title','Opportunity title','text',{required:true,wide:true}),field('category','Category','select',{options:['Scholarship','Internship','Training','Job','Competition','Admission']}),field('deadline','Deadline','date'),field('url','Official application URL','url',{wide:true}),field('summary','Details and eligibility','textarea',{required:true,wide:true}),statusField]},
 posts:{title:'News & Articles',subtitle:'Write official news, reports and announcements.',cols:['title','summary','status','created_at'],fields:[field('title','Headline','text',{required:true,wide:true}),field('summary','Summary','textarea',{wide:true,required:true}),field('body','Full article','textarea',{wide:true}),imgField,statusField]},
 media:{title:'Media Gallery',subtitle:'Manage approved event photographs and images.',cols:['title','summary','status'],fields:[field('title','Caption / title','text',{required:true,wide:true}),field('summary','Description','textarea',{wide:true}),imgField,statusField]},
 team:{title:'Team Members',subtitle:'Publish approved leadership and staff profiles.',cols:['name','role','department','status'],fields:[field('name','Full name','text',{required:true}),field('role','Official role','text',{required:true}),field('department','Department','text',{wide:true}),imgField,statusField]},
 ambassadors:{title:'University Ambassadors',subtitle:'Manage consent-approved campus representative profiles.',cols:['name','role','institution','city','status'],fields:[field('name','Full name','text',{required:true}),field('role','Ambassador designation','text'),field('institution','University / Institution','text',{required:true,wide:true}),field('city','City','text'),imgField,statusField]},
 certificates:{title:'Certificates',subtitle:'Issue high-entropy verification codes and revoke records.',cols:['verification_code','recipient_name','certificate_type','issue_date','status'],fields:[field('recipient_name','Recipient name','text',{required:true}),field('certificate_type','Certificate type','select',{options:['Membership','Volunteer Experience','Event Participation','Ambassador','Achievement','Other']}),field('issue_date','Issue date','date',{required:true}),field('event_title','Program / Event title','text',{wide:true}),field('verification_code','Unique verification code','text',{required:true,wide:true}),field('status','Certificate status','select',{options:['valid','revoked']})]}
};
const settings=[
 {key:'hero_highlight',label:'Homepage headline (highlighted text)'},
 {key:'hero_subtitle',label:'Homepage introductory description',wide:true},
 {key:'about_intro',label:'About NES introduction',wide:true},
 {key:'vision',label:'Vision statement',wide:true},
 {key:'mission',label:'Mission statement',wide:true},
 {key:'contact_email',label:'Official contact email'},
 {key:'whatsapp',label:'WhatsApp number'},
 {key:'contact_location',label:'Location / address'},
 {key:'facebook',label:'Facebook URL'},
 {key:'instagram',label:'Instagram URL'},
 {key:'linkedin',label:'LinkedIn URL'}
];
const defaultPrograms=[['📚','Educational Development','Academic guidance, learning resources, educational awareness, and student growth.'],['🌱','Youth Leadership','Leadership, teamwork, public speaking, and confidence-building experiences.'],['💻','Skills & Career Readiness','Digital literacy, CV writing, interviews and employability skills.'],['🏆','Talent Hunt & Competitions','Quizzes, academic competitions and recognition of young talent.'],['🎤','Seminars & Workshops','Knowledge-sharing sessions with educators, trainers and professionals.'],['🤝','Community Education','Educational outreach, volunteer service and participation.'],['🎯','Career Guidance','Scholarships, internships and educational pathways.'],['🎨','Creativity & Media','Content creation, digital communication and visual storytelling.']];
const generateUUID=()=>{const a=new Uint8Array(16);crypto.getRandomValues(a);a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;const h=[...a].map(x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
const timeFmt=v=>{if(!v)return '—';const d=new Date(v);if(isNaN(d))return v;return d.toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'})};
function toast(msg,bad=false){const el=$('#admin-alert');el.className='admin-toast '+(bad?'error':'ok');el.textContent=msg;window.scrollTo({top:0,behavior:'smooth'});setTimeout(()=>{if(el.textContent===msg){el.textContent='';el.className=''}},5500)}
function demoRead(table){try{return JSON.parse(localStorage.getItem('nes_demo:'+table)||'[]')}catch{return []}}
function demoWrite(table,items){localStorage.setItem('nes_demo:'+table,JSON.stringify(items))}
function seedPreview(){if(localStorage.getItem('nes_preview_initialized'))return;
 demoWrite('programs',defaultPrograms.map(([icon,title,summary],i)=>({id:generateUUID(),icon,title,summary,priority:i+1,category:'NES Program',status:'published',created_at:new Date().toISOString()})));
 const vals={hero_highlight:'Inspiring futures.',hero_subtitle:'Nara Educational Society connects students, educators and changemakers through education, leadership, opportunities and community action.',about_intro:'Nara Educational Society (NES) is an educational and youth-development initiative focused on learning, leadership, useful skills and positive community contributions.',vision:'To build an educated, empowered, skilled and socially responsible generation through knowledge, innovation, leadership and collective action.',mission:'To promote educational opportunities, nurture young talent, strengthen leadership, support career readiness and connect students with meaningful opportunities.',contact_location:'Sindh, Pakistan'};
 demoWrite('site_settings',Object.entries(vals).map(([key,value])=>({key,value})));
 localStorage.setItem('nes_preview_initialized','true');
}
async function refreshToken(){if(!session?.refresh_token)throw Error('Your session expired. Please sign in again.');
 const r=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
 if(!r.ok)throw Error('Your session expired. Please sign in again.');const data=await r.json();session={...data,user:data.user||session.user};sessionStorage.setItem('nes_admin_session',JSON.stringify(session));
}
async function api(path,method='GET',body,retry=true){
 const headers={'apikey':cfg.supabaseAnonKey,'Authorization':'Bearer '+session.access_token};if(!(body instanceof File))headers['Content-Type']='application/json';
 if(['POST','PATCH','DELETE'].includes(method))headers.Prefer='return=representation';
 const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:body instanceof File?body:JSON.stringify(body)});
 if(r.status===401&&retry){await refreshToken();return api(path,method,body,false)}
 if(!r.ok){let msg='Operation failed';try{const x=await r.json();msg=x.message||x.error_description||msg}catch{}throw Error(msg)}
 const text=await r.text();return text?JSON.parse(text):null;
}
async function all(table){if(preview)return demoRead(table);return await api('/rest/v1/'+table+'?select=*&limit=1000&order='+(table==='site_settings'?'key.asc':'created_at.desc'))}
async function save(table,record,id){if(preview){const list=demoRead(table),index=list.findIndex(x=>x.id===id);
 if(index>=0)list[index]={...list[index],...record};else list.unshift({...record,id:generateUUID(),created_at:new Date().toISOString()});demoWrite(table,list);return;
 }const path='/rest/v1/'+table+(id?'?id=eq.'+encodeURIComponent(id):'');await api(path,id?'PATCH':'POST',record)}
async function remove(table,id){if(preview){demoWrite(table,demoRead(table).filter(x=>x.id!==id));return}await api('/rest/v1/'+table+'?id=eq.'+encodeURIComponent(id),'DELETE')}
async function saveSettings(records){if(preview){demoWrite('site_settings',records);return}
 const existing=await all('site_settings');const known=new Set(existing.map(x=>x.key));for(const r of records){if(known.has(r.key))await api('/rest/v1/site_settings?key=eq.'+encodeURIComponent(r.key),'PATCH',{value:r.value});else await api('/rest/v1/site_settings','POST',r);}
}
async function signIn(email,password){const r=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':cfg.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
 const x=await r.json();if(!r.ok)throw Error(x.error_description||x.msg||x.message||'Login failed');session=x;sessionStorage.setItem('nes_admin_session',JSON.stringify(x));await authorize();}
async function authorize(){if(!session?.user?.id)throw Error('Invalid login session');const x=await api('/rest/v1/admins?select=role&user_id=eq.'+encodeURIComponent(session.user.id));if(!x?.length){sessionStorage.removeItem('nes_admin_session');throw Error('This account does not have an NES admin role. Ask the system owner to authorize it.')}$('#admin-user').textContent=session.user.email||x[0].role;}
function showApp(){ $('#login-screen').classList.add('hidden');$('#app').classList.remove('hidden');$('#preview-banner').classList.toggle('hidden',!preview);render('dashboard');}
function hideApp(){ $('#app').classList.add('hidden');$('#login-screen').classList.remove('hidden');}
function updateNavigation(view){$$('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));$('#admin-crumb').textContent=view==='dashboard'?'Dashboard':defs[view]?.title||view[0].toUpperCase()+view.slice(1);$('#new-btn').classList.toggle('hidden',!defs[view]);$('#export-btn').classList.toggle('hidden',view==='dashboard'||view==='settings');$('#new-btn').textContent=view==='certificates'?'+ Issue Certificate':'+ Add New';}
async function render(view){current=view;filterText='';statusFilter='all';updateNavigation(view);$('#sidebar-toggle').setAttribute('aria-expanded','false');$('#admin-sidebar').classList.remove('open');
 const title=view==='dashboard'?'Dashboard Overview':view==='applications'?'Applications & Inquiries':view==='settings'?'Website Settings':defs[view]?.title||view;
 const sub=view==='dashboard'?'Manage NES operations from one central place.':view==='applications'?'Review and process student applications and contact inquiries.':view==='settings'?'Edit public website text and organization contact details.':defs[view]?.subtitle||'';
 $('#view-title').textContent=title;$('#view-subtitle').textContent=sub;$('#admin-content').innerHTML='<div class="admin-empty">Loading information…</div>';
 try{if(view==='dashboard')await dashboard();else if(view==='settings')await renderSettings();else await renderTable(view)}catch(e){$('#admin-content').innerHTML=`<div class="admin-panel"><p class="subtle">Unable to load this section: ${esc(e.message)}</p></div>`;toast(e.message,true)}
}
async function dashboard(){const names=['applications','events','ambassadors','certificates'];const result=await Promise.all(names.map(all));const map=Object.fromEntries(names.map((n,i)=>[n,result[i]]));const pending=map.applications.filter(x=>x.status==='pending').length;
 $('#pending-pill').textContent=pending?String(pending):'';
 const stats=[['♙','Applications',map.applications.length],['⏱','Awaiting review',pending],['▦','Published events',map.events.filter(x=>x.status==='published').length],['🎓','Published ambassadors',map.ambassadors.filter(x=>x.status==='published').length]];
 $('#admin-content').innerHTML=`<div class="admin-stat-grid">${stats.map(([icon,label,n])=>`<div class="admin-stat"><span class="icon">${icon}</span><span class="number">${n}</span><small>${label}</small></div>`).join('')}</div><div class="grid-2 mt-4"><section class="admin-panel"><h3>Recent applications</h3><div class="mini-list">${map.applications.slice(0,5).map(x=>`<div class="mini-row"><div class="details"><strong>${esc(x.full_name)}</strong><small>${esc(x.kind)} · ${esc(x.reference)}</small></div><span class="badge-status ${esc(x.status)}">${esc(x.status)}</span></div>`).join('')||'<div class="admin-empty">No applications received yet.</div>'}</div><button class="btn btn-outline btn-sm mt-4" data-go="applications">Review Applications →</button></section><section class="admin-panel"><h3>Upcoming event overview</h3><div class="mini-list">${map.events.filter(x=>x.status==='published'&&(!x.event_date||new Date(x.event_date)>new Date())).slice(0,5).map(x=>`<div class="mini-row"><div class="details"><strong>${esc(x.title)}</strong><small>${esc(timeFmt(x.event_date))} · ${esc(x.venue||'TBA')}</small></div></div>`).join('')||'<div class="admin-empty">No published upcoming events.</div>'}</div><button class="btn btn-outline btn-sm mt-4" data-go="events">Manage Events →</button></section></div><section class="admin-panel"><h3>Quick actions</h3><div class="admin-tools"><button data-new="events">+ Create Event</button><button data-new="posts">+ Publish News</button><button data-new="opportunities">+ Add Opportunity</button><button data-new="team">+ Add Team Member</button><button data-new="certificates">+ Issue Certificate</button><button data-go="settings">⚙ Website Settings</button></div></section><div class="admin-note mt-4">${preview?'Preview only — this browser is the only place these records exist.':'Live mode — publication changes are saved to your Supabase database and reflected on the public website.'}</div>`;
}
function drawFilter(rows){return `<div class="filter-tools"><input id="admin-search" type="search" placeholder="Search current records…" aria-label="Search records"><select id="admin-status"><option value="all">All statuses</option>${['pending','approved','declined','draft','published','valid','revoked'].map(s=>`<option value="${s}">${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select></div>`}
function previewCell(row,key){const val=row[key];if(key==='event_date'||key==='created_at'||key==='deadline'||key==='issue_date')return esc(timeFmt(val));if(key==='status')return `<span class="badge-status ${esc(val)}">${esc(val||'—')}</span>`;return esc(val==null?'—':String(val).slice(0,75))}
function paintTable(view){const content=$('#records-area');if(!content)return;
 const cols=view==='applications'?['reference','full_name','kind','email','created_at','status']:defs[view].cols;
 const filtered=rows.filter(row=>{const txt=Object.values(row).join(' ').toLowerCase();return txt.includes(filterText.toLowerCase())&&(statusFilter==='all'||row.status===statusFilter)});
 if(!filtered.length){content.innerHTML='<div class="admin-empty"><b>No matching records</b>Use “Add New” to create an entry, or change your search filters.</div>';return}
 content.innerHTML=`<div class="table-wrap"><table class="admin-table"><thead><tr>${cols.map(c=>`<th>${esc(c.replaceAll('_',' '))}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${filtered.map(row=>`<tr>${cols.map(c=>`<td title="${esc(String(row[c]??''))}">${previewCell(row,c)}</td>`).join('')}<td><div class="cell-actions">${view==='applications'?`<button class="icon-btn" data-detail="${esc(row.id)}">View</button>`:`<button class="icon-btn" data-edit="${esc(row.id)}">Edit</button><button class="icon-btn danger" data-delete="${esc(row.id)}">Delete</button>`}</div></td></tr>`).join('')}</tbody></table></div><p class="subtle text-sm mt-4">Showing ${filtered.length} of ${rows.length} records. Updates to published content appear on the public site.</p>`;
}
async function renderTable(view){rows=await all(view);$('#admin-content').innerHTML=`<section class="admin-panel">${drawFilter(rows)}<div id="records-area"></div></section>`;paintTable(view);}
function addFieldHTML(f,v){const raw=v??'',id='f-'+f.key;const wide=f.wide?' wide':'';let input='';
 if(f.type==='select')input=`<select id="${id}" name="${esc(f.key)}">${f.options.map(opt=>`<option value="${esc(opt)}" ${String(raw)===opt?'selected':''}>${esc(opt[0].toUpperCase()+opt.slice(1))}</option>`).join('')}</select>`;
 else if(f.type==='textarea')input=`<textarea id="${id}" name="${esc(f.key)}" ${f.required?'required':''} maxlength="5000">${esc(raw)}</textarea>`;
 else if(f.type==='checkbox')input=`<input id="${id}" name="${esc(f.key)}" type="checkbox" ${raw?'checked':''}>`;
 else {const dt=f.type==='datetime-local'&&raw?String(raw).slice(0,16):raw;input=`<input id="${id}" name="${esc(f.key)}" type="${f.type==='image'?'url':f.type}" value="${esc(dt)}" ${f.required?'required':''} ${f.type==='number'?'min="0" max="9999"':''} maxlength="${f.type==='url'||f.type==='image'?500:250}">`}
 if(f.type==='image')input+=`<input class="file-upload" type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload-for="${esc(f.key)}"><small class="upload-status">${preview?'Preview mode: use an image URL; file uploads need the online database.':'Optional: upload JPG, PNG, WebP or GIF, max 4 MB.'}</small>`;
 return `<div class="form-field${wide}"><label for="${id}">${esc(f.label)}${f.required?' *':''}</label>${input}</div>`;
}
function makeCode(){const bytes=new Uint8Array(8);crypto.getRandomValues(bytes);return 'NES-'+[...bytes].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase()}
function openEditor(table,id){const item=id?rows.find(r=>String(r.id)===String(id)):null;editId=item?.id||null;const fields=defs[table]?.fields;if(!fields)return;
 $('#dialog-title').textContent=(item?'Edit ':'Add ')+(table==='certificates'?'Certificate':defs[table].title.replace(/s$/,''));
 $('#dialog-fields').innerHTML=fields.map(f=>addFieldHTML(f,item?item[f.key]:f.key==='status'?(table==='certificates'?'valid':'draft'):f.key==='verification_code'?makeCode():f.key==='issue_date'?new Date().toISOString().slice(0,10):f.key==='priority'?10:null)).join('');
 const dialog=$('#record-dialog');dialog.dataset.table=table;dialog.showModal();
}
async function uploadImage(file){if(preview)throw Error('File uploads require a connected online database. Enter an image URL in preview mode.');
 if(!file||file.size>4*1024*1024)throw Error('Please choose an image smaller than 4 MB.');
 if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('Only image files are supported.');
 const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'})[file.type];
 const path='images/'+generateUUID()+'.'+ext;
 const r=await fetch(base+'/storage/v1/object/nes-media/'+path,{method:'POST',headers:{apikey:cfg.supabaseAnonKey,Authorization:'Bearer '+session.access_token,'Content-Type':file.type,'x-upsert':'false'},body:file});
 if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.message||j.error||'Image upload failed. Check your storage bucket policies.')}return base+'/storage/v1/object/public/nes-media/'+path;
}
async function recordSubmit(ev){ev.preventDefault();const table=$('#record-dialog').dataset.table,form=$('#record-form');if(!form.reportValidity())return;
 const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Saving…';
 try{const data={};for(const f of defs[table].fields){const el=form.elements[f.key];if(!el)continue;let val=f.type==='checkbox'?el.checked:el.value.trim();if(f.type==='number')val=Number(val)||0;if(f.type==='datetime-local'&&val)val=new Date(val).toISOString();if(f.type==='date'&&!val)val=null;data[f.key]=val===''?null:val;}
   for(const f of defs[table].fields.filter(f=>f.type==='image')){const input=form.querySelector(`[data-upload-for="${f.key}"]`);if(input?.files?.length)data[f.key]=await uploadImage(input.files[0]);}
   await save(table,data,editId);$('#record-dialog').close();toast('Record saved successfully.');await render(table);
 }catch(e){toast('Could not save record: '+e.message,true)}finally{btn.disabled=false;btn.textContent='Save Changes'}
}
function openApplication(id){const x=rows.find(r=>String(r.id)===String(id));if(!x)return;editId=x.id;$('#dialog-title').textContent='Review '+(x.kind||'')+' application';$('#record-dialog').dataset.table='applications';
 const details=[['Reference',x.reference],['Full name',x.full_name],['Email',x.email],['Phone',x.phone],['City',x.city],['Institution',x.institution],['Qualification',x.qualification],['Department / topic',x.department],['Semester',x.semester],['Message',x.detail],['Event ID',x.event_id],['Submitted',x.created_at]].filter(x=>x[1]!=null&&String(x[1])!=='');
 $('#dialog-fields').innerHTML=`<div class="form-field wide"><div class="table-wrap"><table><tbody>${details.map(([key,val])=>`<tr><th>${esc(key)}</th><td style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(val)}</td></tr>`).join('')}</tbody></table></div></div><div class="form-field wide"><label for="f-status">Application status</label><select id="f-status" name="status"><option value="pending" ${x.status==='pending'?'selected':''}>Pending</option><option value="approved" ${x.status==='approved'?'selected':''}>Approved</option><option value="declined" ${x.status==='declined'?'selected':''}>Declined</option></select></div>`;
 $('#record-dialog').showModal();}
async function renderSettings(){const items=await all('site_settings'),map=Object.fromEntries(items.map(i=>[i.key,i.value]));
 $('#admin-content').innerHTML=`<section class="admin-panel"><div class="admin-note">These fields control selected public text and contact details. Do not enter passwords, private credentials or sensitive data here.</div><form id="settings-form"><div class="settings-grid mt-4">${settings.map(x=>`<div class="form-field ${x.wide?'wide':''}"><label for="s-${esc(x.key)}">${esc(x.label)}</label>${x.wide?`<textarea id="s-${esc(x.key)}" name="${esc(x.key)}">${esc(map[x.key]||'')}</textarea>`:`<input id="s-${esc(x.key)}" name="${esc(x.key)}" value="${esc(map[x.key]||'')}">`}</div>`).join('')}</div><button class="btn btn-primary settings-save" type="submit">Save Website Settings</button></form></section>`;
 $('#settings-form').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button[type=submit]');btn.disabled=true;try{const data=new FormData(e.target);const records=settings.map(s=>({key:s.key,value:String(data.get(s.key)||'')}));await saveSettings(records);toast('Website settings saved. Reload the public site to see changes.')}catch(err){toast(err.message,true)}finally{btn.disabled=false}})
}
function csvValue(x){let s=String(x??'');if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function exportCsv(){if(!rows.length){toast('No records to export.',true);return}const keys=Object.keys(rows[0]);const text=[keys.join(','),...rows.map(x=>keys.map(k=>csvValue(x[k]&&typeof x[k]==='object'?JSON.stringify(x[k]):x[k])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='nes-'+current+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function delegate(){document.addEventListener('click',async e=>{
 const go=e.target.closest('[data-go]');if(go){await render(go.dataset.go);return}
 const create=e.target.closest('[data-new]');if(create){await render(create.dataset.new);openEditor(current);return}
 const edit=e.target.closest('[data-edit]');if(edit){openEditor(current,edit.dataset.edit);return}
 const detail=e.target.closest('[data-detail]');if(detail){openApplication(detail.dataset.detail);return}
 const del=e.target.closest('[data-delete]');if(del){const row=rows.find(r=>String(r.id)===String(del.dataset.delete));if(!confirm('Permanently delete '+(row?.title||row?.name||'this record')+'?'))return;try{await remove(current,del.dataset.delete);toast('Record deleted.');await render(current)}catch(err){toast(err.message,true)}return}
 });
 $('#admin-content').addEventListener('input',e=>{if(e.target.id==='admin-search'){filterText=e.target.value;paintTable(current)}else if(e.target.id==='admin-status'){statusFilter=e.target.value;paintTable(current)}});
 $$('.sidebar-link[data-view]').forEach(b=>b.addEventListener('click',()=>render(b.dataset.view)));
 $('#new-btn').addEventListener('click',()=>openEditor(current));$('#export-btn').addEventListener('click',exportCsv);
 $('#record-form').addEventListener('submit',async e=>{if($('#record-dialog').dataset.table==='applications'){e.preventDefault();try{const status=$('#f-status').value;await save('applications',{status},editId);$('#record-dialog').close();toast('Application status updated.');await render('applications')}catch(er){toast(er.message,true)}}else await recordSubmit(e)});
 $('#dialog-close').addEventListener('click',()=>$('#record-dialog').close());$('#dialog-cancel').addEventListener('click',()=>$('#record-dialog').close());
 $('#logout-btn').addEventListener('click',()=>{session=null;preview=false;sessionStorage.removeItem('nes_admin_session');hideApp()});
 $('#sidebar-toggle').addEventListener('click',()=>{const o=!$('#admin-sidebar').classList.contains('open');$('#admin-sidebar').classList.toggle('open',o);$('#sidebar-toggle').setAttribute('aria-expanded',String(o))});
}
async function init(){delegate();if(!online){$('#login-form').classList.add('hidden');$('#setup-warning').classList.remove('hidden');$('#preview-login').classList.remove('hidden');$('#preview-login').addEventListener('click',()=>{preview=true;seedPreview();$('#admin-user').textContent='Local preview';showApp()})}
 else{$('#login-form').addEventListener('submit',async e=>{e.preventDefault();$('#login-error').textContent='';const btn=e.target.querySelector('button[type=submit]');btn.disabled=true;try{await signIn($('#admin-email').value,$('#admin-password').value);showApp()}catch(err){$('#login-error').textContent=err.message;session=null;sessionStorage.removeItem('nes_admin_session')}finally{btn.disabled=false}});
 try{const raw=sessionStorage.getItem('nes_admin_session');if(raw){session=JSON.parse(raw);await authorize();showApp()}}catch{sessionStorage.removeItem('nes_admin_session');session=null}
 }
}
document.addEventListener('DOMContentLoaded',init);
})();
