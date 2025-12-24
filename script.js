// ===================================
// SISTEMA DE PARTÍCULAS EN CANVAS
// ===================================
class ParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.mouseX = null;
        this.mouseY = null;
        this.particleCount = 80;
        
        this.resizeCanvas();
        this.initParticles();
        this.animate();
        
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseleave', () => this.resetMouse());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                radius: Math.random() * 2 + 0.5,
                opacity: Math.random() * 0.5 + 0.2,
                color: `hsl(${Math.random() * 20 + 160}, 100%, 50%)`
            });
        }
    }
    
    handleMouseMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }
    
    resetMouse() {
        this.mouseX = null;
        this.mouseY = null;
    }
    
    animate() {
        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary');
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.particles.forEach((particle, index) => {
            // Movimiento
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Rebote en bordes
            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;
            
            // Mantener dentro del canvas
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
            
            // Reacción al ratón
            if (this.mouseX !== null && this.mouseY !== null) {
                const dx = particle.x - this.mouseX;
                const dy = particle.y - this.mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const repelDistance = 150;
                
                if (distance < repelDistance) {
                    const force = (repelDistance - distance) / repelDistance;
                    const angle = Math.atan2(dy, dx);
                    particle.vx += Math.cos(angle) * force * 1.5;
                    particle.vy += Math.sin(angle) * force * 1.5;
                }
            }
            
            // Limitar velocidad
            const speed = Math.sqrt(particle.vx ** 2 + particle.vy ** 2);
            if (speed > 2) {
                particle.vx = (particle.vx / speed) * 2;
                particle.vy = (particle.vy / speed) * 2;
            }
            
            // Dibujar partícula
            this.ctx.fillStyle = particle.color;
            this.ctx.globalAlpha = particle.opacity;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Conectar partículas cercanas
            for (let j = index + 1; j < this.particles.length; j++) {
                const other = this.particles[j];
                const dx = particle.x - other.x;
                const dy = particle.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 100) {
                    this.ctx.strokeStyle = particle.color;
                    this.ctx.globalAlpha = (1 - distance / 100) * 0.2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(other.x, other.y);
                    this.ctx.stroke();
                }
            }
        });
        
        this.ctx.globalAlpha = 1;
        requestAnimationFrame(() => this.animate());
    }
}

// ===================================
// TYPING EFFECT
// ===================================
class TypingEffect {
    constructor(element, texts, speed = 100, deleteSpeed = 50, delay = 2000) {
        this.element = element;
        this.texts = texts;
        this.speed = speed;
        this.deleteSpeed = deleteSpeed;
        this.delay = delay;
        this.index = 0;
        this.charIndex = 0;
        this.isDeleting = false;
        this.start();
    }
    
    start() {
        this.type();
    }
    
    type() {
        const currentText = this.texts[this.index];
        
        if (!this.isDeleting) {
            if (this.charIndex < currentText.length) {
                this.element.textContent += currentText[this.charIndex];
                this.charIndex++;
                setTimeout(() => this.type(), this.speed);
            } else {
                setTimeout(() => {
                    this.isDeleting = true;
                    this.type();
                }, this.delay);
            }
        } else {
            if (this.charIndex > 0) {
                this.element.textContent = currentText.substring(0, this.charIndex - 1);
                this.charIndex--;
                setTimeout(() => this.type(), this.deleteSpeed);
            } else {
                this.isDeleting = false;
                this.index = (this.index + 1) % this.texts.length;
                setTimeout(() => this.type(), this.speed);
            }
        }
    }
}

// ===================================
// SISTEMA DE TEMAS
// ===================================
class ThemeManager {
    constructor() {
        this.isDarkMode = this.loadTheme();
        this.applyTheme();
        this.setupListeners();
    }
    
    loadTheme() {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    applyTheme() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    }
    
    toggle() {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
    }
    
    setupListeners() {
        const themeButtons = document.querySelectorAll('#theme-toggle, #footer-theme-toggle');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.toggle());
        });
    }
}

// ===================================
// SCROLL ANIMATIONS
// ===================================
class ScrollAnimations {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };
        this.observer = new IntersectionObserver((entries) => this.handleIntersection(entries), this.observerOptions);
        this.observeElements();
    }
    
    observeElements() {
        const elements = document.querySelectorAll('.skill-card, .project-card, .timeline-item, .contacto-content');
        elements.forEach(el => this.observer.observe(el));
    }
    
    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                this.observer.unobserve(entry.target);
            }
        });
    }
}

// ===================================
// FILTROS DE PROYECTOS
// ===================================
class ProjectFilters {
    constructor() {
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.projectCards = document.querySelectorAll('.project-card');
        this.setupListeners();
    }
    
    setupListeners() {
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => this.filterProjects(btn));
        });
    }
    
    filterProjects(btn) {
        // Actualizar botón activo
        this.filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const filter = btn.dataset.filter;
        
        // Filtrar tarjetas
        this.projectCards.forEach(card => {
            if (filter === 'todos' || card.dataset.category === filter) {
                card.style.display = 'block';
                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'scale(1)';
                }, 10);
            } else {
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    card.style.display = 'none';
                }, 300);
            }
        });
    }
}

// ===================================
// FORMULARIO DE CONTACTO
// ===================================
class ContactForm {
    constructor() {
        this.form = document.getElementById('contact-form');
        this.messageElement = document.getElementById('form-message');
        this.setupListener();
    }
    
    setupListener() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }
    
    handleSubmit(e) {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const email = document.getElementById('email').value.trim();
        const mensaje = document.getElementById('mensaje').value.trim();
        
        if (!nombre || !email || !mensaje) {
            this.showMessage('Por favor completa todos los campos.', 'error');
            return;
        }
        
        if (!this.isValidEmail(email)) {
            this.showMessage('Por favor ingresa un email válido.', 'error');
            return;
        }
        
        // Simular envío (En producción, integrar con backend)
        this.showMessage('Procesando...', 'loading');
        
        setTimeout(() => {
            this.form.reset();
            this.showMessage('¡Mensaje enviado correctamente! Te responderé pronto.', 'success');
            setTimeout(() => {
                this.messageElement.textContent = '';
            }, 5000);
        }, 1000);
    }
    
    isValidEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    showMessage(text, type) {
        this.messageElement.textContent = text;
        this.messageElement.style.color = 
            type === 'error' ? '#ef4444' : 
            type === 'success' ? '#10b981' : 
            '#0891b2';
    }
}

// ===================================
// DESCARGA DE CV
// ===================================
class CVDownload {
    constructor() {
        this.btn = document.getElementById('download-cv');
        this.setupListener();
    }
    
    setupListener() {
        this.btn.addEventListener('click', () => this.downloadCV());
    }
    
    downloadCV() {
        // Crear elemento de enlace temporal
        const link = document.createElement('a');
        link.href = 'cv-sebastian-porras.pdf'; // Ruta del CV (crear y colocar en la carpeta)
        link.download = 'CV_Sebastian_Porras_Solano.pdf';
        
        // Si el archivo no existe, mostrar mensaje
        fetch('cv-sebastian-porras.pdf')
            .then(response => {
                if (response.ok) {
                    link.click();
                } else {
                    alert('El CV aún no está disponible. Puedes contactarme para más información.');
                }
            })
            .catch(() => {
                alert('El CV aún no está disponible. Puedes contactarme para más información.');
            });
    }
}

// ===================================
// NAVEGACIÓN SUAVE Y ACTIVA
// ===================================
class Navigation {
    constructor() {
        this.navLinks = document.querySelectorAll('.nav-link');
        this.setupListeners();
    }
    
    setupListeners() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
        
        window.addEventListener('scroll', () => this.updateActiveLink());
    }
    
    updateActiveLink() {
        let currentSection = '';
        
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (window.pageYOffset >= sectionTop - 200) {
                currentSection = section.getAttribute('id');
            }
        });
        
        this.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSection}`) {
                link.classList.add('active');
            }
        });
    }
}

// ===================================
// INICIALIZACIÓN
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar sistema de partículas
    const canvas = document.getElementById('particles-canvas');
    new ParticleSystem(canvas);
    
    // Inicializar typing effect
    const typingElement = document.querySelector('.typing-text');
    new TypingEffect(typingElement, [
        'Arquitecto de la Evolución Humana',
        'Full-Stack Developer',
        'Data Scientist',
        'AI Researcher',
        'Neurociencia & Tecnología'
    ], 80, 40, 2500);
    
    // Inicializar temas
    new ThemeManager();
    
    // Inicializar animaciones de scroll
    new ScrollAnimations();
    
    // Inicializar filtros de proyectos
    new ProjectFilters();
    
    // Inicializar formulario de contacto
    new ContactForm();
    
    // Inicializar descarga de CV
    new CVDownload();
    
    // Inicializar navegación
    new Navigation();
    
    // Agregar estilos iniciales para animaciones
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    });
});

// ===================================
// MOBILE MENU
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-active');
            mobileMenuBtn.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic en un enlace
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('mobile-active');
                mobileMenuBtn.classList.remove('active');
            });
        });
    }
});
