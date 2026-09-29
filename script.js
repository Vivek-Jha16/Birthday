/* Birthday journey — vanilla JS. Sections: state, canvas fx, hearts, navigation,
   typewriter, gallery/lightbox, music, cursor, easter eggs. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const pick = a => a[Math.floor(Math.random() * a.length)];

  const scenes = $$('.scene'), dots = $$('.dot');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  const light = isTouch || innerWidth < 700;      // lighter effects on phones
  let cur = 0, busy = false, started = false;

  /* ---------- Canvas: twinkling stars, confetti, cursor sparkles ---------- */
  const cv = $('#fx'), cx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W, H;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener('resize', resize); resize();

  const stars = Array.from({ length: light ? 45 : 100 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + .3,
    p: Math.random() * 6.28, s: .01 + Math.random() * .02
  }));
  const colors = ['#ffb8d1', '#d9c2ff', '#f6d98f', '#ffffff', '#c9a0ff'];
  let bits = [];

  function confetti(n = 90, x = W / 2, y = H * .65) {
    if (light) n = Math.round(n * .6);
    for (let i = 0; i < n; i++) bits.push({
      x, y, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 3, g: .28,
      w: Math.random() * 7 + 4, h: Math.random() * 4 + 3, c: pick(colors),
      a: Math.random() * 6, va: (Math.random() - .5) * .3, life: 1, d: .006 + Math.random() * .006
    });
  }
  const sparkle = (x, y) => bits.push({
    x, y, vx: (Math.random() - .5) * 1.2, vy: Math.random() * 1.2 + .3, g: .02,
    w: Math.random() * 3 + 1.5, spark: true, c: pick(colors), life: 1, d: .03
  });

  (function loop() {
    cx.clearRect(0, 0, W, H);
    for (const s of stars) {                       // stars
      s.p += s.s;
      cx.globalAlpha = .25 + .55 * Math.abs(Math.sin(s.p));
      cx.fillStyle = '#fff';
      cx.beginPath(); cx.arc(s.x * W, s.y * H, s.r, 0, 6.28); cx.fill();
    }
    bits = bits.filter(b => b.life > 0 && b.y < H + 20);
    for (const b of bits) {                        // confetti + sparkles
      b.vy += b.g; b.x += b.vx; b.y += b.vy; b.vx *= .99; b.life -= b.d;
      cx.globalAlpha = Math.max(b.life, 0); cx.fillStyle = b.c;
      if (b.spark) { cx.shadowColor = b.c; cx.shadowBlur = 10; cx.beginPath(); cx.arc(b.x, b.y, b.w * b.life, 0, 6.28); cx.fill(); cx.shadowBlur = 0; }
      else { b.a += b.va; cx.save(); cx.translate(b.x, b.y); cx.rotate(b.a); cx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); cx.restore(); }
    }
    cx.globalAlpha = 1;
    requestAnimationFrame(loop);
  })();

  /* ---------- Floating hearts / sparkles (DOM) ---------- */
  function floatHeart() {
    const h = document.createElement('span');
    h.className = 'fh';
    h.textContent = pick(['💖', '💜', '✨', '💗', '🌸', '⭐']);
    h.style.left = Math.random() * 100 + 'vw';
    h.style.fontSize = 14 + Math.random() * 18 + 'px';
    h.style.animationDuration = 7 + Math.random() * 6 + 's';
    document.body.appendChild(h);
    setTimeout(() => h.remove(), 13000);
  }
  setInterval(() => { if (started && !document.hidden) floatHeart(); }, light ? 1500 : 800);

  /* ---------- Typewriter ---------- */
  function typeText(el, delay = 0) {
    const text = el.dataset.type; el.textContent = '';
    clearInterval(el._t);
    setTimeout(() => {
      let i = 0; const chars = [...text];                 // spread keeps emoji intact
      el._t = setInterval(() => {
        el.textContent += chars[i++] || '';
        if (i >= chars.length) clearInterval(el._t);
      }, 42);
    }, delay);
  }

  /* ---------- Navigation between story pages ---------- */
  function go(n) {
    n = Math.max(0, Math.min(scenes.length - 1, n));
    if (busy || n === cur) return;
    busy = true;
    const from = scenes[cur], to = scenes[n];
    from.classList.remove('active'); from.classList.add('leaving');
    to.scrollTop = 0; to.classList.add('active');
    cur = n;
    dots.forEach((d, i) => d.classList.toggle('on', i === n));
    $('#bar').style.width = (n + 1) * 25 + '%';
    setTimeout(() => { from.classList.remove('leaving'); busy = false; }, 900);
    onEnter(n);
  }
  function onEnter(n) {
    if (n === 1) { confetti(70); typeText($('#typed'), 1300); }
    if (n === 3) { [300, 1500, 3300].forEach(t => setTimeout(() => confetti(80, W * Math.random(), H * .7), t)); }
  }
  // Buttons use data-go="1" (next), "-1" (back), "-3" (jump back to start)
  $$('[data-go]').forEach(b => b.addEventListener('click', () => {
    const v = +b.dataset.go; go(v === -3 ? 0 : cur + v);
  }));
  dots.forEach((d, i) => d.addEventListener('click', () => started && go(i)));
  addEventListener('keydown', e => {
    if (!started) return;
    if (e.key === 'ArrowRight') go(cur + 1);
    if (e.key === 'ArrowLeft') go(cur - 1);
    if (e.key === 'Escape') closeLightbox();
  });
  // Swipe left/right between pages (ignored while swiping the photo gallery)
  let sx = 0, sy = 0, inGallery = false;
  addEventListener('touchstart', e => {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; inGallery = !!e.target.closest('.gallery');
  }, { passive: true });
  addEventListener('touchend', e => {
    if (!started || inGallery) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- Music ---------- */
  const bgm = $('#bgm'), playBtn = $('#playBtn'), muteBtn = $('#muteBtn');
  bgm.volume = .6;
  const syncMusic = () => { playBtn.textContent = bgm.paused ? '▶' : '⏸'; muteBtn.textContent = bgm.muted ? '🔇' : '🔊'; };
  playBtn.onclick = () => { bgm.paused ? bgm.play().catch(() => toast('Add audio/birthday.mp3 to hear music 🎵')) : bgm.pause(); syncMusic(); };
  muteBtn.onclick = () => { bgm.muted = !bgm.muted; syncMusic(); };

  /* ---------- Open the surprise ---------- */
  $('#openBtn').addEventListener('click', e => {
    started = true;
    bgm.play().then(syncMusic).catch(() => { playBtn.textContent = '▶'; }); // started by a click, so allowed
    $('#dock').classList.add('show');
    const r = e.currentTarget.getBoundingClientRect();
    confetti(110, r.left + r.width / 2, r.top + r.height / 2);
    for (let i = 0; i < 12; i++) setTimeout(floatHeart, i * 90);
    setTimeout(() => go(1), 450);
  });

  /* ---------- Photo gallery + lightbox ---------- */
  $$('.ph img').forEach(img => {
    const mark = () => img.parentElement.classList.add('missing');
    img.addEventListener('error', mark);
    if (img.complete && !img.naturalWidth) mark();
  });
  const lb = $('#lightbox');
  $$('.polaroid').forEach(p => p.addEventListener('click', () => {
    const img = $('img', p);
    if (p.firstElementChild.classList.contains('missing')) return toast('Put your photo at ' + p.firstElementChild.dataset.file + ' 📸');
    $('#lbImg').src = img.src; $('#lbCap').textContent = p.dataset.cap;
    lb.classList.add('open');
  }));
  function closeLightbox() { lb.classList.remove('open'); }
  $('#closeLb').onclick = closeLightbox;
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

  /* ---------- Toast ---------- */
  let tt;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------- Easter eggs ---------- */
  let taps = 0, tapTimer;
  $('#secret').addEventListener('click', e => {                 // 1: tap the tiny heart 5 times
    taps++; clearTimeout(tapTimer); tapTimer = setTimeout(() => taps = 0, 1500);
    sparkle(e.clientX, e.clientY);
    if (taps >= 5) { taps = 0; toast('Okay okay... you really found the secret 😂❤️'); confetti(60, e.clientX, e.clientY); }
  });
  $('#finalHeart').addEventListener('click', e => {             // 2: tap the glowing heart at the end
    confetti(120, e.clientX, e.clientY);
    for (let i = 0; i < 10; i++) setTimeout(floatHeart, i * 80);
    toast('Love you, sis. Always. 🥹💖');
  });

  /* ---------- Custom cursor (desktop only) ---------- */
  if (!isTouch) {
    document.body.classList.add('has-cursor');
    const dot = $('.cursor-dot'), ring = $('.cursor-ring');
    let mx = W / 2, my = H / 2, rx = mx, ry = my, lastSpark = 0;
    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      if (performance.now() - lastSpark > 45) { sparkle(mx, my); lastSpark = performance.now(); } // glow trail
      // Magnetic pull on buttons
      $$('.magnetic').forEach(b => {
        const r = b.getBoundingClientRect(), cxp = r.left + r.width / 2, cyp = r.top + r.height / 2;
        const dx = mx - cxp, dy = my - cyp, near = Math.hypot(dx, dy) < Math.max(r.width, 120) * .75;
        b.style.setProperty('--mx', near ? dx * .25 + 'px' : '0px');
        b.style.setProperty('--my', near ? dy * .35 + 'px' : '0px');
      });
    });
    (function follow() {                                         // ring eases toward the mouse
      rx += (mx - rx) * .16; ry += (my - ry) * .16;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(follow);
    })();
    document.addEventListener('mouseover', e =>
      ring.classList.toggle('hover', !!e.target.closest('button,.polaroid,.secret-heart,.final-heart')));
  }
})();
