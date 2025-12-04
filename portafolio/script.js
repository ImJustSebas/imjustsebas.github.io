// Toggle del tema claro/oscuro
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

// Verificar preferencia del sistema o tema guardado
const savedTheme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

// Cambiar tema al hacer clic
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Animación de transición
    document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
    setTimeout(() => {
        document.body.style.transition = '';
    }, 500);
});

// Actualizar icono del tema
function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

// Menú móvil
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.querySelector('.nav-menu');

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    const icon = menuToggle.querySelector('i');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-times');
});

// Cerrar menú al hacer clic en un enlace
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.querySelector('i').classList.remove('fa-times');
        menuToggle.querySelector('i').classList.add('fa-bars');
        
        // Actualizar enlace activo
        document.querySelectorAll('.nav-link').forEach(item => {
            item.classList.remove('active');
        });
        link.classList.add('active');
    });
});

// Animación de barras de habilidades al hacer scroll
const skillLevels = document.querySelectorAll('.skill-level');
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.3
};

const skillsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const skill = entry.target;
            const level = skill.getAttribute('data-level');
            skill.style.width = `${level}%`;
            skill.classList.add('animated');
        }
    });
}, observerOptions);

skillLevels.forEach(skill => {
    skillsObserver.observe(skill);
});

// Formulario de contacto con Formspree
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

// Configuración para Formspree
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Obtener valores del formulario
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const organization = document.getElementById('organization').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;
        
        // Validación básica
        if (!name || !email || !subject || !message) {
            showFormMessage('Por favor, completa todos los campos obligatorios.', 'error');
            return;
        }
        
        // Validación de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showFormMessage('Por favor, introduce un correo electrónico válido.', 'error');
            return;
        }
        
        // Deshabilitar botón y mostrar estado de carga
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        submitBtn.disabled = true;
        
        try {
            // Enviar formulario a Formspree
            const formData = new FormData(contactForm);
            const response = await fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                // Mostrar mensaje de éxito
                showFormMessage(`¡Gracias ${name}! Tu mensaje ha sido enviado exitosamente. Te responderé a ${email} en un plazo máximo de 24 horas.`, 'success');
                
                // Restablecer formulario
                contactForm.reset();
                
                // Enfoque en el primer campo
                document.getElementById('name').focus();
            } else {
                throw new Error('Error en el servidor');
            }
        } catch (error) {
            console.error('Error al enviar el formulario:', error);
            showFormMessage('Hubo un error al enviar tu mensaje. Por favor, intenta nuevamente o contáctame directamente por correo.', 'error');
        } finally {
            // Restaurar botón
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Función para mostrar mensajes del formulario
function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = 'form-message ' + type;
    formMessage.style.display = 'block';
    
    // Desaparecer mensaje después de 10 segundos
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 10000);
}

// Efecto de aparición al hacer scroll
const fadeObserverOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-visible');
        }
    });
}, fadeObserverOptions);

// Aplicar observador a elementos que queremos animar
document.querySelectorAll('.section, .project-card, .highlight-item, .principle, .skill-category').forEach(el => {
    el.classList.add('fade-in');
    fadeObserver.observe(el);
});

// Añadir estilos CSS para la animación de aparición
const fadeInStyle = document.createElement('style');
fadeInStyle.textContent = `
    .fade-in {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.8s cubic-bezier(0.22, 0.61, 0.36, 1), 
                    transform 0.8s cubic-bezier(0.22, 0.61, 0.36, 1);
    }
    
    .fade-in-visible {
        opacity: 1;
        transform: translateY(0);
    }
    
    .project-card {
        transition-delay: calc(var(--index, 0) * 0.1s);
    }
`;
document.head.appendChild(fadeInStyle);

// Asignar índices para animaciones escalonadas
document.querySelectorAll('.project-card').forEach((card, index) => {
    card.style.setProperty('--index', index);
});

// Actualizar año actual en el footer
const currentYear = new Date().getFullYear();
const yearElements = document.querySelectorAll('.footer-bottom p');
if (yearElements.length > 0) {
    yearElements[0].innerHTML = yearElements[0].innerHTML.replace('2023', currentYear);
}

// Navegación suave para anclas internas
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const offset = 80; // Altura de la navegación
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - offset;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Actualizar URL sin recargar la página
            history.pushState(null, null, targetId);
        }
    });
});

// Detectar sección activa para resaltar enlace de navegación
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function highlightNavLink() {
    let scrollPosition = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', highlightNavLink);

// Efecto de máquina de escribir en el título (opcional)
function typeWriterEffect() {
    const nameElement = document.querySelector('.name');
    if (!nameElement) return;
    
    const text = nameElement.textContent;
    nameElement.textContent = '';
    
    let i = 0;
    function type() {
        if (i < text.length) {
            nameElement.textContent += text.charAt(i);
            i++;
            setTimeout(type, 100);
        }
    }
    
    // Iniciar efecto cuando el elemento esté en vista
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            setTimeout(type, 500);
            observer.unobserve(nameElement);
        }
    });
    
    observer.observe(nameElement);
}

// Iniciar efectos cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    typeWriterEffect();
    highlightNavLink();
});

// Preload de imagen de perfil para mejor UX
const profileImg = document.querySelector('.profile-img');
if (profileImg) {
    const img = new Image();
    img.src = profileImg.src;
    img.onload = () => {
        profileImg.style.opacity = '1';
    };
    profileImg.style.opacity = '0';
    profileImg.style.transition = 'opacity 0.5s ease';
}

// Efecto de ripple en botones
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function(e) {
        // Crear elemento de ripple
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.7);
            transform: scale(0);
            animation: ripple-animation 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            top: ${y}px;
            left: ${x}px;
            pointer-events: none;
        `;
        
        this.appendChild(ripple);
        
        // Eliminar elemento después de la animación
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
});

// Añadir estilos para el efecto ripple
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    .btn {
        position: relative;
        overflow: hidden;
    }
`;
document.head.appendChild(rippleStyle);

// Mejorar accesibilidad del teclado
document.addEventListener('keydown', (e) => {
    // Navegación con teclado en formulario
    if (e.key === 'Tab' && document.activeElement.classList.contains('nav-link')) {
        const activeLink = document.activeElement;
        const allLinks = document.querySelectorAll('.nav-link');
        const currentIndex = Array.from(allLinks).indexOf(activeLink);
        
        if (e.shiftKey && currentIndex === 0) {
            e.preventDefault();
            document.querySelector('.logo').focus();
        } else if (!e.shiftKey && currentIndex === allLinks.length - 1) {
            e.preventDefault();
            document.getElementById('themeToggle').focus();
        }
    }
});