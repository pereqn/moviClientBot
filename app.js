// MOVI Client Form v3 — поля (город/шлагбаум/сборка/компания), телефон +7XXXX..., 2 типа доставки
(function(){
  const $  = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
  const wait = (ms)=> new Promise(res=>setTimeout(res, ms));

  try{ if(window.Telegram && Telegram.WebApp) Telegram.WebApp.ready(); }catch(e){}

  // Defaults
  const todayISO = () => new Date().toISOString().slice(0,10);
  $('#date').value = todayISO();

  // Chips: only мебель / техника
  const chipBar = $('.chips');
  const hiddenType = $('#type');
  chipBar?.addEventListener('click',(e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    $$('.chip', chipBar).forEach(x=>{
      x.classList.toggle('active', x===b);
      x.setAttribute('aria-selected', x===b ? 'true' : 'false');
    });
    hiddenType.value = b.dataset.type;
  });

  // Phone: always starts with +7; user types only 10 digits after it. No brackets/ dashes.
  const phone = $('#phone');
  function sanitizePhone(){
    let v = phone.value || '';
    // Ensure prefix +7
    if(!v.startsWith('+7')){
      v = '+7' + v.replace(/\D/g,'');
    }
    // strip non-digits after +7
    let rest = v.slice(2).replace(/\D/g,'');
    rest = rest.slice(0,10);
    phone.value = '+7' + rest;
  }
  phone.addEventListener('input', sanitizePhone);
  phone.addEventListener('focus', () => {
    if(!phone.value || !phone.value.startsWith('+7')) phone.value = '+7';
    // put caret at end
    requestAnimationFrame(()=> phone.setSelectionRange(phone.value.length, phone.value.length));
  });
  // Prevent deleting the +7 prefix
  phone.addEventListener('keydown', (e)=>{
    const start = phone.selectionStart ?? 0;
    if((e.key === 'Backspace' || e.key === 'Delete') && start <= 2){
      e.preventDefault();
      // Move caret to end on backspace at prefix
      requestAnimationFrame(()=> phone.setSelectionRange(phone.value.length, phone.value.length));
    }
  });

  // Truck animation (as in v2)
  const form  = $('#orderForm');
  const btn   = $('#submitBtn');
  const label = btn.querySelector('.label');

  async function runSequence(){
    if(btn.classList.contains('running')) return;
    btn.disabled = true;
    btn.classList.add('running');
    label.textContent = 'Создаём...';

    btn.classList.add('stage-pkg');
    await wait(120);
    btn.classList.add('stage-pkg-load');
    await wait(450);
    btn.classList.add('stage-doors');
    await wait(380);
    btn.classList.add('stage-drive');

    const w = btn.clientWidth;
    const distance1 = Math.min(220, Math.max(120, Math.round(w * 0.38)));
    btn.style.setProperty('--tx', distance1 + 'px');
    await wait(760);

    btn.style.setProperty('--tx', '0px');
    await wait(720);

    const distanceExit = Math.min(360, Math.max(200, Math.round(w * 0.70)));
    btn.style.setProperty('--tx', distanceExit + 'px');
    await wait(760);

    btn.classList.remove('running','stage-pkg','stage-pkg-load','stage-doors','stage-drive');
    btn.classList.add('finished');
    btn.style.setProperty('--tx', '0px');
    label.textContent = 'Заявка создана! ✓';
    await wait(2200);
    btn.classList.remove('finished');
    label.textContent = 'Создать заявку';
    btn.disabled = false;
  }

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    await runSequence();

    // Reset form + defaults
    form.reset();
    $('#date').value = todayISO();
    $('#phone').value = '+7';
    hiddenType.value = 'мебель';
    $$('.chip', chipBar).forEach(x=>{
      const on = x.dataset.type === 'мебель';
      x.classList.toggle('active', on);
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('#elevator').checked = false;
    $('#gate').checked = false;
    $('#assembly').checked = false;

    // scroll top
    try{ window.scrollTo({ top: 0, behavior: 'smooth' }); }catch(e){ window.scrollTo(0,0); }
  }, {passive:false});
})();