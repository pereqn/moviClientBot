// MOVI Client Auth + Form — регистрация один раз, затем авто-вход; Telegram-ready; fallback: localStorage
(function(){
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const wait = (ms)=> new Promise(res=>setTimeout(res, ms));

  // --- Telegram Mini App bootstrap ---
  let tgUser = null;
  try{
    if(window.Telegram && Telegram.WebApp){
      Telegram.WebApp.ready();
      Telegram.WebApp.expand();
      tgUser = Telegram.WebApp.initDataUnsafe?.user || null;
    }
  }catch(e){}

  // Views
  const viewRegister = $('#view-register');
  const viewForm     = $('#view-form');
  const titleEl      = document.querySelector('.title');

  // Local session helpers
  const LS_KEY = 'movi_client';
  function getSession(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); }catch(e){ return null; }
  }
  function setSession(obj){
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  }
  function clearSession(){
    localStorage.removeItem(LS_KEY);
  }

  // Determine first-time vs returning
  function isSameUser(sess){
    if(!sess) return false;
    if(!tgUser) return !!sess; // if not in Telegram, treat as same device session
    return String(sess.tg_id||'') === String(tgUser.id||'');
  }

  function showRegister(){
    viewRegister.classList.add('active');
    viewForm.classList.remove('active');
    titleEl.textContent = 'Регистрация';
  }
  function showForm(){
    viewForm.classList.add('active');
    viewRegister.classList.remove('active');
    titleEl.textContent = 'Создание заявки';
  }

  const sess = getSession();
  if(sess && isSameUser(sess)){
    showForm();
    // Prefill from session
    $('#name').value  = sess.name || '';
    $('#phone').value = sess.phone || '+7';
    $('#city').value  = sess.city || 'Калининград';
    $('#company').value = sess.company || '';
  }else{
    showRegister();
    // Prefill register from Telegram name if available
    if(tgUser){
      const fullname = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim();
      if(fullname) $('#r_name').value = fullname;
    }
  }

  // --- Phone inputs: +7 + 10 digits (register & form) ---
  function hookPhoneInput(input){
    function sanitize(){
      let v = input.value || '';
      if(!v.startsWith('+7')) v = '+7' + v.replace(/\D/g,'');
      let rest = v.slice(2).replace(/\D/g,'');
      rest = rest.slice(0,10);
      input.value = '+7' + rest;
    }
    input.addEventListener('input', sanitize);
    input.addEventListener('focus', ()=>{
      if(!input.value || !input.value.startsWith('+7')) input.value = '+7';
      requestAnimationFrame(()=> input.setSelectionRange(input.value.length, input.value.length));
    });
    input.addEventListener('keydown', (e)=>{
      const start = input.selectionStart ?? 0;
      if((e.key === 'Backspace' || e.key === 'Delete') && start <= 2){
        e.preventDefault();
        requestAnimationFrame(()=> input.setSelectionRange(input.value.length, input.value.length));
      }
    });
  }
  hookPhoneInput($('#r_phone'));
  hookPhoneInput($('#phone'));

  // --- Chips (delivery type) ---
  const chipBar = $$('.chips')[0];
  const hiddenType = $('#type');
  chipBar?.addEventListener('click',(e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    $$('.chip', chipBar).forEach(x=>{
      x.classList.toggle('active', x===b);
      x.setAttribute('aria-selected', x===b ? 'true' : 'false');
    });
    hiddenType.value = b.dataset.type;
  });

  // --- Dates default ---
  const todayISO = () => new Date().toISOString().slice(0,10);
  const dateInp = $('#date');
  if(dateInp) dateInp.value = todayISO();

  // --- Button animation (reuse order button sequence) ---
  async function runButtonSequence(btn,labelTextDone='Готово!'){
    if(btn.classList.contains('running')) return;
    const label = btn.querySelector('.label');
    btn.disabled = true;
    btn.classList.add('running');
    label.textContent = 'Создаём...';

    btn.classList.add('stage-pkg'); await wait(120);
    btn.classList.add('stage-pkg-load'); await wait(450);
    btn.classList.add('stage-doors'); await wait(380);
    btn.classList.add('stage-drive');
    const w = btn.clientWidth;
    const distance1 = Math.min(220, Math.max(120, Math.round(w * 0.38)));
    btn.style.setProperty('--tx', distance1 + 'px'); await wait(760);
    btn.style.setProperty('--tx', '0px'); await wait(720);
    const distanceExit = Math.min(360, Math.max(200, Math.round(w * 0.70)));
    btn.style.setProperty('--tx', distanceExit + 'px'); await wait(760);

    btn.classList.remove('running','stage-pkg','stage-pkg-load','stage-doors','stage-drive');
    btn.classList.add('finished');
    btn.style.setProperty('--tx', '0px');
    btn.querySelector('.label').textContent = labelTextDone;
    await wait(1200);
    btn.classList.remove('finished');
    btn.querySelector('.label').textContent = (btn.id==='submitBtn' ? 'Создать заявку' : 'Зарегистрироваться');
    btn.disabled = false;
  }

  // --- Optional Supabase save (REST) ---
  async function saveClientToSupabase(payload){
    const cfg = (window.MOVI_CONFIG || {});
    if(!cfg.supabaseUrl || !cfg.supabaseKey) return { ok:false, skipped:true };
    try{
      const url = cfg.supabaseUrl.replace(/\/+$/,'') + '/rest/v1/' + (cfg.tableClients || 'clients');
      const res = await fetch(url, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey': cfg.supabaseKey,
          'Authorization': 'Bearer ' + cfg.supabaseKey,
          'Prefer':'return=representation'
        },
        body: JSON.stringify(payload)
      });
      if(!res.ok) throw new Error('Supabase error ' + res.status);
      const json = await res.json();
      return { ok:true, data:json };
    }catch(err){
      console.warn('Supabase save error:', err);
      return { ok:false, error:String(err) };
    }
  }

  // --- Register flow ---
  const registerForm = $('#registerForm');
  const btnRegister  = $('#btnRegister');
  registerForm.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const name  = $('#r_name').value.trim();
    const phone = $('#r_phone').value.trim();
    const city  = $('#r_city').value.trim() || 'Калининград';
    const company = $('#r_company').value.trim();

    // Basic checks
    const validPhone = /^\+7\d{10}$/.test(phone);
    if(!name || !validPhone){
      // simple visual nudge
      if(!name) $('#r_name').focus();
      else $('#r_phone').focus();
      return;
    }

    // Run button animation (visual feedback)
    await runButtonSequence(btnRegister, 'Готово!');

    // Save local session
    const sess = {
      tg_id: tgUser?.id || null,
      name, phone, city, company,
      created_at: new Date().toISOString()
    };
    setSession(sess);

    // Try save to Supabase (optional)
    await saveClientToSupabase({
      tg_id: sess.tg_id, name: sess.name, phone: sess.phone, city: sess.city, company: sess.company
    });

    // Switch to form and prefill
    $('#name').value  = sess.name;
    $('#phone').value = sess.phone;
    $('#city').value  = sess.city;
    $('#company').value = sess.company;
    showForm();
    try{ window.scrollTo({ top:0, behavior:'smooth' }); }catch(_){ window.scrollTo(0,0); }
  }, {passive:false});

  // --- Order form (same animation + reset flow) ---
  const form  = $('#orderForm');
  const btnSubmit = $('#submitBtn');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    await runButtonSequence(btnSubmit, 'Заявка создана! ✓');
    // Reset & defaults
    form.reset();
    $('#date').value = todayISO();
    $('#phone').value = (getSession()?.phone || '+7');
    $('#city').value  = (getSession()?.city || 'Калининград');
    $('#company').value = (getSession()?.company || '');
    const chipBar = $$('.chips')[0];
    const hiddenType = $('#type');
    hiddenType.value = 'мебель';
    $$('.chip', chipBar).forEach(x=>{
      const on = x.dataset.type === 'мебель';
      x.classList.toggle('active', on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('#elevator').checked = false;
    $('#gate').checked = false;
    $('#assembly').checked = false;
    try{ window.scrollTo({ top:0, behavior:'smooth' }); }catch(_){ window.scrollTo(0,0); }
  }, {passive:false});

})();