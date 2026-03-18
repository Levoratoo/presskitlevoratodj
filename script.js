/* ============================================================
   LEVORATO PRESS KIT — SCRIPT
   Particle system, animations, navbar, counters
   ============================================================ */

'use strict';

// ============================================================
// PARTICLE SYSTEM
// ============================================================

const canvas = document.getElementById('particle-canvas');
const ctx    = canvas.getContext('2d');
let particles = [];
let rafId;

function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Particle {
    constructor() {
        this.init();
    }

    init() {
        this.x       = Math.random() * canvas.width;
        this.y       = Math.random() * canvas.height;
        this.size    = Math.random() * 1.4 + 0.4;
        this.vx      = (Math.random() - 0.5) * 0.28;
        this.vy      = (Math.random() - 0.5) * 0.28;
        this.alpha   = Math.random() * 0.45 + 0.08;

        // ~30% of particles are red-tinted, rest are dim white
        this.isRed   = Math.random() > 0.7;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around edges
        if (this.x < -2)              this.x = canvas.width  + 2;
        if (this.x > canvas.width + 2) this.x = -2;
        if (this.y < -2)              this.y = canvas.height + 2;
        if (this.y > canvas.height + 2) this.y = -2;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.isRed
            ? `rgba(255, 26, 26, ${this.alpha})`
            : `rgba(220, 220, 220, ${this.alpha * 0.4})`;
        ctx.fill();
    }
}

function buildParticles() {
    particles = [];
    // Density: 1 particle per ~18 000 px² of viewport
    const count = Math.min(120, Math.floor((canvas.width * canvas.height) / 18000));
    for (let i = 0; i < count; i++) {
        particles.push(new Particle());
    }
}

function drawConnections() {
    const DIST = 110;

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dx   = particles[i].x - particles[j].x;
            const dy   = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < DIST) {
                const alpha = (1 - dist / DIST) * 0.12;
                ctx.beginPath();
                ctx.strokeStyle = `rgba(255, 26, 26, ${alpha})`;
                ctx.lineWidth   = 0.5;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
}

function tickParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
        p.update();
        p.draw();
    }

    drawConnections();
    rafId = requestAnimationFrame(tickParticles);
}

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

// Close mobile menu when a link is clicked
navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// ============================================================
// SMOOTH SCROLL (offset for fixed navbar)
// ============================================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const id     = this.getAttribute('href');
        const target = document.querySelector(id);
        if (!target) return;

        e.preventDefault();

        const navH = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--nav-h')
        ) || 68;

        window.scrollTo({
            top:      target.getBoundingClientRect().top + window.scrollY - navH,
            behavior: 'smooth',
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

        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(eased * target);

        // Format with locale separators (50000 → "50.000" in pt-BR)
        el.textContent = value.toLocaleString('pt-BR');

        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    }

    requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el     = entry.target;
                const target = parseInt(el.dataset.target, 10);
                if (!isNaN(target)) {
                    animateCounter(el, target);
                }
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
// CURSOR GLOW (subtle red spotlight following mouse)
// ============================================================

(function setupCursorGlow() {
    const glow = document.createElement('div');
    glow.style.cssText = `
        position: fixed;
        width: 300px;
        height: 300px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,26,26,0.04) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
        transform: translate(-50%, -50%);
        transition: opacity 0.4s ease;
        opacity: 0;
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

    document.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
    });
})();

// ============================================================
// WINDOW EVENTS
// ============================================================

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resizeCanvas();
        buildParticles();
    }, 200);
}, { passive: true });

window.addEventListener('scroll', onScroll, { passive: true });

// ============================================================
// INIT
// ============================================================

// ============================================================
// TIMELINE — DRAG-TO-SCROLL DJ GALLERY
// ============================================================

function initDjGallery() {
    const gallery = document.getElementById('tl-dj-gallery');
    if (!gallery) return;

    let isDown   = false;
    let startX   = 0;
    let scrollLeft = 0;

    gallery.addEventListener('mousedown', e => {
        isDown = true;
        gallery.classList.add('grabbing');
        startX     = e.pageX - gallery.offsetLeft;
        scrollLeft = gallery.scrollLeft;
    });

    const endDrag = () => {
        isDown = false;
        gallery.classList.remove('grabbing');
    };

    gallery.addEventListener('mouseleave', endDrag);
    gallery.addEventListener('mouseup',    endDrag);

    gallery.addEventListener('mousemove', e => {
        if (!isDown) return;
        e.preventDefault();
        const x    = e.pageX - gallery.offsetLeft;
        const walk = (x - startX) * 1.6;
        gallery.scrollLeft = scrollLeft - walk;
    });

    // Touch support
    let touchStartX = 0;
    let touchScrollLeft = 0;

    gallery.addEventListener('touchstart', e => {
        touchStartX     = e.touches[0].pageX;
        touchScrollLeft = gallery.scrollLeft;
    }, { passive: true });

    gallery.addEventListener('touchmove', e => {
        const dx = touchStartX - e.touches[0].pageX;
        gallery.scrollLeft = touchScrollLeft + dx;
    }, { passive: true });
}

// ============================================================
// TIMELINE — TENSION BLOCK: random glitch trigger
// ============================================================

function initTimelineMobileCarousels() {
    const carousels = document.querySelectorAll('.tl-vc-mask');
    if (!carousels.length) return;

    carousels.forEach(carousel => {
        let isPointerDown = false;
        let startX = 0;
        let startY = 0;
        let startScrollLeft = 0;
        let isHorizontalDrag = false;

        carousel.addEventListener('pointerdown', e => {
            if (window.innerWidth > 900) return;

            isPointerDown = true;
            isHorizontalDrag = false;
            startX = e.clientX;
            startY = e.clientY;
            startScrollLeft = carousel.scrollLeft;
        });

        carousel.addEventListener('pointermove', e => {
            if (!isPointerDown || window.innerWidth > 900) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            if (!isHorizontalDrag) {
                if (Math.abs(dx) < 8) return;
                if (Math.abs(dx) <= Math.abs(dy)) return;
                isHorizontalDrag = true;
            }

            e.preventDefault();
            carousel.scrollLeft = startScrollLeft - dx;
        });

        const endPointerDrag = () => {
            isPointerDown = false;
            isHorizontalDrag = false;
        };

        carousel.addEventListener('pointerup', endPointerDrag);
        carousel.addEventListener('pointercancel', endPointerDrag);
        carousel.addEventListener('lostpointercapture', endPointerDrag);
    });
}

function initTensionGlitch() {
    const el = document.getElementById('tl-glitch');
    if (!el) return;

    // Random extra glitch bursts
    setInterval(() => {
        if (Math.random() > 0.55) return;
        el.style.transform = `translateX(${(Math.random() - 0.5) * 8}px)`;
        setTimeout(() => { el.style.transform = ''; }, 80);
    }, 600);
}

// ============================================================
// TIMELINE — SPINE LINE SCROLL ANIMATION
// ============================================================

function initSpineLine() {
    const wrapper   = document.querySelector('.tl-spine-wrapper');
    const spineLine = document.getElementById('tl-spine-line');
    const endDot    = document.querySelector('#tl-ch2 .tl-node-dot');
    if (!wrapper || !spineLine) return;

    function updateSpine() {
        const wrapperRect = wrapper.getBoundingClientRect();
        const wrapperTop  = wrapperRect.top + window.scrollY;

        // End point: center of the 2022 dot, or wrapper bottom if dot not found
        let endY;
        if (endDot) {
            const dotRect = endDot.getBoundingClientRect();
            endY = dotRect.top + window.scrollY + endDot.offsetHeight / 2;
        } else {
            endY = wrapperTop + wrapper.offsetHeight;
        }

        const totalSpan = endY - wrapperTop;
        const scrolled  = Math.max(0, window.scrollY + window.innerHeight * 0.55 - wrapperTop);
        const pct       = Math.min(100, (scrolled / totalSpan) * 100);

        // Convert pct of totalSpan back to pct of wrapper height
        const heightPx = (pct / 100) * totalSpan;
        spineLine.style.height = heightPx + 'px';
    }

    window.addEventListener('scroll', updateSpine, { passive: true });
    updateSpine();
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
        el.style.opacity  = '0';
        el.style.transform = 'translateY(28px)';
        el.style.transition = 'opacity 0.75s ease, transform 0.75s ease';
        obs.observe(el);
    });

    // Node dots pop in
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
                // Trigger short flicker sequence
                const bg = tension.querySelector('.tl-tension-bg');
                if (!bg) return;
                let count = 0;
                const flicker = setInterval(() => {
                    bg.style.opacity = count % 2 === 0 ? '1.6' : '0.4';
                    count++;
                    if (count >= 6) {
                        clearInterval(flicker);
                        bg.style.opacity = '';
                    }
                }, 80);
                tensionObs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.35 });

    tensionObs.observe(tension);
}

// ============================================================
// INIT
// ============================================================

function initHeroParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;

    const COUNT  = 180;
    const COLORS = ['#ff1a1a', '#ff3b3b', '#cc0000', '#ff5555', '#800000', '#ff2222', '#ff4444'];
    const frag   = document.createDocumentFragment();

    for (let i = 0; i < COUNT; i++) {
        const el    = document.createElement('span');
        const size  = (Math.random() * 7 + 2).toFixed(1);   // 2–9 px
        const top   = (Math.random() * 100).toFixed(1);
        const left  = (Math.random() * 100).toFixed(1);
        const dur   = (Math.random() * 3.5 + 2.5).toFixed(2);  // 2.5–6s
        const delay = (Math.random() * 5).toFixed(2);
        const op    = (Math.random() * 0.55 + 0.25).toFixed(2); // 0.25–0.8
        const rise  = `-${(Math.random() * 30 + 10).toFixed(0)}px`;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const glow  = size > 5
            ? `0 0 ${Math.round(size * 1.4)}px ${color}88`
            : 'none';

        el.className = 'hp';
        el.style.cssText = `
            width:${size}px; height:${size}px;
            top:${top}%; left:${left}%;
            background:${color};
            box-shadow:${glow};
            animation-duration:${dur}s;
            animation-delay:-${delay}s;
            --hp-op:${op};
            --hp-rise:${rise};
        `;
        frag.appendChild(el);
    }

    container.appendChild(frag);
}

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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
