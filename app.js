// MOVI Client — Auth (localStorage) + Order + Truck Animation
(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)], wait=(ms)=>new Promise(res=>setTimeout(res,ms));
  // Telegram MiniApp support (optional)
  let tgUser=null;try{if(window.Telegram&&Telegram.WebApp){Telegram.WebApp.ready();tgUser=Telegram.WebApp.initDataUnsafe?.user||null}}catch(e){}

  const STORAGE_KEY='movi:user:v1', todayISO=()=>new Date().toISOString().slice(0,10);
  const getSaved=()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch(e){return null}};
  const saveUser=u=>localStorage.setItem(STORAGE_KEY,JSON.stringify(u));
  const logout=()=>{localStorage.removeItem(STORAGE_KEY);showAuth()};

  // Screens
  const authScreen=$('#authScreen'), orderScreen=$('#orderScreen'), topTitle=$('#topTitle'), logoutBtn=$('#logoutBtn');

  function showAuth(){authScreen.classList.add('active');orderScreen.classList.remove('active');topTitle.textContent='Регистрация';logoutBtn.hidden=true}
  function showOrder(){
    authScreen.classList.remove('active');orderScreen.classList.add('active');topTitle.textContent='Создание заявки';logoutBtn.hidden=false;
    const u=getSaved();
    $('#name').value=u?.name||''; $('#phone').value=u?.phone||'+7'; $('#city').value=u?.city||'Калининград';
    $('#date').value=todayISO();
  }

  const saved=getSaved();
  if(saved){ showOrder(); }else{ if(tgUser){$('#regName').value=(tgUser.first_name||'')+(tgUser.last_name?' '+tgUser.last_name:'')} showAuth(); }

  // Auth form
  const regPhone=$('#regPhone'), authForm=$('#authForm');
  const sanitizePhone=(inp)=>{let v=inp.value||''; if(!v.startsWith('+7')) v='+7'+v.replace(/\D/g,''); let rest=v.slice(2).replace(/\D/g,'').slice(0,10); inp.value='+7'+rest;};
  regPhone.addEventListener('input',()=>sanitizePhone(regPhone));
  regPhone.addEventListener('focus',()=>{if(!regPhone.value.startsWith('+7')) regPhone.value='+7';requestAnimationFrame(()=>regPhone.setSelectionRange(regPhone.value.length,regPhone.value.length))});
  regPhone.addEventListener('keydown',e=>{const s=regPhone.selectionStart??0;if((e.key==='Backspace'||e.key==='Delete')&&s<=2){e.preventDefault();requestAnimationFrame(()=>regPhone.setSelectionRange(regPhone.value.length,regPhone.value.length))}});
  authForm.addEventListener('submit',e=>{
    e.preventDefault();
    const user={ uid:tgUser?.id||null, name:$('#regName').value.trim(), phone:$('#regPhone').value.trim(), city:$('#regCity').value.trim()||'Калининград',
      tg:tgUser?{id:tgUser.id,username:tgUser.username||null,first_name:tgUser.first_name||null,last_name:tgUser.last_name||null}:null, ts:Date.now() };
    if(!/^\+7\d{10}$/.test(user.phone)) return alert('Введите телефон в формате +7XXXXXXXXXX');
    if(!user.name) return alert('Введите имя');
    saveUser(user); showOrder();
  }, {passive:false});
  logoutBtn.addEventListener('click',logout);

  // Order: chips
  const chipBar=$('.chips'), hiddenType=$('#type');
  chipBar?.addEventListener('click',e=>{
    const b=e.target.closest('.chip'); if(!b) return;
    $$('.chip', chipBar).forEach(x=>{ x.classList.toggle('active',x===b); x.setAttribute('aria-selected',x===b?'true':'false'); });
    hiddenType.value=b.dataset.type;
  });

  // Order: phone (+7 + 10 digits, no masks)
  const phone=$('#phone');
  const sanitizeOrderPhone=()=>{let v=phone.value||'';if(!v.startsWith('+7')) v='+7'+v.replace(/\D/g,''); let rest=v.slice(2).replace(/\D/g,'').slice(0,10); phone.value='+7'+rest;};
  phone.addEventListener('input',sanitizeOrderPhone);
  phone.addEventListener('focus',()=>{if(!phone.value.startsWith('+7')) phone.value='+7';requestAnimationFrame(()=>phone.setSelectionRange(phone.value.length,phone.value.length))});
  phone.addEventListener('keydown',e=>{const s=phone.selectionStart??0;if((e.key==='Backspace'||e.key==='Delete')&&s<=2){e.preventDefault();requestAnimationFrame(()=>phone.setSelectionRange(phone.value.length,phone.value.length))}});

  // Truck button animation + reset + scroll
  const form=$('#orderForm'), btn=$('#submitBtn'), label=btn.querySelector('.label');
  async function runSeq(){
    if(btn.classList.contains('running')) return;
    btn.disabled=true; btn.classList.add('running'); label.textContent='Создаём...';
    btn.classList.add('stage-pkg'); await wait(120);
    btn.classList.add('stage-pkg-load'); await wait(450);
    btn.classList.add('stage-doors'); await wait(380);
    btn.classList.add('stage-drive');
    const w=btn.clientWidth, d1=Math.min(220,Math.max(120,Math.round(w*0.38)));
    btn.style.setProperty('--tx', d1+'px'); await wait(760);
    btn.style.setProperty('--tx','0px'); await wait(720);
    const d2=Math.min(360,Math.max(200,Math.round(w*0.70))); btn.style.setProperty('--tx', d2+'px'); await wait(760);
    btn.classList.remove('running','stage-pkg','stage-pkg-load','stage-doors','stage-drive'); btn.classList.add('finished'); btn.style.setProperty('--tx','0px');
    label.textContent='Заявка создана! ✓'; await wait(2200);
    btn.classList.remove('finished'); label.textContent='Создать заявку'; btn.disabled=false;
  }
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    await runSeq();
    const saved=getSaved();
    form.reset();
    $('#date').value=todayISO();
    $('#phone').value=saved?.phone||'+7';
    $('#name').value=saved?.name||'';
    $('#city').value=saved?.city||'Калининград';
    $('#type').value='мебель';
    $$('.chip', chipBar).forEach(x=>{ const on=x.dataset.type==='мебель'; x.classList.toggle('active',on); x.setAttribute('aria-selected',on?'true':'false'); });
    try{ window.scrollTo({top:0,behavior:'smooth'}); }catch(e){ window.scrollTo(0,0); }
  }, {passive:false});
})();