document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- GLOBAL CONFIG & STATE ---
    const config = {
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isMobileViewport: window.innerWidth <= 920,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    if (config.isTouchDevice || config.isMobileViewport) {
        document.body.classList.add('no-cursor-fx');
    }

    // --- UTILITY FUNCTIONS ---
    const throttle = (func, limit) => {
        let inThrottle;
        return function(...args) {
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    const select = (selector) => document.querySelector(selector);
    const selectAll = (selector) => document.querySelectorAll(selector);

    // --- MODULE: SMOOTH SCROLL (LENIS) ---
    const scrollModule = (() => {
        let lenis;

        const init = () => {
            if (typeof Lenis === 'undefined' || config.prefersReducedMotion) return;
            
            lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
            const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
            
            setupAnchorScrolling();
            handleInitialHash();
        };

        const setupAnchorScrolling = () => {
            selectAll('a[href^="#"], a[href^="index.html#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    const href = this.getAttribute('href');
                    const targetId = href.substring(href.indexOf('#'));
                    const targetEl = document.querySelector(targetId);

                    if (targetEl) {
                        e.preventDefault();
                        lenis.scrollTo(targetEl, { offset: -80 });
                    }
                });
            });
        };
        
        const handleInitialHash = () => {
            if (window.location.hash) {
                const targetEl = select(window.location.hash);
                if (targetEl) {
                    setTimeout(() => lenis.scrollTo(targetEl, { offset: -80 }), 200);
                }
            }
        };
        
        return { init };
    })();
    
    // --- MODULE: UI EFFECTS (CURSOR, TILT, MAGNETIC, REVEAL, etc.) ---
    const uiEffectsModule = (() => {
        const init = () => {
            if (config.prefersReducedMotion) return;
            if (!config.isTouchDevice && !config.isMobileViewport) {
                setupCursorFollower();
                setupMagneticElements();
                setupTilting();
            }
            setupRevealAnimations();
            setupCounters();
            setupCardSpotlight();
            addRippleEffect(selectAll('.ripple'));
        };

        const setupCursorFollower = () => {
            const follower = select('.cursor-follower');
            if (!follower) return;
            const interactiveElements = selectAll('a, button, [data-tilt], .nav-btn, .menu-btn, .magnetic');
            let posX = 0, posY = 0;

            const moveFollower = throttle(e => {
                posX = e.clientX;
                posY = e.clientY;
                follower.style.transform = `translate(${posX}px, ${posY}px)`;
            }, 16);
            
            window.addEventListener('mousemove', moveFollower);
            interactiveElements.forEach(el => {
                el.addEventListener('mouseenter', () => follower.classList.add('grow'));
                el.addEventListener('mouseleave', () => follower.classList.remove('grow'));
            });
        };

        const setupMagneticElements = () => {
            selectAll('.magnetic').forEach(el => {
                el.addEventListener('mousemove', function(e) {
                    const rect = this.getBoundingClientRect();
                    const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
                    const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
                    this.style.transform = `translate(${x}px, ${y}px)`;
                    this.style.transition = 'transform 0.1s ease-out';
                });
                el.addEventListener('mouseleave', function() {
                    this.style.transform = 'translate(0, 0)';
                    this.style.transition = 'transform 0.6s var(--ease-out-expo)';
                });
            });
        };

        const setupTilting = () => {
            selectAll('[data-tilt]').forEach(el => {
                const maxTilt = el.classList.contains('soft-tilt') ? 6 : 15;
                el.addEventListener('mousemove', e => {
                    const rect = el.getBoundingClientRect();
                    const rX = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2) * -maxTilt;
                    const rY = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2) * maxTilt;
                    el.style.transform = `perspective(1000px) rotateX(${rX}deg) rotateY(${rY}deg) scale(1.02)`;
                    el.style.transition = 'transform 0.1s ease-out';
                });
                el.addEventListener('mouseleave', () => {
                    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
                    el.style.transition = 'transform 0.6s var(--ease-out-expo)';
                });
            });
        };
        
        const setupRevealAnimations = () => {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const parent = entry.target.parentElement;
                        const delay = parent && getComputedStyle(parent).display === 'grid' 
                            ? Array.from(parent.children).indexOf(entry.target) * 100 : 0;
                        entry.target.style.transitionDelay = `${delay}ms`;
                        entry.target.classList.add('in');
                        obs.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
            selectAll('.reveal, .reveal-s').forEach(el => observer.observe(el));
        };
        
        const setupCounters = () => {
            const observer = new IntersectionObserver((entries, obs) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const el = entry.target;
                        const target = +el.dataset.count;
                        let current = 0; const increment = target / 100;
                        const updateCount = () => {
                            current += increment;
                            if (current < target) {
                                el.innerText = Math.ceil(current); requestAnimationFrame(updateCount);
                            } else {
                                el.innerText = target;
                            }
                        };
                        updateCount();
                        obs.unobserve(el);
                    }
                });
            }, { threshold: 0.8 });
            selectAll('.num[data-count]').forEach(counter => observer.observe(counter));
        };
        
        const setupCardSpotlight = () => {
            selectAll('.card').forEach(card => {
                const spotlight = card.querySelector('.card-spotlight');
                if (!spotlight) return;
                card.addEventListener('mousemove', e => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    spotlight.style.left = x + 'px';
                    spotlight.style.top = y + 'px';
                });
            });
        };

        const addRippleEffect = (elements) => {
            elements.forEach(el => {
                el.addEventListener('click', function(e) {
                    const rect = this.getBoundingClientRect();
                    const ripple = document.createElement('span');
                    const size = Math.max(rect.width, rect.height);
                    ripple.style.width = ripple.style.height = `${size}px`;
                    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
                    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
                    ripple.classList.add('ripple-effect');
                    this.appendChild(ripple);
                    ripple.addEventListener('animationend', () => ripple.remove());
                });
            });
        };
        
        return { init };
    })();

    // --- MODULE: NAVIGATION & HEADER ---
    const navigationModule = (() => {
        const header = select('.header');
        const sections = selectAll('[data-scroll-section]');
        const allNavLinks = selectAll('.desktop-nav a.nav-link, .mobile-nav-panel a');
        const desktopNavLinks = selectAll('.desktop-nav a.nav-link');

        const init = () => {
            if (!header) return;
            setupMobileNav();
            window.addEventListener('scroll', throttle(handleScroll, 100), { passive: true });
            handlePageLoad();
        };

        const handleScroll = () => {
            header.classList.toggle('scrolled', window.scrollY > 50);
            updateActiveLinkOnScroll();
        };
        
        const updateActiveLinkOnScroll = () => {
            if (sections.length === 0) return;
            let currentSectionId = '';
            const triggerPoint = window.scrollY + window.innerHeight * 0.4;
            
            sections.forEach(section => {
                if (triggerPoint >= section.offsetTop) {
                    currentSectionId = section.id;
                }
            });
            updateLinks(currentSectionId);
        };
        
        const updateLinks = (activeSectionId) => {
            allNavLinks.forEach(link => {
                const linkSection = link.getAttribute('data-section');
                link.classList.toggle('active', linkSection === activeSectionId);
            });
        };

        const handlePageLoad = () => {
            const path = window.location.pathname.split('/').pop();
            let activeSection;

            if (path.includes('artikel')) {
                activeSection = 'pena';
            } else if (path.includes('dashboard')) {
                activeSection = 'dashboard';
            } else {
                activeSection = 'beranda';
            }
            updateLinks(activeSection);
            handleScroll();
        };

        const setupMobileNav = () => {
            const menuBtn = select('#menuBtn');
            const navPanel = select('#mobileNavPanel');
            const navOverlay = select('#navOverlay');
            if (!menuBtn || !navPanel || !navOverlay) return;

            const toggleMenu = (forceClose = false) => {
                const isOpen = document.body.classList.contains('body-no-scroll');
                if (forceClose || isOpen) {
                    menuBtn.classList.remove('active');
                    navPanel.classList.remove('open');
                    navOverlay.classList.remove('open');
                    document.body.classList.remove('body-no-scroll');
                } else {
                    menuBtn.classList.add('active');
                    navPanel.classList.add('open');
                    navOverlay.classList.add('open');
                    document.body.classList.add('body-no-scroll');
                }
            };
            menuBtn.addEventListener('click', () => toggleMenu());
            navOverlay.addEventListener('click', () => toggleMenu(true));
            selectAll('.mobile-nav-panel a').forEach(link => {
                link.addEventListener('click', () => setTimeout(() => toggleMenu(true), 150));
            });
        };

        return { init, updateLinks };
    })();
    
    // --- MODULE: AUTHENTICATION ---
    const authModule = (() => {
        const init = () => {
            // Check auth status on every page load
            checkAuthStatus();
            
            // Setup listeners only on pages where they exist
            if (select('#authWrapper')) setupAuthForm();
            if (select('#logoutBtn')) setupLogout();
            if (select('#logoutBtnDashboard')) setupLogout();
        };
        
        const setupAuthForm = () => {
            const container = select('#authWrapper');
            const activateSignUp = () => container.classList.add('right-panel-active');
            const activateSignIn = () => container.classList.remove('right-panel-active');

            select('#signUpBtn')?.addEventListener('click', activateSignUp);
            select('#signInBtn')?.addEventListener('click', activateSignIn);
            select('#mobileSwitchToSignUp')?.addEventListener('click', activateSignUp);
            select('#mobileSwitchToSignIn')?.addEventListener('click', activateSignIn);
            
            select('#signInForm')?.addEventListener('submit', handleSignIn);
            select('#signUpForm')?.addEventListener('submit', handleSignUp);
        };

        const handleSignIn = (e) => {
            e.preventDefault();
            const form = e.target;
            if (!validateForm(form)) return;
            
            // --- SIMULATION: In a real app, this would be an API call ---
            const email = form.querySelector('#signInEmail').value;
            const messageEl = form.querySelector('.form-message');
            messageEl.textContent = 'Mencoba masuk...';
            
            setTimeout(() => {
                // Simulate a successful login
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('waliName', 'Wali Santri'); // Dummy name
                window.location.href = 'dashboard.html';
            }, 1000);
        };

        const handleSignUp = (e) => {
            e.preventDefault();
            const form = e.target;
            if (!validateForm(form)) return;
            
            const messageEl = form.querySelector('.form-message');
            messageEl.textContent = 'Mendaftarkan akun...';

            setTimeout(() => {
                alert('Pendaftaran berhasil! Anda akan diarahkan untuk masuk.');
                select('#authWrapper').classList.remove('right-panel-active');
                messageEl.textContent = '';
                form.reset();
            }, 1500);
        };
        
        const validateForm = (form) => {
            let isValid = true;
            form.querySelectorAll('input[required]').forEach(input => {
                const errorEl = input.parentElement.querySelector('.input-error-message');
                let message = '';
                if (input.value.trim() === '') {
                    message = 'Kolom ini tidak boleh kosong.';
                } else if (input.type === 'email' && !/^\S+@\S+\.\S+$/.test(input.value)) {
                    message = 'Format email tidak valid.';
                } else if (input.type === 'password' && input.hasAttribute('minlength') && input.value.length < input.getAttribute('minlength')) {
                    message = `Password minimal ${input.getAttribute('minlength')} karakter.`;
                }
                
                errorEl.textContent = message;
                input.classList.toggle('invalid', !!message);
                if (message) isValid = false;
            });
            return isValid;
        };
        
        const checkAuthStatus = () => {
            if (sessionStorage.getItem('isLoggedIn') === 'true') {
                document.body.classList.add('logged-in');
                selectAll('.btn-login, .nav-login-link').forEach(el => el.style.display = 'none');
                selectAll('.btn-logout, .nav-dashboard-link').forEach(el => el.style.display = 'inline-flex');
                const waliName = sessionStorage.getItem('waliName');
                if(select('#waliName')) select('#waliName').textContent = waliName;
            } else {
                document.body.classList.remove('logged-in');
                selectAll('.btn-login, .nav-login-link').forEach(el => el.style.display = 'inline-flex');
                selectAll('.btn-logout, .nav-dashboard-link').forEach(el => el.style.display = 'none');
            }
        };

        const setupLogout = () => {
            selectAll('#logoutBtn, #logoutBtnDashboard').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.preventDefault();
                    sessionStorage.clear();
                    window.location.href = 'index.html';
                });
            });
        };
        
        return { init };
    })();
    
    // --- MODULE: PAGE-SPECIFIC LOGIC ---
    const pageModules = (() => {
        const init = () => {
            const pageId = document.body.className;
            
            if (select('#heroStack')) setupHeroFX();
            if (select('#back-to-top')) setupBackToTop();
            if (select('#reading-progress-bar')) setupReadingProgress();
            if (pageId.includes('dashboard-page')) dashboardModule.init();
        };

        const setupHeroFX = () => {
            if (config.prefersReducedMotion) {
                select('#heroStack')?.classList.add('visible');
                return;
            };
            setTimeout(() => select('#heroStack')?.classList.add('visible'), 100);

            const slides = selectAll('.hero-slide');
            if (slides.length <= 1) return;
            let current = 0, interval;
            const showSlide = i => slides.forEach((s, idx) => s.classList.toggle('show', i === idx));
            const next = () => { current = (current + 1) % slides.length; showSlide(current); };
            const startAuto = () => interval = setInterval(next, 7000);
            
            select('#nextSlide')?.addEventListener('click', () => { next(); clearInterval(interval); startAuto(); });
            select('#prevSlide')?.addEventListener('click', () => { current = (current - 1 + slides.length) % slides.length; showSlide(current); clearInterval(interval); startAuto(); });
            startAuto();
        };
        
        const setupBackToTop = () => {
            const btn = select('.back-to-top');
            window.addEventListener('scroll', throttle(() => {
                btn.classList.toggle('show', window.scrollY > 500);
            }, 200));
            btn.addEventListener('click', () => {
                if (typeof Lenis !== 'undefined' && scrollModule.lenis) {
                    scrollModule.lenis.scrollTo(0);
                } else {
                    window.scrollTo({ top: 0, behavior: config.prefersReducedMotion ? 'auto' : 'smooth' });
                }
            });
        };
        
        const setupReadingProgress = () => {
            const bar = select('#reading-progress-bar');
            const body = select('#article-body');
            if (!bar || !body) return;
            const updateProgress = () => {
                const rect = body.getBoundingClientRect();
                const scrollable = rect.height - window.innerHeight;
                const progress = Math.min(Math.max(-rect.top / scrollable, 0), 1);
                bar.style.width = `${progress * 100}%`;
            };
            window.addEventListener('scroll', throttle(updateProgress, 16));
            updateProgress();
        };

        return { init };
    })();
    
    // --- MODULE: DASHBOARD PAGE ---
    const dashboardModule = (() => {
        const init = () => {
            // Redirect if not logged in
            if (sessionStorage.getItem('isLoggedIn') !== 'true') {
                window.location.href = 'login.html';
                return;
            }
            setupTabs();
        };

        const setupTabs = () => {
            const links = selectAll('.sidebar-link');
            const contents = selectAll('.dashboard-content');
            const title = select('#dashboard-title');
            
            links.forEach(link => {
                link.addEventListener('click', e => {
                    e.preventDefault();
                    const targetId = link.dataset.target;
                    
                    links.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                    
                    contents.forEach(c => c.classList.remove('active'));
                    select(`#${targetId}`)?.classList.add('active');
                    
                    title.textContent = link.querySelector('span').textContent;
                    window.scrollTo(0, 0);
                });
            });
        };
        
        return { init };
    })();

    // --- INITIALIZE ALL MODULES ---
    scrollModule.init();
    uiEffectsModule.init();
    navigationModule.init();
    authModule.init();
    pageModules.init();
});