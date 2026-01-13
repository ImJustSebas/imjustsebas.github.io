// Efecto de orbe brillante que sigue el cursor
document.addEventListener('DOMContentLoaded', function() {
    // Activar animaciones de entrada añadiendo clase 'loaded' al body
    document.body.classList.add('loaded');
    
    // Obtener referencia al elemento de fondo
    const backgroundGlow = document.querySelector('.background-glow');
    
    // Actualizar la posición del orbe brillante según el movimiento del mouse
    document.addEventListener('mousemove', function(e) {
        // Calcular las coordenadas relativas del mouse
        const x = e.clientX / window.innerWidth * 100;
        const y = e.clientY / window.innerHeight * 100;
        
        // Actualizar las variables CSS con la posición del mouse
        backgroundGlow.style.setProperty('--mouse-x', `${x}%`);
        backgroundGlow.style.setProperty('--mouse-y', `${y}%`);
    });
    
    // Navegación entre secciones
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Obtener la sección objetivo
            const targetId = this.getAttribute('data-section');
            
            // Remover la clase activa de todos los enlaces y secciones
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            
            // Agregar la clase activa al enlace clickeado
            this.classList.add('active');
            
            // Mostrar la sección correspondiente
            document.getElementById(targetId).classList.add('active');
            
            // Desplazamiento suave hacia arriba en dispositivos móviles
            if (window.innerWidth <= 768) {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animación de entrada para las tarjetas de proyecto
    const projectCards = document.querySelectorAll('.project-card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeIn 0.8s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observar cada tarjeta de proyecto
    projectCards.forEach(card => {
        card.style.opacity = '0';
        observer.observe(card);
    });
    
    // Efecto de hover mejorado para enlaces sociales
    const socialLinks = document.querySelectorAll('.social-link');
    
    socialLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            // Crear un elemento de partículas para el efecto
            const particleCount = 8;
            const linkRect = this.getBoundingClientRect();
            const centerX = linkRect.left + linkRect.width / 2;
            const centerY = linkRect.top + linkRect.height / 2;
            
            for (let i = 0; i < particleCount; i++) {
                createParticle(centerX, centerY);
            }
        });
    });
    
    // Función para crear partículas decorativas
    function createParticle(x, y) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.width = '4px';
        particle.style.height = '4px';
        particle.style.backgroundColor = '#ff9999';
        particle.style.borderRadius = '50%';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '9999';
        
        // Posicionar la partícula en el centro del enlace
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        document.body.appendChild(particle);
        
        // Animación aleatoria para cada partícula
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 2;
        const distance = 20 + Math.random() * 30;
        
        const targetX = x + Math.cos(angle) * distance;
        const targetY = y + Math.sin(angle) * distance;
        
        // Animar la partícula
        const animation = particle.animate([
            { 
                transform: 'translate(0, 0) scale(1)', 
                opacity: 0.8 
            },
            { 
                transform: `translate(${targetX - x}px, ${targetY - y}px) scale(0.2)`, 
                opacity: 0 
            }
        ], {
            duration: 500 + Math.random() * 500,
            easing: 'ease-out'
        });
        
        // Eliminar la partícula después de la animación
        animation.onfinish = () => {
            document.body.removeChild(particle);
        };
    }
    
    // Efecto de resplandor al cargar la página
    setTimeout(() => {
        backgroundGlow.style.transition = 'background 1s ease';
        backgroundGlow.style.background = 'radial-gradient(circle at 50% 50%, var(--primary-red) 0%, var(--primary-dark) 70%)';
        
        setTimeout(() => {
            backgroundGlow.style.transition = '';
        }, 1000);
    }, 300);
    
    // Cambiar dinámicamente el color del orbe según la posición
    let lastX = 50;
    let lastY = 50;
    
    document.addEventListener('mousemove', function(e) {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        // Calcular un color basado en la posición del mouse
        const redIntensity = Math.min(255, 200 + Math.floor(x * 55));
        const glowColor = `rgba(${redIntensity}, ${150 + Math.floor(y * 50)}, ${150 + Math.floor(y * 50)}, 0.2)`;
        
        // Suavizar el cambio de posición
        lastX = lastX * 0.7 + x * 0.3;
        lastY = lastY * 0.7 + y * 0.3;
        
        // Actualizar el gradiente del fondo
        backgroundGlow.style.background = `radial-gradient(circle at ${lastX * 100}% ${lastY * 100}%, var(--primary-red) 0%, var(--primary-dark) 70%)`;
        
        // Actualizar el orbe brillante
        document.documentElement.style.setProperty('--glow-red', glowColor);
    });
});