// MOVI Client Form logic
(function(){
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>[...r.querySelectorAll(s)];

  // Telegram Mini App safe ready (optional)
  try{ if(window.Telegram && Telegram.WebApp) Telegram.WebApp.ready(); }catch(e){}

  // Init date default today
  const todayISO = () => new Date().toISOString().slice(0,10);
  $('#date').value = todayISO();

  // Chips -> hidden input
  const chipBar = $('.chips');
  const hiddenType = $('#type');
  chipBar?.addEventListener('click', (e)=>{
    const b = e.target.closest('.chip'); if(!b) return;
    $$('.chip', chipBar).forEach(x=>{ x.classList.toggle('active', x===b); x.setAttribute('aria-selected', x===b?'true':'false'); });
    hiddenType.value = b.dataset.type;
  });

  // RU phone mask +7 (___) ___-__-__
  function formatPhoneRU(raw){
    let d = (raw||'').replace(/\D/g,'');
    if(d.startsWith('8')) d = '7' + d.slice(1);
    if(!d.startsWith('7')) d = '7' + d;
    d = d.slice(0,11);
    const p = ['+7'];
    if(d.length>1){ p.push(' (', d.slice(1,4)); if(d.length>=4) p.push(') '); }
    if(d.length>=7){ p.push(d.slice(4,7), '-', d.slice(7,9)); if(d.length>=11) p.push('-', d.slice(9,11)); }
    else if(d.length>4){ p.push(d.slice(4)); }
    return p.join('');
  }
  const phone = $('#phone');
  phone.addEventListener('input', ()=>{
    const pos = phone.selectionStart;
    phone.value = formatPhoneRU(phone.value);
    requestAnimationFrame(()=> phone.setSelectionRange(phone.value.length, phone.value.length));
  });

  // Submit button with truck animation
  const form = $('#orderForm');
  const btn = $('#submitBtn');
  const label = btn.querySelector('.label');
  const truck = btn.querySelector('.truck');

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(btn.classList.contains('loading') || btn.classList.contains('done')) return;
    btn.disabled = true;
    btn.classList.add('loading');
    label.textContent = 'Создаём...';

    const onEnd = ()=>{
      truck.removeEventListener('animationend', onEnd);
      btn.classList.remove('loading');
      btn.classList.add('done');
      label.textContent = 'Заявка создана!';
      // Reset for demo after 2.2s
      setTimeout(()=>{
        btn.classList.remove('done');
        label.textContent = 'Создать заявку';
        btn.disabled = false;
      }, 2200);
    };
    truck.addEventListener('animationend', onEnd);
  }, {passive:false});
})();