/* ============================================================
   LEVORATO PRESS KIT — SCRIPT
   Particle system, animations, navbar, counters
   ============================================================ */

'use strict';

// ============================================================
// STAR FIELD — canvas inside .hero (confined to hero section)
// ============================================================

const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');
let particles   = [];
let shooters    = [];
let rafId;
let canvasVisible = true;

// Mouse position relative to the canvas (used by parallax + star repulsion)
let mouseCX = -9999, mouseCY = -9999;

function resizeCanvas() {
    // Size canvas to the hero section, not the whole viewport
    const hero = document.querySelector('.hero');
    if (!hero) return;
    canvas.width  = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
}

/* ---- Star particle ---- */
class Star {
    constructor() { this.init(true); }

    init(scatter) {
        // Scatter = spread across entire canvas; otherwise enter from a random edge
        if (scatter) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
        } else {
            const edge = Math.floor(Math.random() * 4); // 0 top 1 right 2 bottom 3 left
            this.x = edge === 3 ? -2
                   : edge === 1 ? canvas.width + 2
                   : Math.random() * canvas.width;
            this.y = edge === 0 ? -2
                   : edge === 2 ? canvas.height + 2
                   : Math.random() * canvas.height;
        }

        // tier: 0 tiny (60 %), 1 small (22 %), 2 medium (13 %), 3 bright (5 %)
        const r      = Math.random();
        this.tier    = r < 0.60 ? 0 : r < 0.82 ? 1 : r < 0.95 ? 2 : 3;
        const base   = [0.3, 0.7, 1.2, 2.0][this.tier];
        this.baseSize = base + Math.random() * base * 0.55;
        this.size    = this.baseSize;

        // random direction — any angle, very slow for distant feel
        const angle  = Math.random() * Math.PI * 2;
        const speed  = 0.05 + Math.random() * 0.18 + this.tier * 0.04;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        // colour: ~72 % white/silver, 28 % warm red
        const warm = Math.random() < 0.28;
        if (warm) {
            this.cr = 255; this.cg = 60 + Math.floor(Math.random()*80); this.cb = 60;
        } else {
            const v = 185 + Math.floor(Math.random() * 70);
            this.cr = v; this.cg = v; this.cb = v + Math.floor(Math.random() * 20);
        }

        // twinkle params
        this.baseAlpha  = 0.10 + Math.random() * 0.50 + this.tier * 0.10;
        this.alpha      = this.baseAlpha;
        this.twkSpd     = 0.006 + Math.random() * 0.022;
        this.twkOff     = Math.random() * Math.PI * 2;

        // bright stars: occasional direction nudge interval
        this.nudgeIn    = 180 + Math.floor(Math.random() * 300);
        this.nudgeCnt   = 0;
    }

    update(t) {
        // Occasional gentle direction change — makes movement feel organic
        this.nudgeCnt++;
        if (this.nudgeCnt >= this.nudgeIn) {
            this.nudgeCnt = 0;
            this.nudgeIn  = 180 + Math.floor(Math.random() * 300);
            const angle   = Math.random() * Math.PI * 2;
            const speed   = 0.05 + Math.random() * 0.18 + this.tier * 0.04;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around all four edges (stars re-enter from the opposite side)
        const pad = 3;
        if (this.x < -pad)                 this.x = canvas.width  + pad;
        if (this.x > canvas.width  + pad)  this.x = -pad;
        if (this.y < -pad)                 this.y = canvas.height + pad;
        if (this.y > canvas.height + pad)  this.y = -pad;

        // Twinkle
        const tw   = Math.sin(t * this.twkSpd + this.twkOff);
        this.alpha = this.baseAlpha * (0.55 + 0.45 * tw);
        this.size  = this.baseSize  * (0.82 + 0.22 * ((tw + 1) / 2));

        // Cursor repulsion — stars flee from mouse
        const dx   = this.x - mouseCX;
        const dy   = this.y - mouseCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const R    = 90; // repulsion radius
        if (dist < R && dist > 0.5) {
            const force = (1 - dist / R) * 1.4;
            this.x += (dx / dist) * force;
            this.y += (dy / dist) * force;
        }
    }

    draw() {
        const { x, y, size, alpha, cr, cg, cb } = this;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`;
        ctx.fill();

        // Cross spike only for tier 2-3
        if (this.tier >= 2 && size > 0.8) {
            const len = size * 4;
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(alpha * 0.4).toFixed(3)})`;
            ctx.lineWidth   = size * 0.3;
            ctx.beginPath();
            ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
            ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
            ctx.stroke();
        }
    }
}

/* ---- Shooting star (confined to hero canvas) ---- */
class ShootingStar {
    constructor(initialDelay) { this.reset(initialDelay); }

    reset(forceWait) {
        // Nasce no terço central do topo (20 %–80 % da largura) para cruzar o meio da tela
        this.x = canvas.width * (0.20 + Math.random() * 0.60);
        this.y = -10;

        // Tamanho variado — uns finos e rápidos, outros grossos e lentos
        const big      = Math.random() < 0.25;
        this.len       = big ? 120 + Math.random() * 100 : 50 + Math.random() * 80;
        this.speed     = big ? 4   + Math.random() * 3   : 6  + Math.random() * 8;
        this.lineWidth = big ? 2.0 + Math.random() * 1.0 : 0.9 + Math.random() * 0.7;

        // Ângulo: diagonal para baixo-direita com leve variação
        this.angle   = Math.PI / 4 + (Math.random() - 0.5) * 0.45;

        this.alpha   = 0;
        this.life    = 0;
        this.maxLife = 45 + Math.floor(Math.random() * 40);

        this.waiting = forceWait !== undefined
            ? forceWait
            : 40 + Math.floor(Math.random() * 200);

        this.warm = Math.random() < 0.35;
    }

    update() {
        if (this.waiting > 0) { this.waiting--; return; }
        this.life++;
        const p    = this.life / this.maxLife;
        this.alpha = p < 0.15 ? p / 0.15 : p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1;
        this.x    += Math.cos(this.angle) * this.speed;
        this.y    += Math.sin(this.angle) * this.speed;
        if (this.life >= this.maxLife ||
            this.x > canvas.width  + 30 ||
            this.y > canvas.height + 30) {
            this.reset();
        }
    }

    draw() {
        if (this.waiting > 0 || this.alpha <= 0) return;
        const ex  = this.x - Math.cos(this.angle) * this.len;
        const ey  = this.y - Math.sin(this.angle) * this.len;
        const grd = ctx.createLinearGradient(ex, ey, this.x, this.y);
        if (this.warm) {
            grd.addColorStop(0, 'rgba(255,80,40,0)');
            grd.addColorStop(0.6, `rgba(255,140,80,${(this.alpha * 0.5).toFixed(3)})`);
            grd.addColorStop(1, `rgba(255,220,200,${(this.alpha * 0.95).toFixed(3)})`);
        } else {
            grd.addColorStop(0, 'rgba(255,255,255,0)');
            grd.addColorStop(0.6, `rgba(220,220,255,${(this.alpha * 0.45).toFixed(3)})`);
            grd.addColorStop(1, `rgba(255,255,255,${(this.alpha * 0.95).toFixed(3)})`);
        }
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = grd;
        ctx.lineWidth   = this.lineWidth;
        ctx.stroke();

        // Ponto brilhante na ponta do meteoro
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.lineWidth * 1.4, 0, Math.PI * 2);
        ctx.fillStyle = this.warm
            ? `rgba(255,200,160,${(this.alpha * 0.9).toFixed(3)})`
            : `rgba(255,255,255,${(this.alpha * 0.9).toFixed(3)})`;
        ctx.fill();
    }
}

function buildParticles() {
    const isMobile = canvas.width < 768;

    particles = [];
    // Menos estrelas no mobile para não travar
    const density = isMobile ? 6000 : 3200;
    const cap     = isMobile ? 200  : 500;
    const count   = Math.min(cap, Math.floor((canvas.width * canvas.height) / density));
    for (let i = 0; i < count; i++) particles.push(new Star());

    // Meteoros: 10 no desktop, 5 no mobile
    const METEOR_COUNT = isMobile ? 5 : 10;
    shooters = [];
    for (let i = 0; i < METEOR_COUNT; i++) {
        shooters.push(new ShootingStar(i * 80));
    }
}

let tick = 0;
let lastFrame = 0;
// Mobile roda a 30 fps, desktop a 60 fps para economizar bateria/CPU
const TARGET_FPS  = window.innerWidth < 768 ? 30 : 60;
const FRAME_MS    = 1000 / TARGET_FPS;

function tickParticles(ts) {
    rafId = requestAnimationFrame(tickParticles);
    if (!canvasVisible) return;

    const delta = ts - lastFrame;
    if (delta < FRAME_MS - 1) return;   // pula frame para manter FPS alvo
    lastFrame = ts - (delta % FRAME_MS);

    tick++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) { p.update(tick); p.draw(); }
    for (const s of shooters)  { s.update();     s.draw(); }
}

// Pause when hero scrolls off screen
(function watchCanvasVisibility() {
    const heroSection = document.querySelector('.hero');
    if (!heroSection) return;
    const obs = new IntersectionObserver(
        entries => { canvasVisible = entries[0].isIntersecting; },
        { threshold: 0 }
    );
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

// Keep canvas sized to hero even on orientation change / dynamic content
(function watchHeroSize() {
    const hero = document.querySelector('.hero');
    if (!hero || !window.ResizeObserver) return;
    new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { resizeCanvas(); buildParticles(); }, 250);
    }).observe(hero);
})();

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

    const isMobile = window.innerWidth < 768;
    const COUNT    = isMobile ? 80 : 160;
    const frag     = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
        const el = document.createElement('span');

        // tier: 0 tiny, 1 small, 2 medium, 3 bright
        const r    = Math.random();
        const tier = r < 0.55 ? 0 : r < 0.82 ? 1 : r < 0.96 ? 2 : 3;
        const baseSize = [1, 1.8, 2.8, 4][tier];
        const size = (baseSize + Math.random() * baseSize * 0.6).toFixed(2);

        const top   = (Math.random() * 100).toFixed(2);
        const left  = (Math.random() * 100).toFixed(2);

        // twinkle: fast small, slow big
        const dur   = (tier === 0 ? (Math.random() * 2 + 1.5)
                     : tier === 3 ? (Math.random() * 5 + 4)
                     : (Math.random() * 3 + 2)).toFixed(2);
        const delay = (Math.random() * 8).toFixed(2);
        const rise  = `-${(Math.random() * 18 + 5).toFixed(0)}px`;

        // colour: ~70 % white/silver, 30 % red
        const warm  = Math.random() < 0.3;
        const color = warm
            ? ['#ff1a1a','#ff3b3b','#cc0000','#ff5555'][Math.floor(Math.random()*4)]
            : ['#ffffff','#e8e8ff','#ffd8d8','#ffe0e0'][Math.floor(Math.random()*4)];

        const baseOp = tier === 0 ? 0.25 + Math.random() * 0.35
                     : tier === 3 ? 0.65 + Math.random() * 0.35
                     : 0.35 + Math.random() * 0.45;

        // bright stars get a glow
        const glowPx = tier >= 2 ? Math.round(+size * 2.5) : tier === 1 ? Math.round(+size * 1.5) : 0;
        const glow   = glowPx > 0 ? `0 0 ${glowPx}px ${color}cc` : 'none';

        el.className = 'hp';
        el.style.cssText = [
            `width:${size}px`,
            `height:${size}px`,
            `top:${top}%`,
            `left:${left}%`,
            `background:${color}`,
            `box-shadow:${glow}`,
            `animation-duration:${dur}s`,
            `animation-delay:-${delay}s`,
            `--hp-op:${baseOp.toFixed(2)}`,
            `--hp-rise:${rise}`
        ].join(';');

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
            const panelTarget = p.getAttribute('data-tl-panel') || p.id.replace(/^tl-panel-/, '');
            const on = panelTarget === target;
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
        'nav-tocando'        : 'Ao vivo',
        'hero-desc'          : 'Sets construídos a partir da identidade musical.<br>Cada pista, uma história. Cada drop, uma experiência.',
        'hero-listen'        : 'Ouvir Agora',
        'stat-years'         : 'Anos de Música',
        'badge-pressure'     : 'Pressão de Pista',
        'tl-section-tag'     : 'A HISTÓRIA',
        'tl-section-title'   : 'Uma trajetória de <span class="text-glow">20 anos</span>',
        'tl-tab-performance' : 'Performance nos palcos',
        'tl-tab-education'   : 'Educação musical',
        'edu-01-tag'         : 'AGO 2015 — NOV 2015',
        'edu-01-title'       : 'Tok Music',
        'edu-01-role'        : 'Professor de guitarra e violão · Maringá, PR',
        'edu-01-desc'        : 'Onde comecei a ensinar: alunos em diferentes níveis, foco em aprendizado leve, prático e próximo, desenvolvendo didática e motivação desde o primeiro contato com o instrumento.',
        'edu-01-aria'        : 'Tok Music — abrir em nova aba',
        'edu-02-tag'         : 'FEV 2016 — JUL 2016',
        'edu-02-title'       : 'Universidade Estadual de Maringá',
        'edu-02-role'        : 'Projeto de extensão · Colégio de Aplicação Pedagógica (CAP)',
        'edu-02-desc'        : 'Atuação durante a graduação em Música: educação musical em ambiente escolar, com percepção, ritmo e instrumentos, alinhada à proposta pedagógica do projeto de extensão.',
        'edu-02-aria'        : 'CAP UEM — abrir em nova aba',
        'edu-03-tag'         : 'JUL 2016 — NOV 2016',
        'edu-03-title'       : 'Colégio Estadual Alberto Jackson Byington Junior',
        'edu-03-role'        : 'Professor de música · projeto de extensão · Maringá, PR',
        'edu-03-desc'        : 'Ensino de música no ambiente escolar público, adaptando conteúdo ao nível dos alunos e conectando teoria da graduação à prática em sala.',
        'edu-03-aria'        : 'Colégio Byington Junior — abrir em nova aba',
        'edu-04-tag'         : 'OUT 2016 — AGO 2018',
        'edu-04-title'       : 'Art Musica',
        'edu-04-role'        : 'Professor freelance · guitarra, violão, baixo e cavaquinho',
        'edu-04-desc'        : 'Aulas particulares para diferentes perfis e objetivos, com ênfase na prática e no repertório, usando a teoria como suporte quando fazia sentido para cada aluno.',
        'edu-04-aria'        : 'Art Musica — abrir em nova aba',
        'edu-05-tag'         : 'JAN 2017 — NOV 2017',
        'edu-05-title'       : 'Escola Municipal Victor Beloti',
        'edu-05-role'        : 'Estágio · educação musical · part-time · Maringá, PR',
        'edu-05-desc'        : 'Estágio no ensino público com acompanhamento pedagógico: planejamento, condução de turma e desenvolvimento de percepção e ritmo com instrumentos.',
        'edu-05-aria'        : 'Escola Municipal Victor Beloti — abrir em nova aba',
        'edu-06-tag'         : 'JAN 2017 — JUL 2019',
        'edu-06-title'       : 'Colégio Estadual do Jardim Independência',
        'edu-06-role'        : 'Estágio · professor de música · part-time · Maringá, PR',
        'edu-06-desc'        : 'Estágio no último ano da graduação em Música: autonomia em sala, planejamento das aulas e acompanhamento da evolução dos alunos em educação musical escolar.',
        'edu-06-aria'        : 'Colégio Jardim Independência — abrir em nova aba',
        'edu-07-tag'         : 'FEV 2017 — NOV 2017',
        'edu-07-title'       : 'Ateliê Da Criança',
        'edu-07-role'        : 'Educação musical infantil · bebês · Maringá, PR',
        'edu-07-desc'        : 'Trabalho com primeira infância: estímulos sonoros, ritmos, movimentos e vivências lúdicas, com sensibilidade, vínculo com as famílias e abordagem fora do modelo técnico tradicional.',
        'edu-07-aria'        : 'Ateliê Da Criança — abrir em nova aba',
        'edu-08-tag'         : 'ABR 2017 — OUT 2019',
        'edu-08-title'       : 'Som Maior Música e Arte',
        'edu-08-role'        : 'Professor · guitarra, violão, baixo e cavaquinho · Maringá, PR',
        'edu-08-desc'        : 'Aulas com foco prático e adaptação ao objetivo de cada aluno — da base técnica ao repertório — reforçando versatilidade instrumental e contato com perfis diversos.',
        'edu-08-aria'        : 'Som Maior Música e Arte — abrir em nova aba',
        'edu-09-tag'         : 'JUL 2017 — SET 2020',
        'edu-09-title'       : 'Belas Artes',
        'edu-09-role'        : 'Professor de música · guitarra, violão e outros instrumentos · part-time · Maringá, PR',
        'edu-09-desc'        : 'Aulas com foco prático, adaptadas ao objetivo de cada aluno — de iniciantes a repertório e técnica mais avançados — com teoria como apoio quando fazia sentido.',
        'edu-09-aria'        : 'Belas Artes — abrir em nova aba',
        'edu-10-tag'         : 'JUN 2018 — ABR 2019',
        'edu-10-title'       : 'Projeto de assistência social',
        'edu-10-role'        : 'Professor de música · idosos · part-time · Maringá, PR',
        'edu-10-desc'        : 'Música com foco em saúde e bem-estar: coordenação motora, memória, socialização e acolhimento. Instrumentos e atividades adaptados, apresentações em grupo e protagonismo dos participantes.',
        'edu-11-tag'         : 'MAR 2020 — DEZ 2020',
        'edu-11-title'       : 'Passantes Pensantes',
        'edu-11-role'        : 'Aulas coletivas de teclado e violão · part-time · Maringá, PR',
        'edu-11-desc'        : 'Turmas em grupo: prática colaborativa, níveis diferentes na mesma turma com adaptação contínua, ritmo, harmonia e repertório de forma acessível e dinâmica.',
        'edu-11-aria'        : 'Passantes e Pensantes — abrir em nova aba',
        'edu-12-tag'         : 'NOV 2021 — AGO 2023',
        'edu-12-title'       : 'Estação da Música',
        'edu-12-role'        : 'Professor multinstrumental e teoria · part-time · Itajaí, SC',
        'edu-12-desc'        : 'Guitarra, piano, violão, cavaquinho, pandeiro, percussão, teclado, contrabaixo e teoria musical para várias idades e níveis — técnica, repertório, percepção e ritmo com didática clara.',
        'edu-12-aria'        : 'Estação da Música — abrir em nova aba',
        'edu-13-tag'         : 'JUN 2022 — DEZ 2022',
        'edu-13-title'       : 'Centro Musicall',
        'edu-13-role'        : 'Professor multinstrumental e teoria · part-time · Balneário Camboriú, SC',
        'edu-13-desc'        : 'Ensino multinstrumental e teoria: prática equilibrada com fundamentos teóricos, técnica, interpretação e adaptação a cada objetivo.',
        'edu-13-aria'        : 'Centro Musicall — abrir em nova aba',
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
        'sobre-p1'           : 'Fala galera, beleza?<br><br>Sou o Pedro (Levorato), DJ de Minimal Bass.',
        'sobre-p2'           : 'Minha relação com a música vai muito além da pista. São mais de 15 anos respirando música, não só tocando, mas ensinando, estudando e ajudando outras pessoas a se conectarem com ela. Já atuei como professor, músico e em diferentes projetos, e tudo isso molda diretamente a forma como eu me expresso hoje.',
        'sobre-p3'           : 'Acredito que música é, antes de tudo, sentimento e troca. Por isso, cada vez que eu subo pra tocar, não é só sobre som, é sobre criar uma conexão real com quem tá ali, entender o momento e transformar aquilo em experiência.',
        'sobre-p4'           : 'Minha formação em música pela <strong>Universidade Estadual de Maringá</strong> trouxe uma base forte, mas é na vivência que meu som ganha verdade.',
        'sobre-p5'           : 'Meu maior sonho é não entregar apenas o que o público quer, mas levar todo mundo para um lugar onde ninguém esteve antes.',
        'lugares-tag'        : 'PRESENÇA DE PALCO',
        'lugares-title'      : 'Lugares onde<br><span class="text-glow">já toquei</span>',
        'tocando-tag'        : 'NA PISTA',
        'tocando-title'      : 'Fotos<br><span class="text-glow">ao vivo</span>',
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
        'aether-recorded'    : 'GRAVADO',
        'aether-tag'         : 'DESTAQUE',
        'aether-title1'      : 'APRESENTAÇÃO',
        'aether-subtitle'    : 'São José - SC · 2026',
        'aether-desc'        : 'A Aether é uma label referência em Balneário Camboriú. Apresentação realizada na The Grand em Itajaí.',
        'aether-cta'         : 'Assistir no YouTube',
        'sixxvid-recorded'   : 'GRAVADO',
        'sixxvid-tag'        : 'DESTAQUE',
        'sixxvid-title1'     : 'APRESENTAÇÃO',
        'sixxvid-subtitle'   : 'Minimal Bass · 2026',
        'sixxvid-desc'       : 'Apresentação na Sixx House, uma das principais referências da cena Minimal Bass no Brasil. Pressão de pista do começo ao fim.',
        'sixxvid-cta'        : 'Assistir no YouTube',
        'aftermov-tag'       : 'AFTER MOVIE',
        'aftermov-title'     : 'Registros em <span class="text-glow">vídeo</span>',
        'aftermov-desc'      : 'Aberturas e momentos dos rolês na The Grand e na Sixx House.',
        'aftermov-grand-title': 'The Grand',
        'aftermov-grand-sub' : 'Itajaí · Aether',
        'aftermov-sixx-title': 'Sixx House',
        'aftermov-sixx-sub'  : 'Minimal Bass · abertura',
        'drops-tag'          : 'DROPS',
        'drops-title'        : 'Cortes direto da <span class="text-glow">pista</span>',
        'drops-desc'         : 'Shorts do set — dá play e navega com as setas.',
        'drops-prev-aria'    : 'Shorts anteriores',
        'drops-next-aria'    : 'Próximos shorts',
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
        'nav-tocando'        : 'Live',
        'hero-desc'          : 'Sets built from musical identity.<br>Every track, a story. Every drop, an experience.',
        'hero-listen'        : 'Listen Now',
        'stat-years'         : 'Years of Music',
        'badge-pressure'     : 'Floor Pressure',
        'tl-section-tag'     : 'THE STORY',
        'tl-section-title'   : 'A journey of <span class="text-glow">20 years</span>',
        'tl-tab-performance' : 'Stage performance',
        'tl-tab-education'   : 'Music education',
        'edu-01-tag'         : 'AUG 2015 — NOV 2015',
        'edu-01-title'       : 'Tok Music',
        'edu-01-role'        : 'Guitar & acoustic guitar teacher · Maringá, PR',
        'edu-01-desc'        : 'Where I started teaching: students at different levels, with a light, hands-on, close approach, building pedagogy and motivation from the first contact with the instrument.',
        'edu-01-aria'        : 'Tok Music — open in new tab',
        'edu-02-tag'         : 'FEB 2016 — JUL 2016',
        'edu-02-title'       : 'Universidade Estadual de Maringá',
        'edu-02-role'        : 'Extension project · Colégio de Aplicação Pedagógica (CAP)',
        'edu-02-desc'        : 'Work during my Music degree: music education in a school setting — perception, rhythm and instruments — aligned with the extension project’s pedagogy.',
        'edu-02-aria'        : 'CAP UEM — open in new tab',
        'edu-03-tag'         : 'JUL 2016 — NOV 2016',
        'edu-03-title'       : 'Alberto Jackson Byington Junior State School',
        'edu-03-role'        : 'Music teacher · extension project · Maringá, PR',
        'edu-03-desc'        : 'Music teaching in public schools, adapting content to students’ levels and connecting degree theory with classroom practice.',
        'edu-03-aria'        : 'Byington Junior school — open in new tab',
        'edu-04-tag'         : 'OCT 2016 — AUG 2018',
        'edu-04-title'       : 'Art Musica',
        'edu-04-role'        : 'Freelance teacher · guitar, acoustic bass & cavaquinho',
        'edu-04-desc'        : 'Private lessons for different goals and profiles, emphasis on practice and repertoire, using theory as support when it made sense for each student.',
        'edu-04-aria'        : 'Art Musica — open in new tab',
        'edu-05-tag'         : 'JAN 2017 — NOV 2017',
        'edu-05-title'       : 'Victor Beloti Municipal School',
        'edu-05-role'        : 'Internship · music education · part-time · Maringá, PR',
        'edu-05-desc'        : 'Public-school internship with pedagogical mentoring: planning, leading classes, and building perception and rhythm with instruments.',
        'edu-05-aria'        : 'Victor Beloti school — open in new tab',
        'edu-06-tag'         : 'JAN 2017 — JUL 2019',
        'edu-06-title'       : 'Jardim Independência State School',
        'edu-06-role'        : 'Internship · music teacher · part-time · Maringá, PR',
        'edu-06-desc'        : 'Final-year Music degree internship: autonomy in the classroom, lesson planning, and tracking students’ progress in school music education.',
        'edu-06-aria'        : 'Jardim Independência school — open in new tab',
        'edu-07-tag'         : 'FEB 2017 — NOV 2017',
        'edu-07-title'       : 'Ateliê Da Criança',
        'edu-07-role'        : 'Early childhood music education · babies · Maringá, PR',
        'edu-07-desc'        : 'Work with infants: sound stimuli, rhythm, movement and playful experiences, with sensitivity, family connection, and a non-traditional technical approach.',
        'edu-07-aria'        : 'Ateliê Da Criança — open in new tab',
        'edu-08-tag'         : 'APR 2017 — OCT 2019',
        'edu-08-title'       : 'Som Maior Música e Arte',
        'edu-08-role'        : 'Teacher · guitar, acoustic bass & cavaquinho · Maringá, PR',
        'edu-08-desc'        : 'Lessons focused on practice and each student’s goals — from technique to repertoire — building versatility and diverse audiences.',
        'edu-08-aria'        : 'Som Maior Música e Arte — open in new tab',
        'edu-09-tag'         : 'JUL 2017 — SEP 2020',
        'edu-09-title'       : 'Belas Artes',
        'edu-09-role'        : 'Music teacher · guitar, acoustic & other instruments · part-time · Maringá, PR',
        'edu-09-desc'        : 'Practice-focused lessons tailored to each student — from beginners to advanced repertoire and technique — with theory as support when needed.',
        'edu-09-aria'        : 'Belas Artes — open in new tab',
        'edu-10-tag'         : 'JUN 2018 — APR 2019',
        'edu-10-title'       : 'Social outreach project',
        'edu-10-role'        : 'Music teacher · seniors · part-time · Maringá, PR',
        'edu-10-desc'        : 'Music for health and wellbeing: motor coordination, memory, social connection and care. Adapted instruments and activities, group performances and participant agency.',
        'edu-11-tag'         : 'MAR 2020 — DEC 2020',
        'edu-11-title'       : 'Passantes Pensantes',
        'edu-11-role'        : 'Group keyboard & guitar classes · part-time · Maringá, PR',
        'edu-11-desc'        : 'Group classes: collaborative practice, mixed levels in one room with ongoing adaptation, rhythm, harmony and repertoire in an accessible, dynamic way.',
        'edu-11-aria'        : 'Passantes e Pensantes — open in new tab',
        'edu-12-tag'         : 'NOV 2021 — AUG 2023',
        'edu-12-title'       : 'Estação da Música',
        'edu-12-role'        : 'Multi-instrument & theory teacher · part-time · Itajaí, SC',
        'edu-12-desc'        : 'Guitar, piano, acoustic, cavaquinho, pandeiro, percussion, keys, bass and theory for different ages and levels — technique, repertoire, ear training and rhythm with clear teaching.',
        'edu-12-aria'        : 'Estação da Música — open in new tab',
        'edu-13-tag'         : 'JUN 2022 — DEC 2022',
        'edu-13-title'       : 'Centro Musicall',
        'edu-13-role'        : 'Multi-instrument & theory teacher · part-time · Balneário Camboriú, SC',
        'edu-13-desc'        : 'Multi-instrument and theory: balanced practice with fundamentals, technique, interpretation and goals tailored to each student.',
        'edu-13-aria'        : 'Centro Musicall — open in new tab',
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
        'sobre-p1'           : 'Hey everyone, how\'s it going?<br><br>I\'m Pedro (Levorato), a Minimal Bass DJ.',
        'sobre-p2'           : 'My relationship with music goes far beyond the dance floor. It\'s been more than 15 years breathing music — not only playing, but teaching, studying and helping others connect with it. I\'ve worked as a teacher, musician and on different projects, and all of that directly shapes how I express myself today.',
        'sobre-p3'           : 'I believe music is, first and foremost, feeling and exchange. So every time I step up to play, it\'s not just about sound — it\'s about creating a real connection with whoever\'s there, understanding the moment and turning it into an experience.',
        'sobre-p4'           : 'My music training at <strong>Universidade Estadual de Maringá</strong> gave me a strong foundation, but it\'s lived experience that gives my sound its truth.',
        'sobre-p5'           : 'My biggest dream is not just to deliver what the crowd wants, but to take everyone to a place where no one has ever been before.',
        'lugares-tag'        : 'STAGE PRESENCE',
        'lugares-title'      : 'Places where<br><span class="text-glow">I\'ve played</span>',
        'tocando-tag'        : 'ON STAGE',
        'tocando-title'      : 'Live<br><span class="text-glow">photos</span>',
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
        'aether-recorded'    : 'RECORDED',
        'aether-tag'         : 'FEATURED',
        'aether-title1'      : 'PERFORMANCE',
        'aether-subtitle'    : 'São José - SC · 2026',
        'aether-desc'        : 'Aether is a reference label in Balneário Camboriú. Live set at The Grand in Itajaí.',
        'aether-cta'         : 'Watch on YouTube',
        'sixxvid-recorded'   : 'RECORDED',
        'sixxvid-tag'        : 'FEATURED',
        'sixxvid-title1'     : 'PERFORMANCE',
        'sixxvid-subtitle'   : 'Minimal Bass · 2026',
        'sixxvid-desc'       : 'Performance at Sixx House, a key reference for the Minimal Bass scene in Brazil. Floor pressure from start to finish.',
        'sixxvid-cta'        : 'Watch on YouTube',
        'aftermov-tag'       : 'AFTER MOVIE',
        'aftermov-title'     : 'Video <span class="text-glow">highlights</span>',
        'aftermov-desc'      : 'Openings and moments from The Grand and Sixx House.',
        'aftermov-grand-title': 'The Grand',
        'aftermov-grand-sub' : 'Itajaí · Aether',
        'aftermov-sixx-title': 'Sixx House',
        'aftermov-sixx-sub'  : 'Minimal Bass · opening',
        'drops-tag'          : 'DROPS',
        'drops-title'        : 'Cuts straight from the <span class="text-glow">floor</span>',
        'drops-desc'         : 'Set shorts — press play and use the arrows to browse.',
        'drops-prev-aria'    : 'Previous shorts',
        'drops-next-aria'    : 'Next shorts',
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
        'nav-tocando'        : 'En vivo',
        'hero-desc'          : 'Sets construidos desde la identidad musical.<br>Cada pista, una historia. Cada drop, una experiencia.',
        'hero-listen'        : 'Escuchar Ahora',
        'stat-years'         : 'Años de Música',
        'badge-pressure'     : 'Presión de Pista',
        'tl-section-tag'     : 'LA HISTORIA',
        'tl-section-title'   : 'Un viaje de <span class="text-glow">20 años</span>',
        'tl-tab-performance' : 'Actuación en escena',
        'tl-tab-education'   : 'Educación musical',
        'edu-01-tag'         : 'AGO 2015 — NOV 2015',
        'edu-01-title'       : 'Tok Music',
        'edu-01-role'        : 'Profesor de guitarra y guitarra acústica · Maringá, PR',
        'edu-01-desc'        : 'Donde empecé a enseñar: alumnos de distintos niveles, enfoque ligero, práctico y cercano, desarrollando didáctica y motivación desde el primer contacto con el instrumento.',
        'edu-01-aria'        : 'Tok Music — abrir en nueva pestaña',
        'edu-02-tag'         : 'FEB 2016 — JUL 2016',
        'edu-02-title'       : 'Universidade Estadual de Maringá',
        'edu-02-role'        : 'Proyecto de extensión · Colégio de Aplicação Pedagógica (CAP)',
        'edu-02-desc'        : 'Actuación durante la licenciatura en Música: educación musical en contexto escolar, con percepción, ritmo e instrumentos, alineada con la propuesta del proyecto de extensión.',
        'edu-02-aria'        : 'CAP UEM — abrir en nueva pestaña',
        'edu-03-tag'         : 'JUL 2016 — NOV 2016',
        'edu-03-title'       : 'Colégio Estadual Alberto Jackson Byington Junior',
        'edu-03-role'        : 'Profesor de música · proyecto de extensión · Maringá, PR',
        'edu-03-desc'        : 'Enseñanza de música en escuela pública, adaptando contenidos al nivel del alumnado y conectando la teoría de la carrera con la práctica en sala.',
        'edu-03-aria'        : 'Colégio Byington Junior — abrir en nueva pestaña',
        'edu-04-tag'         : 'OCT 2016 — AGO 2018',
        'edu-04-title'       : 'Art Musica',
        'edu-04-role'        : 'Profesor freelance · guitarra, guitarra acústica, bajo y cavaquinho',
        'edu-04-desc'        : 'Clases particulares para distintos perfiles y objetivos, con énfasis en práctica y repertorio, usando la teoría como apoyo cuando tenía sentido para cada alumno.',
        'edu-04-aria'        : 'Art Musica — abrir en nueva pestaña',
        'edu-05-tag'         : 'ENE 2017 — NOV 2017',
        'edu-05-title'       : 'Escuela Municipal Victor Beloti',
        'edu-05-role'        : 'Prácticas · educación musical · tiempo parcial · Maringá, PR',
        'edu-05-desc'        : 'Prácticas en enseñanza pública con acompañamiento pedagógico: planificación, conducción de grupo y desarrollo de percepción y ritmo con instrumentos.',
        'edu-05-aria'        : 'Escuela Municipal Victor Beloti — abrir en nueva pestaña',
        'edu-06-tag'         : 'ENE 2017 — JUL 2019',
        'edu-06-title'       : 'Colégio Estadual do Jardim Independência',
        'edu-06-role'        : 'Prácticas · profesor de música · tiempo parcial · Maringá, PR',
        'edu-06-desc'        : 'Prácticas en el último año de la licenciatura en Música: autonomía en sala, planificación de clases y seguimiento del alumnado en educación musical escolar.',
        'edu-06-aria'        : 'Colégio Jardim Independência — abrir en nueva pestaña',
        'edu-07-tag'         : 'FEB 2017 — NOV 2017',
        'edu-07-title'       : 'Ateliê Da Criança',
        'edu-07-role'        : 'Educación musical infantil · bebés · Maringá, PR',
        'edu-07-desc'        : 'Trabajo con primera infancia: estímulos sonoros, ritmos, movimientos y vivencias lúdicas, con sensibilidad, vínculo con las familias y enfoque fuera del modelo técnico tradicional.',
        'edu-07-aria'        : 'Ateliê Da Criança — abrir en nueva pestaña',
        'edu-08-tag'         : 'ABR 2017 — OCT 2019',
        'edu-08-title'       : 'Som Maior Música e Arte',
        'edu-08-role'        : 'Profesor · guitarra, guitarra acústica, bajo y cavaquinho · Maringá, PR',
        'edu-08-desc'        : 'Clases con enfoque práctico y adaptación al objetivo de cada alumno — de la base técnica al repertorio — reforzando versatilidad instrumental y perfiles diversos.',
        'edu-08-aria'        : 'Som Maior Música e Arte — abrir en nueva pestaña',
        'edu-09-tag'         : 'JUL 2017 — SEP 2020',
        'edu-09-title'       : 'Belas Artes',
        'edu-09-role'        : 'Profesor de música · guitarra, guitarra acústica y otros instrumentos · tiempo parcial · Maringá, PR',
        'edu-09-desc'        : 'Clases prácticas adaptadas al objetivo de cada alumno — de principiantes a repertorio y técnica avanzados — con teoría como apoyo cuando tenía sentido.',
        'edu-09-aria'        : 'Belas Artes — abrir en nueva pestaña',
        'edu-10-tag'         : 'JUN 2018 — ABR 2019',
        'edu-10-title'       : 'Proyecto de asistencia social',
        'edu-10-role'        : 'Profesor de música · personas mayores · tiempo parcial · Maringá, PR',
        'edu-10-desc'        : 'Música centrada en salud y bienestar: coordinación motriz, memoria, socialización y acogida. Instrumentos y actividades adaptados, presentaciones en grupo y protagonismo de los participantes.',
        'edu-11-tag'         : 'MAR 2020 — DIC 2020',
        'edu-11-title'       : 'Passantes Pensantes',
        'edu-11-role'        : 'Clases colectivas de teclado y guitarra · tiempo parcial · Maringá, PR',
        'edu-11-desc'        : 'Grupos: práctica colaborativa, distintos niveles en la misma clase con adaptación continua, ritmo, armonía y repertorio de forma accesible y dinámica.',
        'edu-11-aria'        : 'Passantes e Pensantes — abrir en nueva pestaña',
        'edu-12-tag'         : 'NOV 2021 — AGO 2023',
        'edu-12-title'       : 'Estação da Música',
        'edu-12-role'        : 'Profesor de multiinstrumento y teoría · tiempo parcial · Itajaí, SC',
        'edu-12-desc'        : 'Guitarra, piano, guitarra acústica, cavaquinho, pandeiro, percusión, teclado, bajo y teoría musical para todas las edades y niveles — técnica, repertorio, percepción y ritmo con didáctica clara.',
        'edu-12-aria'        : 'Estação da Música — abrir en nueva pestaña',
        'edu-13-tag'         : 'JUN 2022 — DIC 2022',
        'edu-13-title'       : 'Centro Musicall',
        'edu-13-role'        : 'Profesor de multiinstrumento y teoría · tiempo parcial · Balneário Camboriú, SC',
        'edu-13-desc'        : 'Enseñanza multiinstrumental y teoría: práctica equilibrada con fundamentos teóricos, técnica, interpretación y adaptación a cada objetivo.',
        'edu-13-aria'        : 'Centro Musicall — abrir en nueva pestaña',
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
        'sobre-p1'           : '¡Hola a todos! ¿Qué tal?<br><br>Soy Pedro (Levorato), DJ de Minimal Bass.',
        'sobre-p2'           : 'Mi relación con la música va mucho más allá de la pista. Son más de 15 años respirando música: no solo tocando, sino enseñando, estudiando y ayudando a otras personas a conectar con ella. He sido profesor, músico y he estado en distintos proyectos, y todo eso moldea directamente cómo me expreso hoy.',
        'sobre-p3'           : 'Creo que la música es, ante todo, sentimiento e intercambio. Por eso, cada vez que subo a tocar, no se trata solo de sonido: se trata de crear una conexión real con quien está ahí, entender el momento y transformarlo en experiencia.',
        'sobre-p4'           : 'Mi formación en música en la <strong>Universidade Estadual de Maringá</strong> me dio una base sólida, pero es en la vivencia donde mi sonido cobra verdad.',
        'sobre-p5'           : 'Mi mayor sueño no es solo entregar lo que el público quiere, sino llevar a todos a un lugar donde nadie ha estado antes.',
        'lugares-tag'        : 'PRESENCIA EN ESCENARIO',
        'lugares-title'      : 'Lugares donde<br><span class="text-glow">he tocado</span>',
        'tocando-tag'        : 'EN CABINA',
        'tocando-title'      : 'Fotos<br><span class="text-glow">en vivo</span>',
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
        'aether-recorded'    : 'GRABADO',
        'aether-tag'         : 'DESTACADO',
        'aether-title1'      : 'PRESENTACIÓN',
        'aether-subtitle'    : 'São José - SC · 2026',
        'aether-desc'        : 'Aether es una label de referencia en Balneário Camboriú. Presentación en The Grand, Itajaí.',
        'aether-cta'         : 'Ver en YouTube',
        'sixxvid-recorded'   : 'GRABADO',
        'sixxvid-tag'        : 'DESTACADO',
        'sixxvid-title1'     : 'PRESENTACIÓN',
        'sixxvid-subtitle'   : 'Minimal Bass · 2026',
        'sixxvid-desc'       : 'Presentación en Sixx House, una de las principales referencias del Minimal Bass en Brasil. Presión de pista de principio a fin.',
        'sixxvid-cta'        : 'Ver en YouTube',
        'aftermov-tag'       : 'AFTER MOVIE',
        'aftermov-title'     : 'Registros en <span class="text-glow">vídeo</span>',
        'aftermov-desc'      : 'Aperturas y momentos en The Grand y Sixx House.',
        'aftermov-grand-title': 'The Grand',
        'aftermov-grand-sub' : 'Itajaí · Aether',
        'aftermov-sixx-title': 'Sixx House',
        'aftermov-sixx-sub'  : 'Minimal Bass · apertura',
        'drops-tag'          : 'DROPS',
        'drops-title'        : 'Cortes directos de la <span class="text-glow">pista</span>',
        'drops-desc'         : 'Shorts del set — reproduce y navega con las flechas.',
        'drops-prev-aria'    : 'Shorts anteriores',
        'drops-next-aria'    : 'Shorts siguientes',
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
        'nav-tocando'        : '现场',
        'hero-desc'          : '从音乐身份构建的曲目集。<br>每首曲目，一个故事。每次降拍，一次体验。',
        'hero-listen'        : '立即收听',
        'stat-years'         : '音乐生涯年数',
        'badge-pressure'     : '舞台张力',
        'tl-section-tag'     : '历程',
        'tl-section-title'   : '20年的<span class="text-glow">旅程</span>',
        'tl-tab-performance' : '舞台演出',
        'tl-tab-education'   : '音乐教育',
        'edu-01-tag'         : '2015年8月 — 2015年11月',
        'edu-01-title'       : 'Tok Music',
        'edu-01-role'        : '吉他教师 · 马林加，巴拉那州',
        'edu-01-desc'        : '我开始教学的地方：不同水平的学员，轻松、务实、贴近的教学方式，从第一次接触乐器就培养教学法与动力。',
        'edu-01-aria'        : 'Tok Music — 在新标签页打开',
        'edu-02-tag'         : '2016年2月 — 2016年7月',
        'edu-02-title'       : '马林加州立大学（Universidade Estadual de Maringá）',
        'edu-02-role'        : '推广项目 · 教育应用学校（CAP）',
        'edu-02-desc'        : '音乐本科期间：学校环境下的音乐教育，包括听觉、节奏与乐器，与推广项目的教学理念一致。',
        'edu-02-aria'        : 'CAP UEM — 在新标签页打开',
        'edu-03-tag'         : '2016年7月 — 2016年11月',
        'edu-03-title'       : 'Alberto Jackson Byington Junior 州立中学',
        'edu-03-role'        : '音乐教师 · 推广项目 · 马林加，巴拉那州',
        'edu-03-desc'        : '公立学校音乐教学，根据学生程度调整内容，将本科理论联系课堂实践。',
        'edu-03-aria'        : 'Byington Junior 学校 — 在新标签页打开',
        'edu-04-tag'         : '2016年10月 — 2018年8月',
        'edu-04-title'       : 'Art Musica',
        'edu-04-role'        : '自由教师 · 吉他、木吉他、贝斯与卡瓦奎尼奥',
        'edu-04-desc'        : '针对不同目标与学员的一对一课程，强调实践与曲目，必要时辅以理论。',
        'edu-04-aria'        : 'Art Musica — 在新标签页打开',
        'edu-05-tag'         : '2017年1月 — 2017年11月',
        'edu-05-title'       : 'Victor Beloti 市立学校',
        'edu-05-role'        : '实习 · 音乐教育 · 兼职 · 马林加，巴拉那州',
        'edu-05-desc'        : '公立学校实习，带教学辅导：备课、课堂组织与用乐器培养听觉与节奏。',
        'edu-05-aria'        : 'Victor Beloti 学校 — 在新标签页打开',
        'edu-06-tag'         : '2017年1月 — 2019年7月',
        'edu-06-title'       : 'Jardim Independência 州立中学',
        'edu-06-role'        : '实习 · 音乐教师 · 兼职 · 马林加，巴拉那州',
        'edu-06-desc'        : '音乐本科最后一年实习：课堂自主、课程规划与跟踪学生在校音乐教育中的进展。',
        'edu-06-aria'        : 'Jardim Independência 学校 — 在新标签页打开',
        'edu-07-tag'         : '2017年2月 — 2017年11月',
        'edu-07-title'       : 'Ateliê Da Criança',
        'edu-07-role'        : '幼儿音乐教育 · 婴儿 · 马林加，巴拉那州',
        'edu-07-desc'        : '面向婴幼儿：声音刺激、节奏、动作与游戏化体验，注重家庭连结与非传统技术路线。',
        'edu-07-aria'        : 'Ateliê Da Criança — 在新标签页打开',
        'edu-08-tag'         : '2017年4月 — 2019年10月',
        'edu-08-title'       : 'Som Maior Música e Arte',
        'edu-08-role'        : '教师 · 吉他、木吉他、贝斯与卡瓦奎尼奥 · 马林加，巴拉那州',
        'edu-08-desc'        : '以实践为目标、因人而异的课程——从基础技术到曲目——培养多面手与多样学员。',
        'edu-08-aria'        : 'Som Maior Música e Arte — 在新标签页打开',
        'edu-09-tag'         : '2017年7月 — 2020年9月',
        'edu-09-title'       : 'Belas Artes',
        'edu-09-role'        : '音乐教师 · 吉他、木吉他及其他乐器 · 兼职 · 马林加，巴拉那州',
        'edu-09-desc'        : '注重实践的课程，按目标调整——从初学者到进阶曲目与技术——需要时辅以理论。',
        'edu-09-aria'        : 'Belas Artes — 在新标签页打开',
        'edu-10-tag'         : '2018年6月 — 2019年4月',
        'edu-10-title'       : '社会援助项目',
        'edu-10-role'        : '音乐教师 · 长者 · 兼职 · 马林加，巴拉那州',
        'edu-10-desc'        : '以健康与福祉为重的音乐：运动协调、记忆、社交与关怀。适配的乐器与活动、小组演出与参与者主体性。',
        'edu-11-tag'         : '2020年3月 — 2020年12月',
        'edu-11-title'       : 'Passantes Pensantes',
        'edu-11-role'        : '键盘与吉他集体课 · 兼职 · 马林加，巴拉那州',
        'edu-11-desc'        : '小组课：协作练习、同班混龄与持续调整，节奏、和声与曲目，轻松而有活力。',
        'edu-11-aria'        : 'Passantes e Pensantes — 在新标签页打开',
        'edu-12-tag'         : '2021年11月 — 2023年8月',
        'edu-12-title'       : 'Estação da Música',
        'edu-12-role'        : '多乐器与乐理教师 · 兼职 · 伊塔雅伊，圣卡塔琳娜州',
        'edu-12-desc'        : '吉他、钢琴、木吉他、卡瓦奎尼奥、铃鼓、打击、键盘、低音与乐理，面向不同年龄与水平——技术、曲目、听觉与节奏，教学清晰。',
        'edu-12-aria'        : 'Estação da Música — 在新标签页打开',
        'edu-13-tag'         : '2022年6月 — 2022年12月',
        'edu-13-title'       : 'Centro Musicall',
        'edu-13-role'        : '多乐器与乐理教师 · 兼职 · 巴尔内阿里奥坎博里乌，圣卡塔琳娜州',
        'edu-13-desc'        : '多乐器与乐理：实践与基础理论平衡，技术、诠释与目标因人而异。',
        'edu-13-aria'        : 'Centro Musicall — 在新标签页打开',
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
        'sobre-p1'           : '大家好！最近怎么样？<br><br>我是Pedro（Levorato），Minimal Bass DJ。',
        'sobre-p2'           : '我与音乐的关系远不止舞池。十五多年来我一直与音乐相伴——不仅是演奏，还有教学、学习，并帮助他人与音乐建立连结。我当过教师、乐手，也参与过不同项目，这些都直接塑造了我今天的表达方式。',
        'sobre-p3'           : '我相信音乐首先是情感与交流。因此每次上台，不只是声音——更是与在场的人建立真实的连结，理解当下，把它变成体验。',
        'sobre-p4'           : '在<strong>马林加州立大学（Universidade Estadual de Maringá）</strong>的音乐学习为我打下了扎实基础，但真正让我的声音有说服力的，是生活里的历练。',
        'sobre-p5'           : '我最大的梦想不只是提供观众想要的，而是带所有人去一个从未有人到过的地方。',
        'lugares-tag'        : '舞台足迹',
        'lugares-title'      : '我曾<br><span class="text-glow">演出的地方</span>',
        'tocando-tag'        : '现场演出',
        'tocando-title'      : '演出<br><span class="text-glow">照片</span>',
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
        'aether-recorded'    : '现场录制',
        'aether-tag'         : '精选',
        'aether-title1'      : '现场演出',
        'aether-subtitle'    : 'São José - SC · 2026',
        'aether-desc'        : 'Aether 是 Balneário Camboriú 的标杆厂牌。演出于 Itajaí 的 The Grand。',
        'aether-cta'         : '在 YouTube 观看',
        'sixxvid-recorded'   : '现场录制',
        'sixxvid-tag'        : '精选',
        'sixxvid-title1'     : '现场演出',
        'sixxvid-subtitle'   : 'Minimal Bass · 2026',
        'sixxvid-desc'       : '在 Sixx House 的现场演出，巴西 Minimal Bass 场景的重要标杆之一。从头到尾的舞池张力。',
        'sixxvid-cta'        : '在 YouTube 观看',
        'aftermov-tag'       : '现场短片',
        'aftermov-title'     : '<span class="text-glow">视频</span>记录',
        'aftermov-desc'      : 'The Grand 与 Sixx House 的开场与现场瞬间。',
        'aftermov-grand-title': 'The Grand',
        'aftermov-grand-sub' : 'Itajaí · Aether',
        'aftermov-sixx-title': 'Sixx House',
        'aftermov-sixx-sub'  : 'Minimal Bass · 开场',
        'drops-tag'          : 'DROPS',
        'drops-title'        : '舞池<span class="text-glow">直拍</span>片段',
        'drops-desc'         : 'Set 短视频 — 点击播放，用箭头浏览。',
        'drops-prev-aria'    : '上一个短片',
        'drops-next-aria'    : '下一个短片',
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
        'nav-tocando'        : 'Live',
        'hero-desc'          : 'Sets aufgebaut aus musikalischer Identität.<br>Jeder Track, eine Geschichte. Jeder Drop, ein Erlebnis.',
        'hero-listen'        : 'Jetzt hören',
        'stat-years'         : 'Jahre Musik',
        'badge-pressure'     : 'Floor-Druck',
        'tl-section-tag'     : 'DIE GESCHICHTE',
        'tl-section-title'   : 'Eine Reise von <span class="text-glow">20 Jahren</span>',
        'tl-tab-performance' : 'Auf der Bühne',
        'tl-tab-education'   : 'Musikpädagogik',
        'edu-01-tag'         : 'AUG 2015 — NOV 2015',
        'edu-01-title'       : 'Tok Music',
        'edu-01-role'        : 'Gitarre- & Akustikgitarrenlehrer · Maringá, PR',
        'edu-01-desc'        : 'Wo ich mit dem Unterricht begann: unterschiedliche Niveaus, leichter, praxisnaher, persönlicher Ansatz, Didaktik und Motivation vom ersten Kontakt mit dem Instrument an.',
        'edu-01-aria'        : 'Tok Music — in neuem Tab öffnen',
        'edu-02-tag'         : 'FEB 2016 — JUL 2016',
        'edu-02-title'       : 'Universidade Estadual de Maringá',
        'edu-02-role'        : 'Erweiterungsprojekt · Colégio de Aplicação Pedagógica (CAP)',
        'edu-02-desc'        : 'Tätigkeit während des Musikstudiums: musikalische Bildung in der Schule — Wahrnehmung, Rhythmus und Instrumente — im Einklang mit der Projektpädagogik.',
        'edu-02-aria'        : 'CAP UEM — in neuem Tab öffnen',
        'edu-03-tag'         : 'JUL 2016 — NOV 2016',
        'edu-03-title'       : 'Staatliche Schule Alberto Jackson Byington Junior',
        'edu-03-role'        : 'Musiklehrer · Erweiterungsprojekt · Maringá, PR',
        'edu-03-desc'        : 'Musikunterricht in öffentlichen Schulen, Inhalte an das Niveau angepasst und Studientheorie mit Unterrichtspraxis verbunden.',
        'edu-03-aria'        : 'Byington Junior — in neuem Tab öffnen',
        'edu-04-tag'         : 'OKT 2016 — AUG 2018',
        'edu-04-title'       : 'Art Musica',
        'edu-04-role'        : 'Freiberuflicher Lehrer · Gitarre, Akustik, Bass & Cavaquinho',
        'edu-04-desc'        : 'Einzelunterricht für verschiedene Ziele und Profile, Schwerpunkt Praxis und Repertoire, Theorie als Stütze wenn sinnvoll.',
        'edu-04-aria'        : 'Art Musica — in neuem Tab öffnen',
        'edu-05-tag'         : 'JAN 2017 — NOV 2017',
        'edu-05-title'       : 'Gemeinschaftsschule Victor Beloti',
        'edu-05-role'        : 'Praktikum · musikalische Bildung · Teilzeit · Maringá, PR',
        'edu-05-desc'        : 'Praktikum im öffentlichen Schulsystem mit pädagogischer Begleitung: Planung, Klassenführung, Wahrnehmung und Rhythmus mit Instrumenten.',
        'edu-05-aria'        : 'Victor Beloti — in neuem Tab öffnen',
        'edu-06-tag'         : 'JAN 2017 — JUL 2019',
        'edu-06-title'       : 'Staatliche Schule Jardim Independência',
        'edu-06-role'        : 'Praktikum · Musiklehrer · Teilzeit · Maringá, PR',
        'edu-06-desc'        : 'Praktikum im letzten Studienjahr: Eigenständigkeit im Unterricht, Stundenplanung und Begleitung der Schüler in schulischer Musikerziehung.',
        'edu-06-aria'        : 'Jardim Independência — in neuem Tab öffnen',
        'edu-07-tag'         : 'FEB 2017 — NOV 2017',
        'edu-07-title'       : 'Ateliê Da Criança',
        'edu-07-role'        : 'Musik in der frühen Kindheit · Babys · Maringá, PR',
        'edu-07-desc'        : 'Arbeit mit Kleinkindern: Klänge, Rhythmus, Bewegung und Spiel, mit Sensibilität, Elternbezug und unkonventionellem Ansatz.',
        'edu-07-aria'        : 'Ateliê Da Criança — in neuem Tab öffnen',
        'edu-08-tag'         : 'APR 2017 — OKT 2019',
        'edu-08-title'       : 'Som Maior Música e Arte',
        'edu-08-role'        : 'Lehrer · Gitarre, Akustik, Bass & Cavaquinho · Maringá, PR',
        'edu-08-desc'        : 'Praxisorientierter Unterricht nach Zielen — von Technik bis Repertoire — mit vielseitigem Instrumentarium und verschiedenen Lernenden.',
        'edu-08-aria'        : 'Som Maior Música e Arte — in neuem Tab öffnen',
        'edu-09-tag'         : 'JUL 2017 — SEP 2020',
        'edu-09-title'       : 'Belas Artes',
        'edu-09-role'        : 'Musiklehrer · Gitarre, Akustik & weitere Instrumente · Teilzeit · Maringá, PR',
        'edu-09-desc'        : 'Praxisnaher Unterricht nach Ziel — von Anfängern bis fortgeschrittenem Repertoire — Theorie bei Bedarf.',
        'edu-09-aria'        : 'Belas Artes — in neuem Tab öffnen',
        'edu-10-tag'         : 'JUN 2018 — APR 2019',
        'edu-10-title'       : 'Soziales Hilfsprojekt',
        'edu-10-role'        : 'Musiklehrer · Senioren · Teilzeit · Maringá, PR',
        'edu-10-desc'        : 'Musik für Gesundheit und Wohlbefinden: Motorik, Gedächtnis, Austausch und Zuwendung. Angepasste Instrumente und Aktivitäten, Gruppenauftritte und Mitgestaltung.',
        'edu-11-tag'         : 'MÄR 2020 — DEZ 2020',
        'edu-11-title'       : 'Passantes Pensantes',
        'edu-11-role'        : 'Gruppenunterricht Keyboard & Gitarre · Teilzeit · Maringá, PR',
        'edu-11-desc'        : 'Gruppen: gemeinsames Üben, gemischte Niveaus mit laufender Anpassung, Rhythmus, Harmonie und Repertoire zugänglich und lebendig.',
        'edu-11-aria'        : 'Passantes e Pensantes — in neuem Tab öffnen',
        'edu-12-tag'         : 'NOV 2021 — AUG 2023',
        'edu-12-title'       : 'Estação da Música',
        'edu-12-role'        : 'Multi-Instrument & Theorie · Teilzeit · Itajaí, SC',
        'edu-12-desc'        : 'Gitarre, Klavier, Akustik, Cavaquinho, Pandeiro, Percussion, Keys, Bass und Theorie für alle Altersstufen — Technik, Repertoire, Gehör und Rhythmus mit klarer Didaktik.',
        'edu-12-aria'        : 'Estação da Música — in neuem Tab öffnen',
        'edu-13-tag'         : 'JUN 2022 — DEZ 2022',
        'edu-13-title'       : 'Centro Musicall',
        'edu-13-role'        : 'Multi-Instrument & Theorie · Teilzeit · Balneário Camboriú, SC',
        'edu-13-desc'        : 'Multi-Instrument und Theorie: ausgewogene Praxis mit Grundlagen, Technik, Interpretation und Zielen pro Person.',
        'edu-13-aria'        : 'Centro Musicall — in neuem Tab öffnen',
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
        'sobre-p1'           : 'Hey Leute, alles klar?<br><br>Ich bin Pedro (Levorato), Minimal Bass DJ.',
        'sobre-p2'           : 'Meine Beziehung zur Musik geht weit über die Tanzfläche hinaus. Seit über 15 Jahren „atme“ ich Musik — nicht nur beim Spielen, sondern auch beim Unterrichten, Lernen und anderen dabei helfen, sich mit ihr zu verbinden. Ich war Lehrer, Musiker und in verschiedenen Projekten aktiv — all das prägt direkt, wie ich mich heute ausdrücke.',
        'sobre-p3'           : 'Ich glaube, Musik ist vor allem Gefühl und Austausch. Jedes Mal, wenn ich auflege, geht es nicht nur um Sound, sondern um echte Verbindung mit den Leuten dort, den Moment zu verstehen und ihn in ein Erlebnis zu verwandeln.',
        'sobre-p4'           : 'Meine musikalische Ausbildung an der <strong>Universidade Estadual de Maringá</strong> hat mir ein starkes Fundament gegeben — aber in der gelebten Erfahrung gewinnt mein Sound seine Wahrheit.',
        'sobre-p5'           : 'Mein größter Traum ist nicht nur, das zu liefern, was das Publikum will, sondern alle an einen Ort zu bringen, wo noch niemand gewesen ist.',
        'lugares-tag'        : 'BÜHNENPRÄSENZ',
        'lugares-title'      : 'Orte, wo ich<br><span class="text-glow">gespielt habe</span>',
        'tocando-tag'        : 'AUF DER BÜHNE',
        'tocando-title'      : 'Live<br><span class="text-glow">Fotos</span>',
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
        'aether-recorded'    : 'AUFNAHME',
        'aether-tag'         : 'HIGHLIGHT',
        'aether-title1'      : 'LIVE-AUFTRITT',
        'aether-subtitle'    : 'São José - SC · 2026',
        'aether-desc'        : 'Aether ist ein Referenz-Label in Balneário Camboriú. Auftritt in The Grand, Itajaí.',
        'aether-cta'         : 'Auf YouTube ansehen',
        'sixxvid-recorded'   : 'AUFNAHME',
        'sixxvid-tag'        : 'HIGHLIGHT',
        'sixxvid-title1'     : 'LIVE-AUFTRITT',
        'sixxvid-subtitle'   : 'Minimal Bass · 2026',
        'sixxvid-desc'       : 'Auftritt in der Sixx House, einer der wichtigsten Adressen für Minimal Bass in Brasilien. Dancefloor-Druck von Anfang bis Ende.',
        'sixxvid-cta'        : 'Auf YouTube ansehen',
        'aftermov-tag'       : 'AFTER MOVIE',
        'aftermov-title'     : 'Momente im <span class="text-glow">Video</span>',
        'aftermov-desc'      : 'Openings und Momente bei The Grand und Sixx House.',
        'aftermov-grand-title': 'The Grand',
        'aftermov-grand-sub' : 'Itajaí · Aether',
        'aftermov-sixx-title': 'Sixx House',
        'aftermov-sixx-sub'  : 'Minimal Bass · Opening',
        'drops-tag'          : 'DROPS',
        'drops-title'        : 'Cuts direkt vom <span class="text-glow">Floor</span>',
        'drops-desc'         : 'Set-Shorts — Play drücken und mit den Pfeilen blättern.',
        'drops-prev-aria'    : 'Vorherige Shorts',
        'drops-next-aria'    : 'Nächste Shorts',
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
        'nav-tocando'        : 'ライブ',
        'hero-desc'          : '音楽的アイデンティティから構築されたセット。<br>すべてのトラックに物語がある。すべてのドロップに体験がある。',
        'hero-listen'        : '今すぐ聴く',
        'stat-years'         : '音楽歴（年）',
        'badge-pressure'     : 'フロアの圧力',
        'tl-section-tag'     : 'ヒストリー',
        'tl-section-title'   : '<span class="text-glow">20年</span>の軌跡',
        'tl-tab-performance' : 'ステージ',
        'tl-tab-education'   : '音楽教育',
        'edu-01-tag'         : '2015年8月 — 2015年11月',
        'edu-01-title'       : 'Tok Music',
        'edu-01-role'        : 'ギター講師 · マリンガ、パラナ州',
        'edu-01-desc'        : '指導を始めた場所：さまざまなレベルの生徒へ、軽やかで実践的・身近なアプローチ。最初の一音から教学法とモチベーションを育てる。',
        'edu-01-aria'        : 'Tok Music — 新しいタブで開く',
        'edu-02-tag'         : '2016年2月 — 2016年7月',
        'edu-02-title'       : 'Universidade Estadual de Maringá',
        'edu-02-role'        : '拡張プロジェクト · CAP（教育応用校）',
        'edu-02-desc'        : '音楽学士課程中の活動：学校での音楽教育（聴覚・リズム・楽器）、拡張プロジェクトの方針に沿った内容。',
        'edu-02-aria'        : 'CAP UEM — 新しいタブで開く',
        'edu-03-tag'         : '2016年7月 — 2016年11月',
        'edu-03-title'       : 'Alberto Jackson Byington Junior 州立校',
        'edu-03-role'        : '音楽教師 · 拡張プロジェクト · マリンガ、パラナ州',
        'edu-03-desc'        : '公立校での音楽指導。生徒の水準に合わせて内容を調整し、大学の理論と教室の実践をつなぐ。',
        'edu-03-aria'        : 'Byington Junior — 新しいタブで開く',
        'edu-04-tag'         : '2016年10月 — 2018年8月',
        'edu-04-title'       : 'Art Musica',
        'edu-04-role'        : 'フリーランス講師 · ギター、アコースティック、ベース、カヴァキーニョ',
        'edu-04-desc'        : '目的とプロフィールに合わせた個人レッスン。実践とレパートリーを重視し、必要に応じて理論をサポート。',
        'edu-04-aria'        : 'Art Musica — 新しいタブで開く',
        'edu-05-tag'         : '2017年1月 — 2017年11月',
        'edu-05-title'       : 'Victor Beloti 市立校',
        'edu-05-role'        : 'インターンシップ · 音楽教育 · パートタイム · マリンガ、パラナ州',
        'edu-05-desc'        : '公立校インターン（指導伴走）：計画、クラス運営、楽器を使った聴覚とリズムの育成。',
        'edu-05-aria'        : 'Victor Beloti — 新しいタブで開く',
        'edu-06-tag'         : '2017年1月 — 2019年7月',
        'edu-06-title'       : 'Jardim Independência 州立校',
        'edu-06-role'        : 'インターンシップ · 音楽教師 · パートタイム · マリンガ、パラナ州',
        'edu-06-desc'        : '音楽学士最終年のインターン：教室での自律、授業設計、学校音楽教育での生徒の成長をフォロー。',
        'edu-06-aria'        : 'Jardim Independência — 新しいタブで開く',
        'edu-07-tag'         : '2017年2月 — 2017年11月',
        'edu-07-title'       : 'Ateliê Da Criança',
        'edu-07-role'        : '幼児音楽教育 · 乳児 · マリンガ、パラナ州',
        'edu-07-desc'        : '乳幼児向け：音の刺激、リズム、動き、遊びを通した体験。家族とのつながりと、従来型の技術偏重ではないアプローチ。',
        'edu-07-aria'        : 'Ateliê Da Criança — 新しいタブで開く',
        'edu-08-tag'         : '2017年4月 — 2019年10月',
        'edu-08-title'       : 'Som Maior Música e Arte',
        'edu-08-role'        : '講師 · ギター、アコースティック、ベース、カヴァキーニョ · マリンガ、パラナ州',
        'edu-08-desc'        : '実践重視で一人ひとりの目標に合わせるレッスン — 基礎からレパートリまで — 多様な生徒との経験を重ねる。',
        'edu-08-aria'        : 'Som Maior Música e Arte — 新しいタブで開く',
        'edu-09-tag'         : '2017年7月 — 2020年9月',
        'edu-09-title'       : 'Belas Artes',
        'edu-09-role'        : '音楽講師 · ギター、アコースティック、その他楽器 · パートタイム · マリンガ、パラナ州',
        'edu-09-desc'        : '実践中心で目標に合わせたレッスン — 初級から上級の技法・レパートリまで — 必要に応じて理論を補助。',
        'edu-09-aria'        : 'Belas Artes — 新しいタブで開く',
        'edu-10-tag'         : '2018年6月 — 2019年4月',
        'edu-10-title'       : '社会支援プロジェクト',
        'edu-10-role'        : '音楽講師 · シニア · パートタイム · マリンガ、パラナ州',
        'edu-10-desc'        : '健康とウェルビーイングを意識した音楽：運動協調、記憶、交流と受け止め。楽器と活動を調整し、グループ発表と参加者の主役性。',
        'edu-11-tag'         : '2020年3月 — 2020年12月',
        'edu-11-title'       : 'Passantes Pensantes',
        'edu-11-role'        : 'キーボードとギターのグループレッスン · パートタイム · マリンガ、パラナ州',
        'edu-11-desc'        : 'グループレッスン：協働練習、混在レベルを継続的に調整、リズム・和声・レパートリをわかりやすくダイナミックに。',
        'edu-11-aria'        : 'Passantes e Pensantes — 新しいタブで開く',
        'edu-12-tag'         : '2021年11月 — 2023年8月',
        'edu-12-title'       : 'Estação da Música',
        'edu-12-role'        : '多楽器・理論講師 · パートタイム · イタジャイ、SC',
        'edu-12-desc'        : 'ギター、ピアノ、アコースティック、カヴァキーニョ、パンデイロ、打楽器、キーボード、ベースと理論。年齢・レベルに応じて技法、レパートリ、聴音とリズムを明確に指導。',
        'edu-12-aria'        : 'Estação da Música — 新しいタブで開く',
        'edu-13-tag'         : '2022年6月 — 2022年12月',
        'edu-13-title'       : 'Centro Musicall',
        'edu-13-role'        : '多楽器・理論講師 · パートタイム · バルネアリオ・カンボリウ、SC',
        'edu-13-desc'        : '多楽器と理論：実践と基礎理論のバランス、技法、解釈、一人ひとりの目標に合わせた指導。',
        'edu-13-aria'        : 'Centro Musicall — 新しいタブで開く',
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
        'sobre-p1'           : 'やあ、元気？<br><br>Pedro（Levorato）、Minimal Bass DJです。',
        'sobre-p2'           : '音楽との関係はダンスフロアだけにとどまりません。15年以上、音楽と共に生きてきました。演奏だけでなく、教え、学び、他の人が音楽とつながる手助けもしてきました。教師や演奏者として、さまざまなプロジェクトに関わってきましたが、それらすべてが、今の自分の表現を形作っています。',
        'sobre-p3'           : '音楽とは何より感情と交換だと信じています。だからプレイするたびに、音だけではなく、そこにいる人との本物のつながりをつくり、その瞬間を理解し、体験に変えることが大切です。',
        'sobre-p4'           : '<strong>Universidade Estadual de Maringá</strong>での音楽教育は強い土台をくれましたが、サウンドに真実を与えるのは日々の経験です。',
        'sobre-p5'           : '私の最大の夢は、オーディエンスが求めるものを届けるだけでなく、誰も行ったことのない場所へ皆を連れて行くことです。',
        'lugares-tag'        : 'ステージ実績',
        'lugares-title'      : '演奏した<br><span class="text-glow">場所</span>',
        'tocando-tag'        : 'ライブ演奏',
        'tocando-title'      : 'ライブ<br><span class="text-glow">フォト</span>',
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
        'aether-recorded'    : '収録',
        'aether-tag'         : '注目',
        'aether-title1'      : 'ライブ',
        'aether-subtitle'    : 'São José - SC · 2026',
        'aether-desc'        : 'Aether は Balneário Camboriú を代表するレーベル。Itajaí の The Grand にて披露。',
        'aether-cta'         : 'YouTubeで見る',
        'sixxvid-recorded'   : '収録',
        'sixxvid-tag'        : '注目',
        'sixxvid-title1'     : 'ライブ',
        'sixxvid-subtitle'   : 'Minimal Bass · 2026',
        'sixxvid-desc'       : 'Sixx House にて。ブラジル Minimal Bass を代表する会場のひとつ。最初から最後までフロアを揺らすセット。',
        'sixxvid-cta'        : 'YouTubeで見る',
        'aftermov-tag'       : 'アフタームービー',
        'aftermov-title'     : '<span class="text-glow">映像</span>で振り返る',
        'aftermov-desc'      : 'The Grand と Sixx House のオープニングと瞬間。',
        'aftermov-grand-title': 'The Grand',
        'aftermov-grand-sub' : 'Itajaí · Aether',
        'aftermov-sixx-title': 'Sixx House',
        'aftermov-sixx-sub'  : 'Minimal Bass · オープニング',
        'drops-tag'          : 'DROPS',
        'drops-title'        : 'フロアからの<span class="text-glow">切り抜き</span>',
        'drops-desc'         : 'セットのショート — 再生して矢印で移動。',
        'drops-prev-aria'    : '前のショート',
        'drops-next-aria'    : '次のショート',
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

    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        const val = key ? t[key] : undefined;
        if (val !== undefined) el.setAttribute('aria-label', val);
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
// LOADING SCREEN
// ============================================================

function initLoadingScreen() {
    const ls = document.getElementById('loading-screen');
    if (!ls) return;

    // Trava scroll enquanto loading está visível
    document.body.style.overflow = 'hidden';

    const hide = () => {
        ls.classList.add('hidden');
        // Libera scroll e remove o elemento após o fade (1s)
        ls.addEventListener('transitionend', () => {
            ls.remove();
            document.body.style.overflow = '';
        }, { once: true });
        // Typewriter começa depois que a tela de loading termina de sair
        setTimeout(initTypewriter, 1000);
    };

    // Sempre aguarda 3 s visíveis antes de fechar, independente do carregamento
    const MIN_DISPLAY = 3000;
    const t0 = Date.now();

    const scheduleHide = () => {
        const elapsed = Date.now() - t0;
        const wait    = Math.max(0, MIN_DISPLAY - elapsed);
        setTimeout(hide, wait);
    };

    if (document.readyState === 'complete') {
        scheduleHide();
    } else {
        window.addEventListener('load', scheduleHide, { once: true });
    }
}

// ============================================================
// CUSTOM CURSOR
// ============================================================

function initCustomCursor() {
    if (document.documentElement.classList.contains('touch-device')) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const dot = document.getElementById('cursor-dot');
    if (!dot) return;

    document.addEventListener('mousemove', e => {
        dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });

    document.addEventListener('mouseleave', () => dot.classList.add('hidden'));
    document.addEventListener('mouseenter', () => dot.classList.remove('hidden'));
}

// ============================================================
// PARALLAX — galaxy background follows mouse
// ============================================================

function initParallax() {
    // Movimento da galáxia agora é feito via CSS animation (galaxyOrbit)
    // Mantemos apenas o rastreamento do mouse para a repulsão das estrelas
    const hero = document.querySelector('.hero');
    if (!hero) return;

    hero.addEventListener('mousemove', e => {
        const rect = hero.getBoundingClientRect();
        mouseCX = e.clientX - rect.left;
        mouseCY = e.clientY - rect.top;
    });

    hero.addEventListener('mouseleave', () => {
        mouseCX = -9999;
        mouseCY = -9999;
    });
}

// ============================================================
// TYPEWRITER — "MINIMAL BASS"
// ============================================================

function initTypewriter() {
    const el = document.getElementById('typewriter-target');
    if (!el) return;

    const text   = el.dataset.text || 'MINIMAL BASS';
    const cursor = document.createElement('span');
    cursor.className = 'tw-cursor';
    el.textContent = '';
    el.appendChild(cursor);

    let i = 0;
    const TYPE_SPEED = 80; // ms per character

    function typeNext() {
        if (i >= text.length) {
            // Remove cursor after 2.5s
            setTimeout(() => cursor.remove(), 2500);
            return;
        }
        const char = document.createTextNode(text[i]);
        el.insertBefore(char, cursor);
        i++;
        setTimeout(typeNext, TYPE_SPEED + Math.random() * 40);
    }

    setTimeout(typeNext, 200);
}

// ============================================================
// ============================================================
// LUGARES — LAZY LOAD das strips (carrega só quando seção entra na tela)
// ============================================================

function initPhotoReelLazyLoad() {
    document.querySelectorAll('.photo-reel-lazy').forEach(section => {
        const imgs = section.querySelectorAll('.lugares-card img[data-src]');
        if (!imgs.length) return;

        let loaded = false;

        const load = () => {
            if (loaded) return;
            loaded = true;
            const BATCH = 6;
            let i = 0;
            const next = () => {
                const slice = Array.from(imgs).slice(i, i + BATCH);
                slice.forEach(img => {
                    img.decoding = 'async';
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                });
                i += BATCH;
                if (i < imgs.length) setTimeout(next, 120);
            };
            next();
        };

        const obs = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) { load(); obs.disconnect(); }
        }, { rootMargin: '400px 0px' });

        obs.observe(section);
    });
}

// SCROLL REVEAL — stagger children automatically
// ============================================================

function initScrollReveal() {
    // Add staggered delays to siblings inside reveal-stagger containers
    document.querySelectorAll('.reveal-stagger').forEach(parent => {
        Array.from(parent.children).forEach((child, i) => {
            child.classList.add('reveal-up');
            child.style.setProperty('--delay', `${i * 0.1}s`);
        });
    });

    const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');
    if (!revealEls.length) return;

    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => obs.observe(el));
}

// ============================================================
// DROPS — carrossel manual (setas, sem autoplay de scroll)
// ============================================================

function initDropsCarousel() {
    const wrap = document.querySelector('.drops-carousel-wrap');
    if (!wrap) return;
    const viewport = wrap.querySelector('.drops-viewport');
    const track = wrap.querySelector('.drops-track');
    const prev = wrap.querySelector('.drops-nav--prev');
    const next = wrap.querySelector('.drops-nav--next');
    const slides = wrap.querySelectorAll('.drops-slide');
    if (!viewport || !track || !prev || !next || !slides.length) return;

    const getStep = () => {
        const gapStr = getComputedStyle(track).gap || '0px';
        const gap = parseFloat(gapStr) || 0;
        return slides[0].offsetWidth + gap;
    };

    const updateNav = () => {
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 1);
        prev.disabled = viewport.scrollLeft <= 1;
        next.disabled = viewport.scrollLeft >= max - 1;
    };

    prev.addEventListener('click', () => {
        viewport.scrollBy({ left: -getStep(), behavior: 'smooth' });
    });
    next.addEventListener('click', () => {
        viewport.scrollBy({ left: getStep(), behavior: 'smooth' });
    });

    let scrollTicking = false;
    viewport.addEventListener('scroll', () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            updateNav();
            scrollTicking = false;
        });
    }, { passive: true });

    window.addEventListener('resize', updateNav);
    updateNav();
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
    initLoadingScreen();
    initCustomCursor();
    initParallax();
    initScrollReveal();
    initPhotoReelLazyLoad();
    initDropsCarousel();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
