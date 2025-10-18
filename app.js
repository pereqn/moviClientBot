// MOVI Client v6 — Choice -> Personal/Company registration -> Order form (persisted)
(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)], wait=(ms)=>new Promise(res=>setTimeout(res,ms));
  let tgUser=null; try{ if(window.Telegram&&Telegram.WebApp){ Telegram.WebApp.ready(); tgUser=Telegram.WebApp.initDataUnsafe?.user||null; } }catch(e){}
  const STORAGE_KEY='movi:user:v1', todayISO=()=>new Date().toISOString().slice(0,10);
  const getSaved=()=>{ try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); }catch(e){ return null; } };
  const saveUser=u=>localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  const clearUser=()=>localStorage.removeItem(STORAGE_KEY);

  // Screens
  const choiceScreen = $('#choiceScreen');
  const authPersonal = $('#authPersonal');
  const authCompany  = $('#authCompany');
  const orderScreen  = $('#orderScreen');
  const topTitle     = $('#topTitle');
  const logoutBtn    = $('#logoutBtn');

  function showChoice(){ hideAll(); choiceScreen.classList.add('active'); topTitle.textContent='Регистрация'; logoutBtn.hidden = true; }
  function showAuthPersonal(){ hideAll(); authPersonal.classList.add('active'); topTitle.textContent='Регистрация'; logoutBtn.hidden = true; }
  function showAuthCompany(){ hideAll(); authCompany.classList.add('active'); topTitle.textContent='Регистрация компании'; logoutBtn.hidden = true; }
  function showOrder(){
    hideAll(); orderScreen.classList.add('active'); topTitle.textContent='Создание заявки'; logoutBtn.hidden = false;
    const u = getSaved() || {};
    // Prefill generic
    $('#name').value  = (u.type==='company' ? (u.company?.contact||u.name||'') : (u.name||''));
    $('#phone').value = u.phone || '+7';
    $('#city').value  = u.city  || 'Калининград';
    // If company, prefill company fields too
    if(u.type==='company'){
      $('#company').value = u.company?.name || '';
      $('#contact').value = u.company?.contact || '';
    }
    $('#date').value  = todayISO();
  }
  function hideAll(){ [choiceScreen, authPersonal, authCompany, orderScreen].forEach(x=>x.classList.remove('active')); }

  // Start
  const saved = getSaved();
  if(saved){ showOrder(); } else {
    if(tgUser){ $('#pName').value = (tgUser.first_name||'') + (tgUser.last_name ? ' '+tgUser.last_name : ''); $('#cContact').value = $('#pName').value; }
    showChoice();
  }

  // Choice buttons
  $('#choosePersonal').addEventListener('click', showAuthPersonal);
  $('#chooseCompany').addEventListener('click', showAuthCompany);
  $$('.backChoice').forEach(b=> b.addEventListener('click', showChoice));

  // Phone sanitizers (+7 + 10 digits)
  function attachPhoneSanitizer(input){
    input.addEventListener('input', ()=>{
      let v = input.value || '';
      if(!v.startsWith('+7')) v = '+7' + v.replace(/\D/g,'');
      let rest = v.slice(2).replace(/\D/g,'').slice(0,10);
      input.value = '+7' + rest;
    });
    input.addEventListener('focus', ()=>{
      if(!input.value.startsWith('+7')) input.value = '+7';
      requestAnimationFrame(()=> input.setSelectionRange(input.value.length, input.value.length));
    });
    input.addEventListener('keydown', (e)=>{
      const start = input.selectionStart ?? 0;
      if((e.key==='Backspace' || e.key==='Delete') && start <= 2){
        e.preventDefault();
        requestAnimationFrame(()=> input.setSelectionRange(input.value.length, input.value.length));
      }
    });
  }
  attachPhoneSanitizer($('#pPhone'));
  attachPhoneSanitizer($('#cPhone'));

  // Logout
  logoutBtn.addEventListener('click', ()=>{ clearUser(); showChoice(); });

  // Register Personal
  $('#authFormPersonal').addEventListener('submit', (e)=>{
    e.preventDefault();
    const user = {
      uid: tgUser?.id || null,
      type: 'personal',
      name:  $('#pName').value.trim(),
      phone: $('#pPhone').value.trim(),
      city:  $('#pCity').value.trim() || 'Калининград',
      tg: tgUser ? { id: tgUser.id, username: tgUser.username||null, first_name: tgUser.first_name||null, last_name: tgUser.last_name||null } : null,
      ts: Date.now()
    };
    if(!/^\+7\d{10}$/.test(user.phone)) return alert('Введите телефон в формате +7XXXXXXXXXX');
    if(!user.name) return alert('Введите имя');
    saveUser(user); showOrder();
  }, {passive:false});

  // Register Company
  $('#authFormCompany').addEventListener('submit', (e)=>{
    e.preventDefault();
    const user = {
      uid: tgUser?.id || null,
      type: 'company',
      name:  $('#cContact').value.trim(), // будем использовать в поле Имя по умолчанию
      phone: $('#cPhone').value.trim(),
      city:  $('#cCity').value.trim() || 'Калининград',
      company: { name: $('#cCompany').value.trim(), contact: $('#cContact').value.trim() },
      tg: tgUser ? { id: tgUser.id, username: tgUser.username||null, first_name: tgUser.first_name||null, last_name: tgUser.last_name||null } : null,
      ts: Date.now()
    };
    if(!/^\+7\d{10}$/.test(user.phone)) return alert('Введите телефон в формате +7XXXXXXXXXX');
    if(!user.company.name) return alert('Введите название компании');
    if(!user.company.contact) return alert('Введите контактное лицо');
    saveUser(user); showOrder();
  }, {passive:false});

  // ===== Order screen logic (same animation as before) =====
  const chipBar=$('.chips'), hiddenType=$('#type');
  chipBar?.addEventListener('click',e=>{
    const b=e.target.closest('.chip'); if(!b) return;
    $$('.chip', chipBar).forEach(x=>{ x.classList.toggle('active',x===b); x.setAttribute('aria-selected',x===b?'true':'false'); });
    hiddenType.value=b.dataset.type;
  });

  const phone=$('#phone');
  attachPhoneSanitizer(phone);

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
    const u=getSaved()||{};
    form.reset();
    $('#date').value=todayISO();
    $('#name').value = (u.type==='company' ? (u.company?.contact||u.name||'') : (u.name||''));
    $('#phone').value=u.phone||'+7';
    $('#city').value=u.city||'Калининград';
    if(u.type==='company'){ $('#company').value=u.company?.name||''; $('#contact').value=u.company?.contact||''; }
    $('#type').value='мебель';
    $$('.chip', chipBar).forEach(x=>{ const on=x.dataset.type==='мебель'; x.classList.toggle('active',on); x.setAttribute('aria-selected',on?'true':'false'); });
    try{ window.scrollTo({top:0,behavior:'smooth'}) }catch(e){ window.scrollTo(0,0) }
  }, {passive:false});
})();