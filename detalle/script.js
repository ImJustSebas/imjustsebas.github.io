document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const textSlides = document.querySelectorAll('.text-slide');
    const imageSlides = document.querySelectorAll('.image-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.querySelector('.progress');
    
    // Variables de estado
    let currentIndex = 0;
    const totalSlides = 5;
    let isTransitioning = false;
    
    // Función para actualizar la diapositiva
    function updateSlide(newIndex, direction) {
        // Si está en transición o es la misma diapositiva, no hacer nada
        if (isTransitioning || newIndex === currentIndex) return;
        
        isTransitioning = true;
        
        // Determinar dirección de la animación si no se proporciona
        if (!direction) {
            direction = newIndex > currentIndex ? 'next' : 'prev';
        }
        
        // Obtener elementos actuales y nuevos
        const currentText = textSlides[currentIndex];
        const currentImage = imageSlides[currentIndex];
        const newText = textSlides[newIndex];
        const newImage = imageSlides[newIndex];
        
        // Configurar la animación de salida
        if (direction === 'next') {
            currentText.style.transform = 'translateX(-100%)';
            currentImage.style.transform = 'translateX(-100%)';
            currentText.style.opacity = '0';
            currentImage.style.opacity = '0';
            
            // Configurar la entrada de la nueva diapositiva
            newText.style.transform = 'translateX(0)';
            newImage.style.transform = 'translateX(0)';
            newText.style.opacity = '1';
            newImage.style.opacity = '1';
        } else {
            currentText.style.transform = 'translateX(100%)';
            currentImage.style.transform = 'translateX(100%)';
            currentText.style.opacity = '0';
            currentImage.style.opacity = '0';
            
            // Configurar la entrada de la nueva diapositiva
            newText.style.transform = 'translateX(0)';
            newImage.style.transform = 'translateX(0)';
            newText.style.opacity = '1';
            newImage.style.opacity = '1';
        }
        
        // Remover clase active de los elementos actuales
        currentText.classList.remove('active');
        currentImage.classList.remove('active');
        dots[currentIndex].classList.remove('active');
        
        // Agregar clase active a los nuevos elementos
        newText.classList.add('active');
        newImage.classList.add('active');
        dots[newIndex].classList.add('active');
        
        // Actualizar barra de progreso
        const progressPercentage = ((newIndex + 1) / totalSlides) * 100;
        progressBar.style.width = `${progressPercentage}%`;
        
        // Efecto especial para la última diapositiva (corazón)
        if (newIndex === totalSlides - 1) {
            document.querySelector('.title').style.color = '#ff7eb3';
            document.querySelector('.title').style.textShadow = '0 0 20px rgba(255, 126, 179, 0.8)';
        } else {
            document.querySelector('.title').style.color = '#ffb6c1';
            document.querySelector('.title').style.textShadow = '0 0 15px rgba(255, 182, 193, 0.7)';
        }
        
        // Actualizar índice actual
        currentIndex = newIndex;
        
        // Restablecer estados después de la transición
        setTimeout(() => {
            // Resetear transformaciones para elementos que no están activos
            textSlides.forEach((slide, index) => {
                if (index !== currentIndex) {
                    slide.style.transform = 'translateX(100%)';
                    slide.style.opacity = '0';
                }
            });
            
            imageSlides.forEach((slide, index) => {
                if (index !== currentIndex) {
                    slide.style.transform = 'translateX(100%)';
                    slide.style.opacity = '0';
                }
            });
            
            isTransitioning = false;
        }, 800);
    }
    
    // Navegar a la siguiente diapositiva
    function nextSlide() {
        if (isTransitioning) return;
        
        const nextIndex = (currentIndex + 1) % totalSlides;
        updateSlide(nextIndex, 'next');
    }
    
    // Navegar a la diapositiva anterior
    function prevSlide() {
        if (isTransitioning) return;
        
        const prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
        updateSlide(prevIndex, 'prev');
    }
    
    // Navegar a una diapositiva específica
    function goToSlide(index) {
        if (isTransitioning) return;
        
        if (index >= 0 && index < totalSlides) {
            const direction = index > currentIndex ? 'next' : 'prev';
            updateSlide(index, direction);
        }
    }
    
    // Event Listeners para botones
    prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        prevSlide();
    });
    
    nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        nextSlide();
    });
    
    // Event Listeners para puntos de navegación
    dots.forEach(dot => {
        dot.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            goToSlide(index);
        });
    });
    
    // Navegación con teclado
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowRight' || e.key === ' ') {
            e.preventDefault();
            nextSlide();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            prevSlide();
        }
    });
    
    // Soporte para gestos táctiles en móviles
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    }, {passive: true});
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Deslizar a la izquierda -> siguiente
                nextSlide();
            } else {
                // Deslizar a la derecha -> anterior
                prevSlide();
            }
        }
    }
    
    // Inicializar todas las diapositivas en su posición correcta
    function initializeSlides() {
        textSlides.forEach((slide, index) => {
            if (index === 0) {
                slide.style.transform = 'translateX(0)';
                slide.style.opacity = '1';
            } else {
                slide.style.transform = 'translateX(100%)';
                slide.style.opacity = '0';
            }
            slide.style.transition = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.8s ease';
        });
        
        imageSlides.forEach((slide, index) => {
            if (index === 0) {
                slide.style.transform = 'translateX(0)';
                slide.style.opacity = '1';
            } else {
                slide.style.transform = 'translateX(100%)';
                slide.style.opacity = '0';
            }
            slide.style.transition = 'transform 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity 0.8s ease';
        });
        
        // Inicializar barra de progreso
        progressBar.style.width = '20%';
        
        // Efecto de entrada inicial
        setTimeout(() => {
            document.querySelector('.container').style.opacity = '1';
            document.querySelector('.container').style.transform = 'translateY(0)';
        }, 300);
    }
    
    // Estilos iniciales para animación de entrada
    document.querySelector('.container').style.opacity = '0';
    document.querySelector('.container').style.transform = 'translateY(20px)';
    document.querySelector('.container').style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    
    // Inicializar aplicación
    initializeSlides();
    
    // Auto-avance opcional (comentado por defecto)
    // let autoSlideInterval = setInterval(nextSlide, 8000);
    
    // Pausar auto-avance al interactuar
    /* document.addEventListener('click', function() {
        clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(nextSlide, 8000);
    }); */
});