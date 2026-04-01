/* ============================================================
   LEVORATO PRESS KIT — SCRIPT
   Particle system, animations, navbar, counters
   ============================================================ */

'use strict';

// ============================================================
// PARTICLE SYSTEM — canvas (hero only, pauses when off-screen)
// ============================================================

const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');
let particles = [];
let rafId;
let canvasVisible = true;

function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.init();
    }

    init() {
        this.x     = Math.random() * canvas.width;
        this.y     = Math.random() * canvas.height;
        this.size  = Math.random() * 1.2 + 0.3;
        this.vx    = (Math.random() - 0.5) * 0.22;
        this.vy    = (Math.random() - 0.5) * 0.22;
        this.alpha = Math.random() * 0.4 + 0.06;
        this.isRed = Math.random() > 0.7;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < -2)               this.x = canvas.width  + 2;
        if (this.x > canvas.width + 2) this.x = -2;
        if (this.y < -2)               this.y = canvas.height + 2;
        if (this.y > canvas.height + 2) this.y = -2;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.isRed
            ? `rgba(255, 26, 26, ${this.alpha})`
            : `rgba(200, 200, 200, ${this.alpha * 0.35})`;
        ctx.fill();
    }
}

function buildParticles() {
    particles = [];
    // Cap at 60 — enough for effect, light on GPU
    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 22000));
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function tickParticles() {
    if (!canvasVisible) {
        rafId = requestAnimationFrame(tickParticles);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
        p.update();
        p.draw();
    }
    rafId = requestAnimationFrame(tickParticles);
}

// Pause canvas loop when hero is off-screen
(function watchCanvasVisibility() {
    const heroSection = document.querySelector('.hero');
    if (!heroSection) return;

    const obs = new IntersectionObserver(entries => {
        canvasVisible = entries[0].isIntersecting;
    }, { threshold: 0 });

    obs.observe(heroSection);
})();

// ============================================================
// NAVBAR
// ============================================================

const navbar    = document.getElementById('navbar');
const navToggle = document.getElementById('nav-toggle');
const navMenu   = document.getElementById('nav-menu');

function onScroll() {
    if (window.scrollY > 40) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    updateActiveNav();
}

navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
});

navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ============================================================
// SMOOTH SCROLL (navbar + scroll-padding-top em html)
// ============================================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const id     = this.getAttribute('href');
        if (!id || id === '#' || id.length < 2) return;

        const target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();

        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        target.scrollIntoView({
            behavior: prefersReduced ? 'auto' : 'smooth',
            block: 'start',
        });
    });
});

// ============================================================
// ACTIVE NAV LINK
// ============================================================

const navSections = Array.from(document.querySelectorAll('section[id]'));

function updateActiveNav() {
    const mid = window.scrollY + window.innerHeight / 3;

    let current = '';
    for (const section of navSections) {
        if (section.offsetTop <= mid) {
            current = section.id;
        }
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle(
            'active',
            link.getAttribute('href') === `#${current}`
        );
    });
}

// ============================================================
// INTERSECTION OBSERVER — REVEAL ANIMATIONS
// ============================================================

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);

document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right').forEach(el => {
    revealObserver.observe(el);
});

// ============================================================
// NUMBER COUNTER ANIMATION
// ============================================================

function animateCounter(el, target) {
    const duration = target > 999 ? 2200 : 1600;
    const start    = performance.now();

    function tick(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        const value    = Math.round(eased * target);

        el.textContent = value.toLocaleString('pt-BR');

        if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el     = entry.target;
                const target = parseInt(el.dataset.target, 10);
                if (!isNaN(target)) animateCounter(el, target);
                counterObserver.unobserve(el);
            }
        });
    },
    { threshold: 0.5 }
);

document.querySelectorAll('.number-value[data-target]').forEach(el => {
    counterObserver.observe(el);
});

// ============================================================
// CURSOR GLOW (subtle red spotlight, desktop only)
// ============================================================

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    (function setupCursorGlow() {
        const glow = document.createElement('div');
        glow.style.cssText = `
            position:fixed;width:300px;height:300px;border-radius:50%;
            background:radial-gradient(circle,rgba(255,26,26,0.04) 0%,transparent 70%);
            pointer-events:none;z-index:0;transform:translate(-50%,-50%);
            transition:opacity 0.4s ease;opacity:0;
        `;
        document.body.appendChild(glow);

        let ticking = false;
        document.addEventListener('mousemove', e => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                glow.style.left    = e.clientX + 'px';
                glow.style.top     = e.clientY + 'px';
                glow.style.opacity = '1';
                ticking = false;
            });
        });

        document.addEventListener('mouseleave', () => { glow.style.opacity = '0'; });
    })();
}

// ============================================================
// WINDOW EVENTS
// ============================================================

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resizeCanvas();
        buildParticles();
    }, 250);
}, { passive: true });

window.addEventListener('scroll', onScroll, { passive: true });

// ============================================================
// TIMELINE — DRAG-TO-SCROLL DJ GALLERY
// ============================================================

function initDjGallery() {
    const gallery = document.getElementById('tl-dj-gallery');
    if (!gallery) return;

    let isDown = false, startX = 0, scrollLeft = 0;

    gallery.addEventListener('mousedown', e => {
        isDown = true;
        gallery.classList.add('grabbing');
        startX     = e.pageX - gallery.offsetLeft;
        scrollLeft = gallery.scrollLeft;
    });

    const endDrag = () => { isDown = false; gallery.classList.remove('grabbing'); };
    gallery.addEventListener('mouseleave', endDrag);
    gallery.addEventListener('mouseup',    endDrag);

    gallery.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        gallery.scrollLeft = scrollLeft - (e.pageX - gallery.offsetLeft - startX) * 1.6;
    });

    let touchStartX = 0, touchScrollLeft = 0;
    gallery.addEventListener('touchstart', e => {
        touchStartX     = e.touches[0].pageX;
        touchScrollLeft = gallery.scrollLeft;
    }, { passive: true });
    gallery.addEventListener('touchmove', e => {
        gallery.scrollLeft = touchScrollLeft + (touchStartX - e.touches[0].pageX);
    }, { passive: true });
}

// ============================================================
// TIMELINE — MOBILE CAROUSEL DRAG
// ============================================================

function initTimelineMobileCarousels() {
    const carousels = document.querySelectorAll('.tl-vc-mask');
    if (!carousels.length) return;

    carousels.forEach(carousel => {
        let isPointerDown = false, startX = 0, startY = 0;
        let startScrollLeft = 0, isHorizontalDrag = false;

        carousel.addEventListener('pointerdown', e => {
            if (window.innerWidth > 900) return;
            isPointerDown = true; isHorizontalDrag = false;
            startX = e.clientX; startY = e.clientY;
            startScrollLeft = carousel.scrollLeft;
        });

        carousel.addEventListener('pointermove', e => {
            if (!isPointerDown || window.innerWidth > 900) return;
            const dx = e.clientX - startX, dy = e.clientY - startY;
            if (!isHorizontalDrag) {
                if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
                isHorizontalDrag = true;
            }
            e.preventDefault();
            carousel.scrollLeft = startScrollLeft - dx;
        });

        const end = () => { isPointerDown = false; isHorizontalDrag = false; };
        carousel.addEventListener('pointerup',          end);
        carousel.addEventListener('pointercancel',      end);
        carousel.addEventListener('lostpointercapture', end);
    });
}

// ============================================================
// TIMELINE — TENSION BLOCK GLITCH
// ============================================================

function initTensionGlitch() {
    const el = document.getElementById('tl-glitch');
    if (!el) return;

    let glitchVisible = false;
    const obs = new IntersectionObserver(entries => {
        glitchVisible = entries[0].isIntersecting;
    }, { threshold: 0 });
    obs.observe(el);

    setInterval(() => {
        if (!glitchVisible || Math.random() > 0.55) return;
        el.style.transform = `translateX(${(Math.random() - 0.5) * 8}px)`;
        setTimeout(() => { el.style.transform = ''; }, 80);
    }, 600);
}

// ============================================================
// TIMELINE — SPINE LINE SCROLL ANIMATION
// ============================================================

function initSpineLine() {
    const wrappers = document.querySelectorAll('.tl-spine-wrapper');
    if (!wrappers.length) return;

    function updateSpine(wrapper) {
        const spineLine = wrapper.querySelector('.tl-spine-line');
        if (!spineLine) return;
        const nodes = wrapper.querySelectorAll('.tl-node');
        const lastNode = nodes[nodes.length - 1];
        const endDot = lastNode ? lastNode.querySelector('.tl-node-dot') : null;

        const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
        let endY;
        if (endDot) {
            const dotRect = endDot.getBoundingClientRect();
            endY = dotRect.top + window.scrollY + endDot.offsetHeight / 2;
        } else {
            endY = wrapperTop + wrapper.offsetHeight;
        }

        const totalSpan = Math.max(1, endY - wrapperTop);
        const scrolled  = Math.max(0, window.scrollY + window.innerHeight * 0.55 - wrapperTop);
        const pct       = Math.min(100, (scrolled / totalSpan) * 100);
        spineLine.style.height = ((pct / 100) * totalSpan) + 'px';
    }

    function updateAll() {
        wrappers.forEach(updateSpine);
    }

    window.addEventListener('scroll', updateAll, { passive: true });
    updateAll();
}

// ============================================================
// TIMELINE — SCROLL REVEAL WITH STAGGER
// ============================================================

function initTimelineReveal() {
    const items = document.querySelectorAll(
        '.tl-node-text, .tl-photo-grid--3, .tl-photo-grid--mosaic, .tl-tension-content, .tl-node-photos--gallery'
    );

    const obs = new IntersectionObserver(entries => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                entry.target.style.transitionDelay = `${i * 0.06}s`;
                entry.target.classList.add('tl-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

    items.forEach(el => {
        el.style.opacity   = '0';
        el.style.transform = 'translateY(28px)';
        el.style.transition = 'opacity 0.75s ease, transform 0.75s ease';
        obs.observe(el);
    });

    document.querySelectorAll('.tl-node-dot-inner').forEach(dot => {
        dot.style.opacity   = '0';
        dot.style.transform = 'scale(0)';
        dot.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        const dotObs = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.style.opacity   = '1';
                    e.target.style.transform = 'scale(1)';
                    dotObs.unobserve(e.target);
                }
            });
        }, { threshold: 0.8 });
        dotObs.observe(dot);
    });

    const style = document.createElement('style');
    style.textContent = `.tl-visible { opacity: 1 !important; transform: none !important; }`;
    document.head.appendChild(style);
}

// ============================================================
// TIMELINE — TENSION SECTION: red flicker on entry
// ============================================================

function initTensionEntry() {
    const tension = document.getElementById('tl-ch3');
    if (!tension) return;

    const tensionObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const bg = tension.querySelector('.tl-tension-bg');
                if (!bg) return;
                let count = 0;
                const flicker = setInterval(() => {
                    bg.style.opacity = count % 2 === 0 ? '1.6' : '0.4';
                    count++;
                    if (count >= 6) { clearInterval(flicker); bg.style.opacity = ''; }
                }, 80);
                tensionObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.35 });

    tensionObs.observe(tension);
}

// ============================================================
// HERO — CSS PARTICLES (generated at runtime, reduced count)
// ============================================================

function initHeroParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;

    // Fewer particles on mobile/low-end
    const isMobile = window.innerWidth < 768;
    const COUNT    = isMobile ? 40 : 70;
    const COLORS   = ['#ff1a1a', '#ff3b3b', '#cc0000', '#ff5555', '#800000'];
    const frag     = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
        const el    = document.createElement('span');
        const size  = (Math.random() * 7 + 2).toFixed(1);
        const top   = (Math.random() * 100).toFixed(1);
        const left  = (Math.random() * 100).toFixed(1);
        const dur   = (Math.random() * 3.5 + 2.5).toFixed(2);
        const delay = (Math.random() * 5).toFixed(2);
        const op    = (Math.random() * 0.5 + 0.2).toFixed(2);
        const rise  = `-${(Math.random() * 30 + 10).toFixed(0)}px`;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        // Only add glow to larger particles to save GPU
        const glow  = size > 6 ? `0 0 ${Math.round(size * 1.3)}px ${color}88` : 'none';

        el.className = 'hp';
        el.style.cssText = `width:${size}px;height:${size}px;top:${top}%;left:${left}%;background:${color};box-shadow:${glow};animation-duration:${dur}s;animation-delay:-${delay}s;--hp-op:${op};--hp-rise:${rise};`;
        frag.appendChild(el);
    }

    container.appendChild(frag);
}

// ============================================================
// MUSIC — STREAM TABS
// ============================================================

function initStreamTabs() {
    const tabs   = document.querySelectorAll('.stream-tab');
    const panels = document.querySelectorAll('.stream-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            tabs.forEach(t   => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('panel-' + target);
            if (panel) panel.classList.add('active');
        });
    });
}

function initDownloadsTabs() {
    const root = document.getElementById('downloads-tabs');
    if (!root) return;
    const tabs = root.querySelectorAll('.downloads-tab');
    const panels = root.parentElement.querySelectorAll('.downloads-panel');
    if (!tabs.length || !panels.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;
            const target = tab.dataset.dlPanel;
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById('dl-panel-' + target);
            if (panel) panel.classList.add('active');
        });
    });
}

function initTimelineStoryTabs() {
    const root = document.getElementById('timeline-story-tabs');
    if (!root) return;
    const tabs = root.querySelectorAll('.downloads-tab');
    const panels = document.querySelectorAll('.tl-timeline-panel');
    if (!tabs.length || !panels.length) return;

    function activate(target) {
        tabs.forEach(t => {
            const on = t.getAttribute('data-tl-panel') === target;
            t.classList.toggle('active', on);
            t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        panels.forEach(p => {
            const on = p.id === 'tl-panel-' + target;
            p.classList.toggle('active', on);
            p.setAttribute('aria-hidden', on ? 'false' : 'true');
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.classList.contains('active')) return;
            const target = tab.getAttribute('data-tl-panel');
            if (!target) return;
            activate(target);
        });
    });
}

// ============================================================
// INTERNATIONALIZATION (i18n)
// ============================================================

const i18n = {
    pt: {
        'nav-historia'       : 'História',
        'nav-sobre'          : 'Sobre',
        'nav-musicas'        : 'Músicas',
        'hero-desc'          : 'Sets construídos a partir da identidade musical.<br>Cada pista, uma história. Cada drop, uma experiência.',
        'hero-listen'        : 'Ouvir Agora',
        'stat-years'         : 'Anos de Música',
        'badge-pressure'     : 'Pressão de Pista',
        'tl-section-tag'     : 'A HISTÓRIA',
        'tl-section-title'   : 'Uma trajetória de <span class="text-glow">20 anos</span>',
        'tl-tab-performance' : 'Performance nos palcos',
        'tl-tab-education'   : 'Educação musical',
        'tl-edu-lead'        : 'Escolas, projetos e aulas em ordem cronológica. Clique no texto de cada etapa para abrir o site ou perfil quando houver link.',
        'ch01-tag'           : 'CAPÍTULO 01',
        'ch01-title'         : 'Onde tudo<br><span class="tl-title-accent">começou.</span>',
        'ch01-desc'          : 'Antes do palco, antes da mixagem, antes do nome, havia uma vontade que ninguém conseguia apagar. Em 2011, Pedro pisou num palco pela primeira vez. A história começou aqui.',
        'ch02-tag'           : 'CAPÍTULO 02',
        'ch02-title'         : 'Onde eu<br><span class="tl-title-accent">cheguei.</span>',
        'ch02-crowd'         : '+50 mil pessoas no público',
        'ch02-desc'          : 'O pagode me colocou na estrada e mostrou o que é construir uma conexão real com uma plateia. Em 2022, toquei para mais de <strong>+50 mil pessoas</strong>, e entendi que era apenas o começo.',
        'ch03-tag'           : 'CAPÍTULO 03',
        'tension-e'          : 'E',
        'tension-phrase'     : ' onde estou',
        'tension-now'        : 'AGORA??',
        'tension-sub'        : 'A resposta está abaixo.',
        'ch04-tag'           : 'CAPÍTULO 03',
        'ch04-year'          : '2025 — HOJE',
        'ch04-title'         : 'Novo<br><span class="tl-title-accent">Ciclo.</span>',
        'ch04-quote'         : 'Pela primeira vez em 15 anos de carreira musical nos palcos, primeiro no pagode e agora na música eletrônica, tô lançando minha marca oficialmente pela primeira vez dentro do Minimal Bass, assumindo o protagonismo da minha própria história.',
        'sobre-tag'          : 'SOBRE',
        'sobre-title'        : 'A força que<br><span class="text-glow">move a pista</span>',
        'sobre-p1'           : 'Fala galera beleza? Sou Pedro (Levorato), DJ de Minimal Bass, trazendo sets totalmente construídos a partir da minha identidade musical. Cada lugar que eu toco é uma experiência diferente, gosto de sentir a pista e construir o set de acordo com a energia do momento. Pra mim, tocar é como contar uma história, criando conexão real com quem tá ali do começo ao fim.',
        'sobre-p2'           : 'Estou ligado à música indiretamente há 20 anos e atuo de forma profissional há 15 anos, passando por banda, docência, regência e diferentes projetos musicais.',
        'sobre-p3'           : 'Estudei música na <strong>UEM (Universidade Estadual do Paraná)</strong>, e isso influencia direto na forma como eu penso meus sets e produções. No meu som, além da eletrônica, trago referências de pop e rap, mas tudo passado pela minha pegada de <em>minimal bass extremamente grotesca</em> com muita pressão de pista, sem perder a essência.',
        'sobre-p4'           : 'Meu maior sonho é não entregar apenas o que o público quer, mas levar todo mundo para um lugar onde ninguém esteve antes.',
        'lugares-tag'        : 'PRESENÇA DE PALCO',
        'lugares-title'      : 'Lugares onde<br><span class="text-glow">já toquei</span>',
        'dl-tag'             : 'MATERIAL DE IMPRENSA',
        'dl-title'           : 'Fotos em <span class="text-glow">alta qualidade</span>',
        'dl-desc'            : 'Baixe individualmente ou o pacote completo sem perda de qualidade.',
        'dl-cta'             : 'Baixar todas as fotos (.zip)',
        'dl-btn'             : 'Baixar',
        'dl-tab-photos'      : 'Minhas fotos',
        'dl-tab-logo'        : 'Logo',
        'dl-logo-tag'        : 'LOGO OFICIAL',
        'dl-logo-title'      : 'Logo oficial para midia e contratantes',
        'dl-logo-desc'       : 'Baixe a logo oficial separada das fotos para aplicar em flyers, lineups, artes e materiais de divulgacao.',
        'dl-logo-btn'        : 'Baixar logo (.png)',
        'fs-tag': 'DESTAQUE',
        'fs-new': 'NOVO SET',
        'fs-title1': 'DJ CONTEST',
        'fs-subtitle': 'Minimal Bass &middot; 2026',
        'fs-desc': 'Set submetido ao contest da Sixx House, uma das principais referencias do Minimal Bass no Brasil. Pressao de pista do comeco ao fim.',
        'fs-listen': 'Ouvir no SoundCloud',
        'music-tag'          : 'OUÇA',
        'music-title'        : 'Músicas &amp; <span class="text-glow">Releases</span>',
        'music-desc'         : 'Explore os sets e lançamentos nas plataformas',
        'tab-autorais'       : 'Autorais',
        'sc-cta'             : 'Ver todos no SoundCloud',
        'spotify-cta'        : 'Ver discografia completa no Spotify',
        'platforms-label'    : 'Também disponível em',
        'booking-tag'        : 'CONTATO',
        'booking-title'      : 'Pronto para<br><span class="text-glow">levar ao limite?</span>',
        'booking-desc'       : 'Disponível para clubs, eventos e festivais.<br>Entre em contato e vamos criar algo memorável.',
        'available-private'  : 'Eventos Privados',
        'footer-tagline'     : 'Energia crua. Pressão de pista.<br>Som sem concessões.',
        'footer-nav-heading' : 'Navegação',
        'footer-sobre'       : 'Sobre',
        'footer-musicas'     : 'Músicas',
        'footer-social-heading': 'Redes Sociais',
        'footer-copy'        : '© 2026 LEVORATO. Todos os direitos reservados.',
        'footer-credit-text' : 'Site desenvolvido por',
    },
    en: {
        'nav-historia'       : 'History',
        'nav-sobre'          : 'About',
        'nav-musicas'        : 'Music',
        'hero-desc'          : 'Sets built from musical identity.<br>Every track, a story. Every drop, an experience.',
        'hero-listen'        : 'Listen Now',
        'stat-years'         : 'Years of Music',
        'badge-pressure'     : 'Floor Pressure',
        'tl-section-tag'     : 'THE STORY',
        'tl-section-title'   : 'A journey of <span class="text-glow">20 years</span>',
        'tl-tab-performance' : 'Stage performance',
        'tl-tab-education'   : 'Music education',
        'tl-edu-lead'        : 'Schools, projects and lessons in chronological order. Tap each block’s text to open the website or profile when a link is available.',
        'ch01-tag'           : 'CHAPTER 01',
        'ch01-title'         : 'Where it all<br><span class="tl-title-accent">began.</span>',
        'ch01-desc'          : 'Before the stage, before the mixing, before the name, there was a will that nobody could extinguish. In 2011, Pedro stepped on a stage for the first time. The story started here.',
        'ch02-tag'           : 'CHAPTER 02',
        'ch02-title'         : 'How far<br><span class="tl-title-accent">I came.</span>',
        'ch02-crowd'         : '+50 thousand people in the crowd',
        'ch02-desc'          : 'Pagode put me on the road and showed me what it means to build a real connection with an audience. In 2022, I played to more than <strong>+50 thousand people</strong>, and understood it was just the beginning.',
        'ch03-tag'           : 'CHAPTER 03',
        'tension-e'          : 'And',
        'tension-phrase'     : ' where am I',
        'tension-now'        : 'NOW??',
        'tension-sub'        : 'The answer is below.',
        'ch04-tag'           : 'CHAPTER 03',
        'ch04-year'          : '2025 — TODAY',
        'ch04-title'         : 'New<br><span class="tl-title-accent">Cycle.</span>',
        'ch04-quote'         : 'For the first time in 15 years of musical career on stages — first in pagode and now in electronic music — I\'m officially launching my brand within Minimal Bass, taking ownership of my own story.',
        'sobre-tag'          : 'ABOUT',
        'sobre-title'        : 'The force that<br><span class="text-glow">moves the floor</span>',
        'sobre-p1'           : 'Hey! I\'m Pedro (Levorato), a Minimal Bass DJ, bringing sets entirely built from my musical identity. Every place I play is a different experience — I love feeling the floor and building the set according to the energy of the moment. For me, playing is like telling a story, creating a real connection with everyone there from start to finish.',
        'sobre-p2'           : 'I\'ve been connected to music indirectly for 20 years and have worked professionally for 15 years, going through band, teaching, conducting and different musical projects.',
        'sobre-p3'           : 'I studied music at <strong>UEM (State University of Paraná)</strong>, and that directly influences how I think about my sets and productions. In my sound, beyond electronics, I bring references from pop and rap, all filtered through my <em>extremely heavy minimal bass</em> style with lots of floor pressure, without losing the essence.',
        'sobre-p4'           : 'My biggest dream is not just to deliver what the crowd wants, but to take everyone to a place where no one has ever been before.',
        'lugares-tag'        : 'STAGE PRESENCE',
        'lugares-title'      : 'Places where<br><span class="text-glow">I\'ve played</span>',
        'dl-tag'             : 'PRESS MATERIAL',
        'dl-title'           : 'Photos in <span class="text-glow">high quality</span>',
        'dl-desc'            : 'Download individually or the full package without quality loss.',
        'dl-cta'             : 'Download all photos (.zip)',
        'dl-btn'             : 'Download',
        'dl-tab-photos'      : 'My photos',
        'dl-tab-logo'        : 'Logo',
        'dl-logo-tag'        : 'OFFICIAL LOGO',
        'dl-logo-title'      : 'Official logo for media and bookers',
        'dl-logo-desc'       : 'Download the official logo separately from photos for flyers, lineups, artworks and promo materials.',
        'dl-logo-btn'        : 'Download logo (.png)',
        'fs-tag': 'FEATURED',
        'fs-new': 'NEW SET',
        'fs-title1': 'DJ CONTEST',
        'fs-subtitle': 'Minimal Bass &middot; 2026',
        'fs-desc': 'Set submitted to the Sixx House contest, one of the main Minimal Bass references in Brazil. Dance floor pressure from start to finish.',
        'fs-listen': 'Listen on SoundCloud',
        'music-tag'          : 'LISTEN',
        'music-title'        : 'Music &amp; <span class="text-glow">Releases</span>',
        'music-desc'         : 'Explore sets and releases on the platforms',
        'tab-autorais'       : 'Originals',
        'sc-cta'             : 'See all on SoundCloud',
        'spotify-cta'        : 'See full discography on Spotify',
        'platforms-label'    : 'Also available on',
        'booking-tag'        : 'CONTACT',
        'booking-title'      : 'Ready to<br><span class="text-glow">push the limits?</span>',
        'booking-desc'       : 'Available for clubs, events and festivals.<br>Get in touch and let\'s create something memorable.',
        'available-private'  : 'Private Events',
        'footer-tagline'     : 'Raw energy. Floor pressure.<br>Sound without compromise.',
        'footer-nav-heading' : 'Navigation',
        'footer-sobre'       : 'About',
        'footer-musicas'     : 'Music',
        'footer-social-heading': 'Social Media',
        'footer-copy'        : '© 2026 LEVORATO. All rights reserved.',
        'footer-credit-text' : 'Website developed by',
    },
    es: {
        'nav-historia'       : 'Historia',
        'nav-sobre'          : 'Sobre',
        'nav-musicas'        : 'Música',
        'hero-desc'          : 'Sets construidos desde la identidad musical.<br>Cada pista, una historia. Cada drop, una experiencia.',
        'hero-listen'        : 'Escuchar Ahora',
        'stat-years'         : 'Años de Música',
        'badge-pressure'     : 'Presión de Pista',
        'tl-section-tag'     : 'LA HISTORIA',
        'tl-section-title'   : 'Un viaje de <span class="text-glow">20 años</span>',
        'tl-tab-performance' : 'Actuación en escena',
        'tl-tab-education'   : 'Educación musical',
        'tl-edu-lead'        : 'Escuelas, proyectos y clases en orden cronológico. Toca el texto de cada etapa para abrir el sitio o el perfil si hay enlace.',
        'ch01-tag'           : 'CAPÍTULO 01',
        'ch01-title'         : 'Donde todo<br><span class="tl-title-accent">comenzó.</span>',
        'ch01-desc'          : 'Antes del escenario, antes de la mezcla, antes del nombre, había una voluntad que nadie podía apagar. En 2011, Pedro pisó un escenario por primera vez. La historia comenzó aquí.',
        'ch02-tag'           : 'CAPÍTULO 02',
        'ch02-title'         : 'Hasta donde<br><span class="tl-title-accent">llegué.</span>',
        'ch02-crowd'         : '+50 mil personas en el público',
        'ch02-desc'          : 'El pagode me puso en camino y me mostró lo que es construir una conexión real con el público. En 2022, toqué para más de <strong>+50 mil personas</strong>, y entendí que era solo el comienzo.',
        'ch03-tag'           : 'CAPÍTULO 03',
        'tension-e'          : 'Y',
        'tension-phrase'     : ' dónde estoy',
        'tension-now'        : '¿AHORA??',
        'tension-sub'        : 'La respuesta está abajo.',
        'ch04-tag'           : 'CAPÍTULO 03',
        'ch04-year'          : '2025 — HOY',
        'ch04-title'         : 'Nuevo<br><span class="tl-title-accent">Ciclo.</span>',
        'ch04-quote'         : 'Por primera vez en 15 años de carrera musical en los escenarios — primero en el pagode y ahora en la música electrónica — estoy lanzando oficialmente mi marca dentro del Minimal Bass, asumiendo el protagonismo de mi propia historia.',
        'sobre-tag'          : 'SOBRE',
        'sobre-title'        : 'La fuerza que<br><span class="text-glow">mueve la pista</span>',
        'sobre-p1'           : '¡Hola! Soy Pedro (Levorato), DJ de Minimal Bass, trayendo sets completamente construidos desde mi identidad musical. Cada lugar donde toco es una experiencia diferente — me encanta sentir la pista y construir el set según la energía del momento. Para mí, tocar es como contar una historia, creando una conexión real con todos desde el principio hasta el final.',
        'sobre-p2'           : 'Estoy conectado a la música indirectamente desde hace 20 años y trabajo profesionalmente desde hace 15 años, pasando por banda, docencia, dirección y diferentes proyectos musicales.',
        'sobre-p3'           : 'Estudié música en la <strong>UEM (Universidad Estatal de Paraná)</strong>, y eso influye directamente en cómo pienso mis sets y producciones. En mi sonido, más allá de la electrónica, traigo referencias del pop y el rap, todo filtrado por mi estilo de <em>minimal bass extremadamente pesado</em> con mucha presión de pista, sin perder la esencia.',
        'sobre-p4'           : 'Mi mayor sueño no es solo entregar lo que el público quiere, sino llevar a todos a un lugar donde nadie ha estado antes.',
        'lugares-tag'        : 'PRESENCIA EN ESCENARIO',
        'lugares-title'      : 'Lugares donde<br><span class="text-glow">he tocado</span>',
        'dl-tag'             : 'MATERIAL DE PRENSA',
        'dl-title'           : 'Fotos en <span class="text-glow">alta calidad</span>',
        'dl-desc'            : 'Descarga individualmente o el paquete completo sin pérdida de calidad.',
        'dl-cta'             : 'Descargar todas las fotos (.zip)',
        'dl-btn'             : 'Descargar',
        'dl-tab-photos'      : 'Mis fotos',
        'dl-tab-logo'        : 'Logo',
        'dl-logo-tag'        : 'LOGO OFICIAL',
        'dl-logo-title'      : 'Logo oficial para prensa y bookers',
        'dl-logo-desc'       : 'Descarga el logo oficial separado de las fotos para usar en flyers, lineups, artes y materiales promocionales.',
        'dl-logo-btn'        : 'Descargar logo (.png)',
        'fs-tag': 'DESTACADO',
        'fs-new': 'NUEVO SET',
        'fs-title1': 'DJ CONTEST',
        'fs-subtitle': 'Minimal Bass &middot; 2026',
        'fs-desc': 'Set enviado al contest de Sixx House, una de las principales referencias del Minimal Bass en Brasil. Presion de pista de principio a fin.',
        'fs-listen': 'Escuchar en SoundCloud',
        'music-tag'          : 'ESCUCHA',
        'music-title'        : 'Música &amp; <span class="text-glow">Releases</span>',
        'music-desc'         : 'Explora los sets y lanzamientos en las plataformas',
        'tab-autorais'       : 'Originales',
        'sc-cta'             : 'Ver todos en SoundCloud',
        'spotify-cta'        : 'Ver discografía completa en Spotify',
        'platforms-label'    : 'También disponible en',
        'booking-tag'        : 'CONTACTO',
        'booking-title'      : 'Listo para<br><span class="text-glow">llevar al límite?</span>',
        'booking-desc'       : 'Disponible para clubs, eventos y festivales.<br>Contáctame y creemos algo memorable.',
        'available-private'  : 'Eventos Privados',
        'footer-tagline'     : 'Energía cruda. Presión de pista.<br>Sonido sin concesiones.',
        'footer-nav-heading' : 'Navegación',
        'footer-sobre'       : 'Sobre',
        'footer-musicas'     : 'Música',
        'footer-social-heading': 'Redes Sociales',
        'footer-copy'        : '© 2026 LEVORATO. Todos los derechos reservados.',
        'footer-credit-text' : 'Sitio desarrollado por',
    },
    zh: {
        'nav-historia'       : '历程',
        'nav-sobre'          : '关于',
        'nav-musicas'        : '音乐',
        'hero-desc'          : '从音乐身份构建的曲目集。<br>每首曲目，一个故事。每次降拍，一次体验。',
        'hero-listen'        : '立即收听',
        'stat-years'         : '音乐生涯年数',
        'badge-pressure'     : '舞台张力',
        'tl-section-tag'     : '历程',
        'tl-section-title'   : '20年的<span class="text-glow">旅程</span>',
        'tl-tab-performance' : '舞台演出',
        'tl-tab-education'   : '音乐教育',
        'tl-edu-lead'        : '学校、项目与课程按时间排列。有链接时，点击每段文字可打开网站或主页。',
        'ch01-tag'           : '第一章',
        'ch01-title'         : '一切<br><span class="tl-title-accent">开始的地方。</span>',
        'ch01-desc'          : '在舞台之前，在混音之前，在名字之前，有一种任何人都无法熄灭的意志。2011年，Pedro第一次踏上舞台。故事从这里开始。',
        'ch02-tag'           : '第二章',
        'ch02-title'         : '我<br><span class="tl-title-accent">到达的地方。</span>',
        'ch02-crowd'         : '超过5万名现场观众',
        'ch02-desc'          : 'Pagode让我踏上旅程，让我明白与观众建立真实连结意味着什么。2022年，我为超过<strong>5万人</strong>演出，并明白这只是开始。',
        'ch03-tag'           : '第三章',
        'tension-e'          : '而',
        'tension-phrase'     : ' 我现在在哪里',
        'tension-now'        : '现在？？',
        'tension-sub'        : '答案就在下面。',
        'ch04-tag'           : '第三章',
        'ch04-year'          : '2025 — 至今',
        'ch04-title'         : '新<br><span class="tl-title-accent">篇章。</span>',
        'ch04-quote'         : '在舞台上15年的音乐生涯中——先是pagode，现在是电子音乐——我第一次在Minimal Bass领域正式发布自己的品牌，掌控自己故事的主导权。',
        'sobre-tag'          : '关于',
        'sobre-title'        : '驱动<br><span class="text-glow">舞台的力量</span>',
        'sobre-p1'           : '大家好！我是Pedro（Levorato），Minimal Bass DJ，带来完全从我的音乐身份构建的曲目集。我演出的每个地方都是不同的体验——我喜欢感受舞台，根据当下的能量来构建曲目集。对我来说，演出就像讲述一个故事，从开始到结束与在场的每个人建立真实的连结。',
        'sobre-p2'           : '我与音乐间接相关已20年，专业从事音乐工作已15年，历经乐队、教学、指挥和各种音乐项目。',
        'sobre-p3'           : '我在<strong>UEM（巴拉那州立大学）</strong>学习音乐，这直接影响了我对曲目集和制作的思考方式。在我的音乐中，除了电子音乐，我还融入流行和说唱的元素，但都经过我<em>极具重量感的minimal bass</em>风格过滤，充满舞台张力，不失本质。',
        'sobre-p4'           : '我最大的梦想不只是提供观众想要的，而是带所有人去一个从未有人到过的地方。',
        'lugares-tag'        : '舞台足迹',
        'lugares-title'      : '我曾<br><span class="text-glow">演出的地方</span>',
        'dl-tag'             : '媒体素材',
        'dl-title'           : '高清<span class="text-glow">照片素材</span>',
        'dl-desc'            : '单独下载或下载完整套装，无损画质。',
        'dl-cta'             : '下载所有照片（.zip）',
        'dl-btn'             : '下载',
        'dl-tab-photos'      : '我的照片',
        'dl-tab-logo'        : 'Logo',
        'dl-logo-tag'        : '官方 LOGO',
        'dl-logo-title'      : '面向演出方与媒体的官方 Logo',
        'dl-logo-desc'       : '将官方 logo 与照片分开下载，用于海报、阵容图与宣传物料。',
        'dl-logo-btn'        : '下载 logo (.png)',
        'fs-tag': '精选',
        'fs-new': '新曲集',
        'fs-title1': 'DJ 竞赛',
        'fs-subtitle': 'Minimal Bass &middot; 2026',
        'fs-desc': '提交至 Sixx House 竞赛的曲集。从头到尾充满舞池压迫感。',
        'fs-listen': '在 SoundCloud 收听',
        'music-tag'          : '收听',
        'music-title'        : '音乐 &amp; <span class="text-glow">发行</span>',
        'music-desc'         : '在各平台探索曲目集和发行作品',
        'tab-autorais'       : '原创作品',
        'sc-cta'             : '在SoundCloud查看全部',
        'spotify-cta'        : '在Spotify查看完整唱片目录',
        'platforms-label'    : '还可在以下平台收听',
        'booking-tag'        : '联系',
        'booking-title'      : '准备好<br><span class="text-glow">突破极限了吗？</span>',
        'booking-desc'       : '可接受俱乐部、活动和音乐节演出邀约。<br>联系我，一起创造难忘的体验。',
        'available-private'  : '私人活动',
        'footer-tagline'     : '原始能量。舞台张力。<br>纯粹的声音。',
        'footer-nav-heading' : '导航',
        'footer-sobre'       : '关于',
        'footer-musicas'     : '音乐',
        'footer-social-heading': '社交媒体',
        'footer-copy'        : '© 2026 LEVORATO. 保留所有权利。',
        'footer-credit-text' : '网站开发者',
    },
    de: {
        'nav-historia'       : 'Geschichte',
        'nav-sobre'          : 'Über mich',
        'nav-musicas'        : 'Musik',
        'hero-desc'          : 'Sets aufgebaut aus musikalischer Identität.<br>Jeder Track, eine Geschichte. Jeder Drop, ein Erlebnis.',
        'hero-listen'        : 'Jetzt hören',
        'stat-years'         : 'Jahre Musik',
        'badge-pressure'     : 'Floor-Druck',
        'tl-section-tag'     : 'DIE GESCHICHTE',
        'tl-section-title'   : 'Eine Reise von <span class="text-glow">20 Jahren</span>',
        'tl-tab-performance' : 'Auf der Bühne',
        'tl-tab-education'   : 'Musikpädagogik',
        'tl-edu-lead'        : 'Schulen, Projekte und Unterricht chronologisch. Tippen Sie auf den Text, um Website oder Profil zu öffnen, wenn ein Link vorhanden ist.',
        'ch01-tag'           : 'KAPITEL 01',
        'ch01-title'         : 'Wo alles<br><span class="tl-title-accent">begann.</span>',
        'ch01-desc'          : 'Vor der Bühne, vor dem Mixing, vor dem Namen gab es einen Willen, den niemand auslöschen konnte. 2011 betrat Pedro zum ersten Mal eine Bühne. Die Geschichte begann hier.',
        'ch02-tag'           : 'KAPITEL 02',
        'ch02-title'         : 'Wie weit<br><span class="tl-title-accent">ich kam.</span>',
        'ch02-crowd'         : '+50.000 Menschen im Publikum',
        'ch02-desc'          : 'Pagode hat mich auf den Weg gebracht und mir gezeigt, was es bedeutet, eine echte Verbindung mit dem Publikum aufzubauen. 2022 spielte ich vor mehr als <strong>50.000 Menschen</strong> und verstand, dass es erst der Anfang war.',
        'ch03-tag'           : 'KAPITEL 03',
        'tension-e'          : 'Und',
        'tension-phrase'     : ' wo bin ich',
        'tension-now'        : 'JETZT??',
        'tension-sub'        : 'Die Antwort liegt unten.',
        'ch04-tag'           : 'KAPITEL 03',
        'ch04-year'          : '2025 — HEUTE',
        'ch04-title'         : 'Neuer<br><span class="tl-title-accent">Zyklus.</span>',
        'ch04-quote'         : 'Zum ersten Mal in 15 Jahren musikalischer Karriere auf Bühnen — zuerst im Pagode, jetzt in der elektronischen Musik — bringe ich offiziell meine Marke innerhalb von Minimal Bass heraus und übernehme die Hauptrolle in meiner eigenen Geschichte.',
        'sobre-tag'          : 'ÜBER MICH',
        'sobre-title'        : 'Die Kraft, die<br><span class="text-glow">den Floor bewegt</span>',
        'sobre-p1'           : 'Hey! Ich bin Pedro (Levorato), ein Minimal Bass DJ, der Sets mitbringt, die vollständig aus meiner musikalischen Identität aufgebaut sind. Jeder Ort, an dem ich spiele, ist eine andere Erfahrung — ich liebe es, den Floor zu spüren und das Set nach der Energie des Moments zu formen. Für mich ist Auflegen wie eine Geschichte erzählen: echte Verbindung mit dem Publikum von Anfang bis Ende.',
        'sobre-p2'           : 'Ich bin seit 20 Jahren indirekt mit Musik verbunden und arbeite seit 15 Jahren professionell, durch Band, Unterricht, Dirigieren und verschiedene Musikprojekte.',
        'sobre-p3'           : 'Ich studierte Musik an der <strong>UEM (Staatliche Universität Paraná)</strong>, was direkt beeinflusst, wie ich über meine Sets und Produktionen denke. In meinem Sound bringe ich neben Elektronik auch Einflüsse aus Pop und Rap — alles gefiltert durch meinen <em>extrem wuchtigen Minimal Bass</em>-Stil mit viel Floor-Druck, ohne die Essenz zu verlieren.',
        'sobre-p4'           : 'Mein größter Traum ist nicht nur, das zu liefern, was das Publikum will, sondern alle an einen Ort zu bringen, wo noch niemand gewesen ist.',
        'lugares-tag'        : 'BÜHNENPRÄSENZ',
        'lugares-title'      : 'Orte, wo ich<br><span class="text-glow">gespielt habe</span>',
        'dl-tag'             : 'PRESSEMATERIAL',
        'dl-title'           : 'Fotos in <span class="text-glow">hoher Qualität</span>',
        'dl-desc'            : 'Einzeln oder als komplettes Paket ohne Qualitätsverlust herunterladen.',
        'dl-cta'             : 'Alle Fotos herunterladen (.zip)',
        'dl-btn'             : 'Herunterladen',
        'dl-tab-photos'      : 'Meine Fotos',
        'dl-tab-logo'        : 'Logo',
        'dl-logo-tag'        : 'OFFIZIELLES LOGO',
        'dl-logo-title'      : 'Offizielles Logo für Presse und Booker',
        'dl-logo-desc'       : 'Lade das offizielle Logo getrennt von den Fotos herunter für Flyer, Lineups, Artworks und Promo-Material.',
        'dl-logo-btn'        : 'Logo herunterladen (.png)',
        'fs-tag': 'HIGHLIGHT',
        'fs-new': 'NEUES SET',
        'fs-title1': 'DJ CONTEST',
        'fs-subtitle': 'Minimal Bass &middot; 2026',
        'fs-desc': 'Set eingereicht beim Sixx House Contest, einer der wichtigsten Minimal Bass Referenzen in Brasilien. Dancefloor-Druck von Anfang bis Ende.',
        'fs-listen': 'Auf SoundCloud anhören',
        'music-tag'          : 'HÖREN',
        'music-title'        : 'Musik &amp; <span class="text-glow">Releases</span>',
        'music-desc'         : 'Entdecke Sets und Releases auf den Plattformen',
        'tab-autorais'       : 'Eigene Tracks',
        'sc-cta'             : 'Alle auf SoundCloud ansehen',
        'spotify-cta'        : 'Vollständige Diskografie auf Spotify',
        'platforms-label'    : 'Auch verfügbar auf',
        'booking-tag'        : 'KONTAKT',
        'booking-title'      : 'Bereit, ans<br><span class="text-glow">Limit zu gehen?</span>',
        'booking-desc'       : 'Verfügbar für Clubs, Events und Festivals.<br>Melde dich — lass uns etwas Unvergessliches schaffen.',
        'available-private'  : 'Private Events',
        'footer-tagline'     : 'Rohe Energie. Floor-Druck.<br>Klang ohne Kompromisse.',
        'footer-nav-heading' : 'Navigation',
        'footer-sobre'       : 'Über mich',
        'footer-musicas'     : 'Musik',
        'footer-social-heading': 'Social Media',
        'footer-copy'        : '© 2026 LEVORATO. Alle Rechte vorbehalten.',
        'footer-credit-text' : 'Website entwickelt von',
    },
    ja: {
        'nav-historia'       : 'ヒストリー',
        'nav-sobre'          : 'プロフィール',
        'nav-musicas'        : 'ミュージック',
        'hero-desc'          : '音楽的アイデンティティから構築されたセット。<br>すべてのトラックに物語がある。すべてのドロップに体験がある。',
        'hero-listen'        : '今すぐ聴く',
        'stat-years'         : '音楽歴（年）',
        'badge-pressure'     : 'フロアの圧力',
        'tl-section-tag'     : 'ヒストリー',
        'tl-section-title'   : '<span class="text-glow">20年</span>の軌跡',
        'tl-tab-performance' : 'ステージ',
        'tl-tab-education'   : '音楽教育',
        'tl-edu-lead'        : '学校・プロジェクト・レッスンを時系列で。リンクがある場合は各ブロックのテキストをタップしてサイトやプロフィールを開きます。',
        'ch01-tag'           : 'チャプター 01',
        'ch01-title'         : 'すべてが<br><span class="tl-title-accent">始まった場所。</span>',
        'ch01-desc'          : 'ステージの前、ミキシングの前、名前の前に、誰にも消せない意志があった。2011年、Pedroは初めてステージに立った。物語はここから始まった。',
        'ch02-tag'           : 'チャプター 02',
        'ch02-title'         : '私が<br><span class="tl-title-accent">到達した場所。</span>',
        'ch02-crowd'         : '5万人以上のオーディエンス',
        'ch02-desc'          : 'Pagodeが私を旅へと送り出し、オーディエンスと本物のつながりを築く意味を教えてくれた。2022年、<strong>5万人以上</strong>の前で演奏し、これはまだ始まりに過ぎないと悟った。',
        'ch03-tag'           : 'チャプター 03',
        'tension-e'          : 'そして',
        'tension-phrase'     : ' 今どこにいるのか',
        'tension-now'        : '今？？',
        'tension-sub'        : '答えは下にあります。',
        'ch04-tag'           : 'チャプター 03',
        'ch04-year'          : '2025 — 現在',
        'ch04-title'         : '新しい<br><span class="tl-title-accent">サイクル。</span>',
        'ch04-quote'         : 'ステージでの15年の音楽キャリアの中で — 初めはpagode、今は電子音楽 — Minimal Bassの世界で初めて公式に自分のブランドをローンチし、自分自身のストーリーの主役となる。',
        'sobre-tag'          : 'プロフィール',
        'sobre-title'        : 'フロアを動かす<br><span class="text-glow">力</span>',
        'sobre-p1'           : 'こんにちは！私はPedro（Levorato）、Minimal Bass DJです。自分の音楽的アイデンティティから構築されたセットをお届けします。演奏する場所によって体験は異なります — フロアを感じ、その瞬間のエネルギーに合わせてセットを構築するのが好きです。私にとって演奏とは物語を語ること。最初から最後まで皆さんと本物のつながりを創り出すことです。',
        'sobre-p2'           : '音楽と間接的に関わって20年、プロとして活動して15年、バンド、教育、指揮、さまざまな音楽プロジェクトを経験してきました。',
        'sobre-p3'           : '<strong>UEM（パラナ州立大学）</strong>で音楽を学び、それが私のセットと制作の思考方法に直接影響を与えています。私のサウンドでは、エレクトロニカに加えてポップとラップの要素も融合させていますが、すべて<em>極めてヘビーなminimal bass</em>スタイルでフィルタリングし、フロアへの圧力を保ちながらエッセンスを失いません。',
        'sobre-p4'           : '私の最大の夢は、オーディエンスが求めるものを届けるだけでなく、誰も行ったことのない場所へ皆を連れて行くことです。',
        'lugares-tag'        : 'ステージ実績',
        'lugares-title'      : '演奏した<br><span class="text-glow">場所</span>',
        'dl-tag'             : 'プレス素材',
        'dl-title'           : '高画質<span class="text-glow">フォト素材</span>',
        'dl-desc'            : '個別またはフルパッケージを画質を損なわずにダウンロード。',
        'dl-cta'             : 'すべての写真をダウンロード（.zip）',
        'dl-btn'             : 'ダウンロード',
        'dl-tab-photos'      : '写真',
        'dl-tab-logo'        : 'ロゴ',
        'dl-logo-tag'        : '公式ロゴ',
        'dl-logo-title'      : 'ブッカーとメディア向け公式ロゴ',
        'dl-logo-desc'       : 'フライヤー、ラインナップ、告知素材に使える公式ロゴを写真と分けてダウンロード。',
        'dl-logo-btn'        : 'ロゴをダウンロード (.png)',
        'fs-tag': '注目',
        'fs-new': '新着セット',
        'fs-title1': 'DJコンテスト',
        'fs-subtitle': 'Minimal Bass &middot; 2026',
        'fs-desc': 'ブラジルのMinimal BassのSixx Houseコンテスト提出セット。最初から最後までフロアを揺らす。',
        'fs-listen': 'SoundCloudで聴く',
        'music-tag'          : '聴く',
        'music-title'        : 'ミュージック &amp; <span class="text-glow">リリース</span>',
        'music-desc'         : 'プラットフォームでセットとリリースを探索',
        'tab-autorais'       : 'オリジナル楽曲',
        'sc-cta'             : 'SoundCloudですべて見る',
        'spotify-cta'        : 'Spotifyでディスコグラフィーを見る',
        'platforms-label'    : 'その他のプラットフォームでも配信中',
        'booking-tag'        : 'コンタクト',
        'booking-title'      : '限界を<br><span class="text-glow">超える準備はできていますか？</span>',
        'booking-desc'       : 'クラブ、イベント、フェスティバルへの出演受付中。<br>お問い合わせください。一緒に忘れられない体験を。',
        'available-private'  : 'プライベートイベント',
        'footer-tagline'     : '生のエネルギー。フロアの圧力。<br>妥協のないサウンド。',
        'footer-nav-heading' : 'ナビゲーション',
        'footer-sobre'       : 'プロフィール',
        'footer-musicas'     : 'ミュージック',
        'footer-social-heading': 'ソーシャルメディア',
        'footer-copy'        : '© 2026 LEVORATO. 無断複製禁止。',
        'footer-credit-text' : 'ウェブサイト制作',
    },
};

// Maps lang code → [flag class, short code]
const langMeta = {
    pt: ['fi-br', 'PT'],
    en: ['fi-us', 'EN'],
    es: ['fi-es', 'ES'],
    zh: ['fi-cn', '中文'],
    de: ['fi-de', 'DE'],
    ja: ['fi-jp', 'JP'],
};

function applyLang(lang) {
    const t = i18n[lang];
    if (!t) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const val = t[key];
        if (val === undefined) return;
        if (/<[^>]+>/.test(val)) {
            el.innerHTML = val;
        } else {
            el.textContent = val;
        }
    });

    // Keep data-text in sync for the CSS glitch effect
    const glitch = document.getElementById('tl-glitch');
    if (glitch) glitch.dataset.text = t['tension-now'] || glitch.dataset.text;

    // Update trigger pill display
    const meta = langMeta[lang] || ['fi-br', 'PT'];
    const triggerFlag = document.getElementById('trigger-flag');
    const triggerCode = document.getElementById('trigger-code');
    if (triggerFlag) {
        triggerFlag.className = `fi ${meta[0]} fis lang-flag`;
    }
    if (triggerCode) triggerCode.textContent = meta[1];

    // Update active option highlight in dropdown
    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.classList.toggle('lang-option--active', opt.dataset.lang === lang);
    });

    const langMap = { pt: 'pt-BR', en: 'en', es: 'es', zh: 'zh-CN', de: 'de', ja: 'ja' };
    document.documentElement.lang = langMap[lang] || lang;
    localStorage.setItem('levorato-lang', lang);
}

function initI18n() {
    const switcher = document.getElementById('lang-switcher');
    const trigger  = document.getElementById('lang-trigger');
    const dropdown = document.getElementById('lang-dropdown');
    if (!switcher || !trigger || !dropdown) return;

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = switcher.classList.toggle('open');
        trigger.setAttribute('aria-expanded', isOpen);
    });

    // Select language from dropdown
    dropdown.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', () => {
            applyLang(opt.dataset.lang);
            switcher.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        });
    });

    // Close on outside click
    document.addEventListener('click', e => {
        if (!switcher.contains(e.target)) {
            switcher.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            switcher.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }
    });

    // Apply saved language
    const saved = localStorage.getItem('levorato-lang') || 'pt';
    if (saved !== 'pt') applyLang(saved);
}

// ============================================================
// INIT
// ============================================================

function init() {
    resizeCanvas();
    buildParticles();
    tickParticles();
    onScroll();
    initDjGallery();
    initTimelineMobileCarousels();
    initTensionGlitch();
    initSpineLine();
    initTimelineReveal();
    initTensionEntry();
    initHeroParticles();
    initStreamTabs();
    initDownloadsTabs();
    initTimelineStoryTabs();
    initI18n();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
