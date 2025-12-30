// Inicializar Feather Icons
feather.replace();

// Configurar año actual en el footer
document.getElementById('currentYear').textContent = new Date().getFullYear();

// Toggle tema oscuro/claro
const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

// Verificar preferencia del sistema o tema guardado
const currentTheme = localStorage.getItem('theme');
if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
    document.documentElement.classList.add('dark-mode');
}

themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark-mode');
    const theme = document.documentElement.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    
    // Reemplazar íconos después del cambio de tema
    setTimeout(() => feather.replace(), 100);
});

// Navegación móvil
const navHamburger = document.querySelector('.nav-hamburger');
const navMenu = document.querySelector('.nav-menu');

navHamburger.addEventListener('click', () => {
    const isOpen = navMenu.style.display === 'flex';
    navMenu.style.display = isOpen ? 'none' : 'flex';
    navMenu.style.flexDirection = 'column';
    navMenu.style.position = 'absolute';
    navMenu.style.top = '100%';
    navMenu.style.left = '0';
    navMenu.style.right = '0';
    navMenu.style.backgroundColor = 'var(--bg-primary)';
    navMenu.style.padding = 'var(--space-md)';
    navMenu.style.borderTop = '1px solid var(--border-color)';
    navMenu.style.boxShadow = 'var(--shadow)';
    navMenu.style.zIndex = '999';
    navMenu.style.gap = '0.5rem';
});

// Cerrar menú al hacer clic en un enlace
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            navMenu.style.display = 'none';
        }
    });
});

// Animación de aparición al hacer scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observar elementos para animación
document.querySelectorAll('.about-card, .project-card, .timeline-item, .skill-category').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

// Smooth scroll para enlaces internos
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Efecto de escritura en el título (opcional)
const heroTitle = document.querySelector('.hero-title');
const gradientSpan = heroTitle.querySelector('.gradient-text');
if (gradientSpan) {
    const originalText = gradientSpan.textContent;
    let charIndex = 0;
    let isDeleting = false;
    let isPaused = false;
    let typingSpeed = 100;

    function typeWriter() {
        if (isPaused) return;
        
        if (!isDeleting) {
            if (charIndex <= originalText.length) {
                const currentText = originalText.substring(0, charIndex);
                gradientSpan.textContent = currentText;
                charIndex++;
                typingSpeed = 100;
            }
            
            if (charIndex > originalText.length) {
                isPaused = true;
                setTimeout(() => {
                    isPaused = false;
                    isDeleting = true;
                    typeWriter();
                }, 2000);
                return;
            }
        } else {
            if (charIndex > 0) {
                charIndex--;
                const currentText = originalText.substring(0, charIndex);
                gradientSpan.textContent = currentText;
                typingSpeed = 50;
            }
            
            if (charIndex === 0) {
                isDeleting = false;
                typingSpeed = 500;
            }
        }
        
        setTimeout(typeWriter, typingSpeed);
    }

    // Iniciar efecto de escritura después de 1 segundo
    setTimeout(typeWriter, 1000);
}

// Actualizar íconos periódicamente (por si hay algún problema)
setInterval(() => {
    feather.replace();
}, 5000);

// Manejar cambio de tamaño de ventana
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        navMenu.style.display = '';
        navMenu.style.position = '';
        navMenu.style.flexDirection = '';
        navMenu.style.backgroundColor = '';
        navMenu.style.padding = '';
        navMenu.style.borderTop = '';
        navMenu.style.boxShadow = '';
    }
});