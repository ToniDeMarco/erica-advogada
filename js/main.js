/* ==========================================================================
   Erica Miranda Advocacia e Consultoria — main.js
   Preloader · header · menu mobile · scrollspy · animações de entrada ·
   backgrounds lazy · cursor · links de WhatsApp por assunto · rastreamento
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  const WA_PHONE = '5538999456015';
  const waLink = (text) =>
    `https://api.whatsapp.com/send/?phone=${WA_PHONE}&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;

  /* ---------- Preloader ---------- */
  function initPreloader(onDone) {
    const el = document.getElementById('preloader');
    const pctEl = document.getElementById('preloaderPct');
    if (!el || !pctEl) { onDone(); return; }

    const MIN_TIME = reducedMotion ? 400 : 2200;  // tempo mínimo para o logo ser desenhado
    const MAX_TIME = 8000;                       // nunca prende o visitante além disso
    const start = performance.now();
    let pageLoaded = document.readyState === 'complete';
    let fontsLoaded = !document.fonts;
    let p = 0;

    if (!pageLoaded) window.addEventListener('load', () => { pageLoaded = true; }, { once: true });
    if (document.fonts) document.fonts.ready.then(() => { fontsLoaded = true; });

    const finish = () => {
      el.setAttribute('aria-label', 'Site carregado');
      setTimeout(() => {
        el.classList.add('is-hidden');
        root.classList.remove('is-loading');
        root.classList.add('is-ready');
        el.addEventListener('transitionend', () => el.remove(), { once: true });
        onDone();
      }, 260);
    };

    const frame = (now) => {
      const elapsed = now - start;
      const ready = (pageLoaded && fontsLoaded) || elapsed > MAX_TIME;
      const timeShare = Math.min(1, elapsed / MIN_TIME);
      // Enquanto carrega, avança até 90%; o restante só quando tudo estiver pronto.
      const target = ready ? timeShare : Math.min(0.9, timeShare * 0.9);

      p += (target - p) * (ready ? 0.14 : 0.06);
      if (ready && timeShare >= 1 && 1 - p < 0.004) p = 1;

      el.style.setProperty('--p', p.toFixed(4));
      pctEl.textContent = Math.round(p * 100);

      if (p >= 1) finish();
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Header: fundo com blur ao rolar ---------- */
  function initHeader() {
    const header = document.getElementById('header');
    if (!header) return;
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- Menu mobile ---------- */
  function initMenu() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('menu');
    if (!toggle || !nav) return;
    const desktop = window.matchMedia('(min-width: 1200px)');

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const setMenu = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      nav.classList.toggle('is-open', open);
      root.classList.toggle('menu-open', open);
      if (open) setTimeout(() => nav.querySelector('a')?.focus({ preventScroll: true }), 350);
    };

    toggle.addEventListener('click', () => setMenu(!isOpen()));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setMenu(false); toggle.focus(); return; }
      if (e.key !== 'Tab') return;
      // Mantém o foco dentro do menu aberto
      const focusables = [toggle, ...nav.querySelectorAll('a[href]')];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    desktop.addEventListener('change', (e) => { if (e.matches && isOpen()) setMenu(false); });
  }

  /* ---------- Link ativo conforme a seção visível ---------- */
  function initScrollSpy() {
    if (!hasIO) return;
    const links = new Map(
      [...document.querySelectorAll('.nav__link')].map((a) => [a.getAttribute('href').slice(1), a])
    );
    // Seções sem link próprio (Atendimento, FAQ…) herdam o link da seção anterior
    const owner = new Map();
    let current = null;
    document.querySelectorAll('main > section[id]').forEach((section) => {
      current = links.get(section.id) || current;
      if (current) owner.set(section, current);
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.removeAttribute('aria-current'));
        owner.get(entry.target)?.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    owner.forEach((_, section) => io.observe(section));
  }

  /* ---------- Animações de entrada (fade + translate) ---------- */
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    // Ao terminar, remove o atributo para o elemento voltar às próprias transições (hover etc.)
    const cleanup = (el) => {
      const delay = parseFloat(el.style.getPropertyValue('--delay')) || 0;
      setTimeout(() => {
        el.removeAttribute('data-reveal');
        el.classList.remove('is-revealed');
        el.style.removeProperty('--delay');
      }, 1200 + delay * 1000);
    };

    if (!hasIO || reducedMotion) {
      els.forEach((el) => { el.classList.add('is-revealed'); cleanup(el); });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
        cleanup(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    els.forEach((el) => io.observe(el));
  }

  /* ---------- Backgrounds de mármore sob demanda ---------- */
  function initLazyBackgrounds() {
    const els = document.querySelectorAll('.lazy-bg');
    const load = (el) => {
      const src = (window.innerWidth < 768 && el.dataset.bgSm) || el.dataset.bg;
      if (src) el.style.setProperty('--bg', `url("${new URL(src, document.baseURI).href}")`);
    };
    if (!hasIO) { els.forEach(load); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        load(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '600px 0px' });
    els.forEach((el) => io.observe(el));
  }

  /* ---------- Parallax sutil no CTA final ---------- */
  function initParallax() {
    const section = document.querySelector('.cta');
    const bg = section?.querySelector('.cta__bg');
    if (!bg || reducedMotion) return;
    let ticking = false;
    const update = () => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const progress = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        bg.style.transform = `translate3d(0, ${(progress * -36).toFixed(1)}px, 0)`;
      }
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Cursor customizado (somente mouse) ---------- */
  function initCursor() {
    if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const dot = document.createElement('div');
    const ring = document.createElement('div');
    dot.className = 'cursor-dot';
    ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(dot, ring);
    root.classList.add('has-cursor');

    let mx = -100, my = -100, rx = -100, ry = -100;
    const place = (node, x, y) => { node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`; };
    const show = (visible) => { dot.classList.toggle('is-visible', visible); ring.classList.toggle('is-visible', visible); };

    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      place(dot, mx, my);
      show(true);
      ring.classList.toggle('is-hover', !!e.target.closest('a, button, summary, [data-cursor]'));
    }, { passive: true });
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('mouseout', (e) => { if (!e.relatedTarget) show(false); });

    const loop = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      place(ring, rx, ry);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------- Mensagem de WhatsApp personalizada por assunto ---------- */
  function initWhatsAppTopics() {
    document.querySelectorAll('[data-wa-topic]').forEach((a) => {
      a.href = waLink(`Olá, Dra. Erica! Vim pelo site e preciso de ajuda com: ${a.dataset.waTopic}.`);
    });
  }

  /* ---------- Rastreamento de cliques (Google Ads / GA4 / Meta Pixel) ---------- */
  function initTracking() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.href;
      const type = href.includes('whatsapp.com') ? 'whatsapp'
        : href.includes('instagram.com') ? 'instagram'
        : href.includes('goo.gl') || href.includes('google.com/maps') ? 'maps'
        : null;
      if (!type) return;
      const location = a.dataset.track || 'outros';

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'cta_click', cta_type: type, cta_location: location });
      if (typeof window.gtag === 'function') window.gtag('event', `${type}_click`, { cta_location: location });
      if (typeof window.fbq === 'function' && type === 'whatsapp') window.fbq('track', 'Contact');
    });
  }

  /* ---------- Rótulo do WhatsApp flutuante aparece por alguns segundos ---------- */
  function peekWhatsApp() {
    const float = document.querySelector('.wa-float');
    if (!float) return;
    setTimeout(() => {
      float.classList.add('is-peek');
      setTimeout(() => float.classList.remove('is-peek'), 4500);
    }, 3500);
  }

  /* ---------- Conexões entre seções: fio dourado + veios ---------- */
  function initConnections() {
    const main = document.getElementById('conteudo');
    const rail = main?.querySelector('.rail');
    const first = document.getElementById('sobre');
    if (!rail || !first) return () => {};

    const head = rail.querySelector('.rail__head');
    const veins = [...main.querySelectorAll('.vein[data-at]')];
    const sections = [...main.querySelectorAll(':scope > section:not(.hero)')];

    // Um nó por seção
    const nodes = sections.map((section) => {
      const node = document.createElement('span');
      node.className = 'rail__node';
      node.innerHTML = '<i class="rail__diamond"></i>';
      rail.append(node);
      return { node, section, y: 0 };
    });

    let railTop = 0;
    let railH = 0;

    // Posição relativa ao <main> via offsetTop (ignora os transforms das animações de entrada)
    const relTop = (el) => {
      let y = 0;
      for (let n = el; n && n !== main; n = n.offsetParent) y += n.offsetTop;
      return y;
    };

    const layout = () => {
      railTop = relTop(first);
      railH = main.offsetHeight - railTop;
      rail.style.setProperty('--rail-top', `${railTop}px`);
      rail.style.setProperty('--rail-h', `${railH}px`);

      const container = first.querySelector('.container');
      const contentLeft = container.getBoundingClientRect().left + parseFloat(getComputedStyle(container).paddingLeft);

      nodes.forEach((item) => {
        // Se o eyebrow da seção começa na borda do conteúdo, o nó se alinha a ele e ganha um ramo
        const eyebrow = item.section.querySelector('.eyebrow');
        const aligned = eyebrow && Math.abs(eyebrow.getBoundingClientRect().left - contentLeft) < 6;
        const y = aligned ? relTop(eyebrow) + eyebrow.offsetHeight / 2 : relTop(item.section);
        item.y = Math.max(0, y - railTop);
        item.node.classList.toggle('has-branch', !!aligned);
        item.node.style.setProperty('--y', `${item.y}px`);
      });

      veins.forEach((vein) => {
        const at = document.getElementById(vein.dataset.at);
        if (at) vein.style.setProperty('--top', `${relTop(at) - vein.getBoundingClientRect().height / 2}px`);
      });
    };

    const update = () => {
      if (reducedMotion) {
        rail.style.setProperty('--rail-p', '1');
        nodes.forEach(({ node }) => node.classList.add('is-active'));
        veins.forEach((vein) => vein.style.setProperty('--draw', '1'));
        return;
      }
      const vh = window.innerHeight;
      const pos = vh * 0.55 - (main.getBoundingClientRect().top + railTop);
      const p = Math.min(1, Math.max(0, pos / railH));

      rail.style.setProperty('--rail-p', p.toFixed(4));
      rail.style.setProperty('--rail-y', `${(p * railH).toFixed(1)}px`);
      head.style.setProperty('--rail-head', p > 0 && p < 1 ? '1' : '0');
      nodes.forEach(({ node, y }) => node.classList.toggle('is-active', y <= pos));

      veins.forEach((vein) => {
        const rect = vein.getBoundingClientRect();
        const d = Math.min(1, Math.max(0, (vh - rect.top) / (rect.height + vh * 0.35)));
        vein.style.setProperty('--draw', (1 - (1 - d) ** 2).toFixed(3));  // ease-out
      });
    };

    let ticking = false;
    const refresh = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { layout(); update(); ticking = false; });
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { update(); ticking = false; });
    }, { passive: true });
    // Recalcula quando o conteúdo muda de altura (fontes, FAQ aberto, redimensionamento)
    if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(main);
    else window.addEventListener('resize', refresh);

    refresh();
    return refresh;
  }

  /* ---------- Inicialização ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  initWhatsAppTopics();
  initTracking();
  initHeader();
  initMenu();
  initScrollSpy();
  initLazyBackgrounds();
  initParallax();
  initCursor();
  const refreshConnections = initConnections();

  initPreloader(() => {
    refreshConnections();
    initReveal();
    peekWhatsApp();
    // Se o visitante chegou com âncora (#sobre etc.), leva até ela depois do preloader
    if (location.hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      target?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });
})();
