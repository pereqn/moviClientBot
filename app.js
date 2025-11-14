// MOVI Client v6 — Choice -> Personal/Company registration -> Order form (persisted + sendData to Telegram)
(function(){
  const $  = (s,r=document)=>r.querySelector(s),
        $$ = (s,r=document)=>[...r.querySelectorAll(s)],
        wait = (ms)=>new Promise(res=>setTimeout(res,ms));

  // ==== Telegram WebApp ====
  let tg = null, tgUser = null;
  try {
    if (window.Telegram && Telegram.WebApp) {
      tg = Telegram.WebApp;
      tg.ready();
      tg.expand();
      tgUser = tg.initDataUnsafe?.user || null;
    }
  } catch (e) {
    console.log('Telegram WebApp not available', e);
  }

  const STORAGE_KEY = 'movi:user:v1',
        todayISO    = () => new Date().toISOString().slice(0,10);

  const getSaved = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
    catch(e){ return null; }
  };
  const saveUser  = u => localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  const clearUser = () => localStorage.removeItem(STORAGE_KEY);

  // Screens
  const choiceScreen = $('#choiceScreen');
  const authPersonal = $('#authPersonal');
  const authCompany  = $('#authCompany');
  const orderScreen  = $('#orderScreen');
  const topTitle     = $('#topTitle');
  const logoutBtn    = $('#logoutBtn');

  function hideAll(){
    [choiceScreen, authPersonal, authCompany, orderScreen].forEach(x=>x.classList.remove('active'));
  }

  function showChoice(){
    hideAll();
    choiceScreen.classList.add('active');
    topTitle.textContent='Регистрация';
    logoutBtn.hidden = true;
  }

  function showAuthPersonal(){
    hideAll();
    authPersonal.classList.add('active');
    topTitle.textContent='Регистрация';
    logoutBtn.hidden = true;
  }

  function showAuthCompany(){
    hideAll();
    authCompany.classList.add('active');
    topTitle.textContent='Регистрация компании';
    logoutBtn.hidden = true;
  }

  function showOrder(){
    hideAll();
    orderScreen.classList.add('active');
    topTitle.textContent='Создание заявки';
    logoutBtn.hidden = false;

    const u = getSaved() || {};

    $('#name').value  = (u.type==='company'
      ? (u.company?.contact || u.name || '')
      : (u.name || '')
    );
    $('#phone').value = u.phone || '+7';
    $('#city').value  = u.city  || 'Калининград';

    if (u.type === 'company') {
      $('#company').value = u.company?.name || '';
      $('#contact').value = u.company?.contact || '';
    }

    $('#date').value  = todayISO();
  }

  // ==== Старт ====
  const saved = getSaved();
  if(saved){
    showOrder();
  } else {
    if(tgUser){
      const fullName = (tgUser.first_name || '') + (tgUser.last_name ? ' ' + tgUser.last_name : '');
      $('#pName').value    = fullName;
      $('#cContact').value = fullName;
    }
    showChoice();
  }

  // ==== Кнопки выбора ====
  $('#choosePersonal').addEventListener('click', showAuthPersonal);
  $('#chooseCompany').addEventListener('click', showAuthCompany);
  $$('.backChoice').forEach(b=> b.addEventListener('click', showChoice));

  // ==== Нормализация телефона (+7 + 10 цифр) ====
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

  // ==== Logout ====
  logoutBtn.addEventListener('click', ()=>{
    clearUser();
    showChoice();
  });

  // ==== Регистрация: частное лицо ====
  $('#authFormPersonal').addEventListener('submit', (e)=>{
    e.preventDefault();
    const user = {
      uid:   tgUser?.id || null,
      type:  'personal',
      name:  $('#pName').value.trim(),
      phone: $('#pPhone').value.trim(),
      city:  $('#pCity').value.trim() || 'Калининград',
      tg: tgUser ? {
        id: tgUser.id,
        username:   tgUser.username   || null,
        first_name: tgUser.first_name || null,
        last_name:  tgUser.last_name  || null
      } : null,
      ts: Date.now()
    };
    if(!/^\+7\d{10}$/.test(user.phone)) return alert('Введите телефон в формате +7XXXXXXXXXX');
    if(!user.name) return alert('Введите имя');
    saveUser(user);
    showOrder();
  }, {passive:false});

  // ==== Регистрация: компания ====
  $('#authFormCompany').addEventListener('submit', (e)=>{
    e.preventDefault();
    const user = {
      uid:   tgUser?.id || null,
      type:  'company',
      name:  $('#cContact').value.trim(),
      phone: $('#cPhone').value.trim(),
      city:  $('#cCity').value.trim() || 'Калининград',
      company: {
        name:    $('#cCompany').value.trim(),
        contact: $('#cContact').value.trim()
      },
      tg: tgUser ? {
        id: tgUser.id,
        username:   tgUser.username   || null,
        first_name: tgUser.first_name || null,
        last_name:  tgUser.last_name  || null
      } : null,
      ts: Date.now()
    };
    if(!/^\+7\d{10}$/.test(user.phone)) return alert('Введите телефон в формате +7XXXXXXXXXX');
    if(!user.company.name)    return alert('Введите название компании');
    if(!user.company.contact) return alert('Введите контактное лицо');
    saveUser(user);
    showOrder();
  }, {passive:false});

  // ===== Логика экрана заявки =====
  const chipBar    = $('.chips');
  const hiddenType = $('#type');

  chipBar?.addEventListener('click',e=>{
    const b=e.target.closest('.chip'); if(!b) return;
    $$('.chip', chipBar).forEach(x=>{
      x.classList.toggle('active',x===b);
      x.setAttribute('aria-selected',x===b?'true':'false');
    });
    hiddenType.value=b.dataset.type;
  });

  const phone = $('#phone');
  attachPhoneSanitizer(phone);

  const form = $('#orderForm');
  const btn  = $('#submitBtn');

  async function runSeq(){
    if(btn.classList.contains('active')) return;
    btn.classList.add('active');
    await wait(5500);
    btn.classList.remove('active');
  }

  // === SUBMIT ORDER: отправка заявки в Telegram бота ===
  form.addEventListener('submit', async e=>{
    e.preventDefault();

    const u = getSaved() || {};

    // Адрес
    const street = $('#street').value.trim();
    const house  = $('#house').value.trim();
    const apt    = $('#apt').value.trim();
    const floor  = $('#floor').value.trim();

    let address = street;
    if (house) address += ', дом ' + house;
    if (apt)   address += ', кв. ' + apt;
    if (floor) address += ', этаж ' + floor;

    // Флаги
    const gate     = $('#gate').checked;
    const assembly = $('#assembly').checked;
    const elevator = $('#elevator').checked;

    const flags = [];
    if (gate)     flags.push('есть шлагбаум');
    if (assembly) flags.push('нужна сборка');
    if (elevator) flags.push('лифт есть');

    // Базовый комментарий
    const baseComment = $('#comment').value.trim();
    const company     = $('#company').value.trim();
    const contact     = $('#contact').value.trim();

    let comment = baseComment;
    if (company || contact) {
      comment += (comment ? ' | ' : '') + `Компания: ${company || '-'}, контакт: ${contact || '-'}`;
    }
    if (flags.length) {
      comment += (comment ? ' | ' : '') + 'Опции: ' + flags.join(', ');
    }

    const payload = {
      name:  $('#name').value.trim(),
      phone: $('#phone').value.trim(),
      city:  $('#city').value.trim() || 'Калининград',
      address: address,
      delivery_type: $('#type').value, // "мебель" / "техника"
      date: $('#date').value,
      time_from: $('#time').value,     // одно поле времени
      time_to: null,
      comment: comment
    };

    // Простая проверка
    if (!payload.name || !payload.phone || !payload.city || !street || !house || !payload.date || !payload.time_from) {
      alert('Заполни, пожалуйста, все обязательные поля (имя, телефон, адрес, дата и время).');
      return;
    }

    // Отправляем в Telegram бота
    try {
      if (tg && typeof tg.sendData === 'function') {
        tg.sendData(JSON.stringify(payload));
      } else {
        console.log('TG payload (no WebApp):', payload);
        alert('WebApp открыт не в Telegram, данные заявки просто выведены в консоль.');
      }
    } catch (err) {
      console.error('sendData error', err);
      alert('Ошибка при отправке заявки в Telegram.');
    }

    // Анимация + сброс формы как раньше
    await runSeq();

    form.reset();
    $('#date').value = todayISO();

    $('#name').value  = (u.type==='company'
      ? (u.company?.contact || u.name || '')
      : (u.name || '')
    );
    $('#phone').value = u.phone || '+7';
    $('#city').value  = u.city  || 'Калининград';

    if (u.type === 'company') {
      $('#company').value = u.company?.name || '';
      $('#contact').value = u.company?.contact || '';
    }

    $('#type').value='мебель';
    $$('.chip', chipBar).forEach(x=>{
      const on = x.dataset.type === 'мебель';
      x.classList.toggle('active', on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    try{
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(e2){
      window.scrollTo(0,0);
    }
  }, {passive:false});
})();
