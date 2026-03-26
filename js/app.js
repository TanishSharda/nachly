document.addEventListener('DOMContentLoaded', () => {
    initRouting();
    init3DTilt();
    initParallaxBackground();
});

// --- SPA Routing ---
function initRouting() {
    const defaultRoute = 'dashboard';
    
    // Handle initial load
    handleRoute();

    // Handle hash changes
    window.addEventListener('hashchange', handleRoute);

    function handleRoute() {
        let hash = window.location.hash.substring(1);
        if (!hash) {
            hash = defaultRoute;
            window.location.hash = hash;
            return;
        }

        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(hash);
        if (targetScreen) {
            targetScreen.classList.add('active');
        } else {
            // Fallback
            document.getElementById(defaultRoute).classList.add('active');
        }

        // Update nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === `#${hash}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }
}

// --- 3D Card Tilt Effect ---
function init3DTilt() {
    // 3D Tilt effect removed
}

// --- Parallax Background Effect ---
function initParallaxBackground() {
    const bg = document.getElementById('bgMesh');
    if (!bg) return;

    document.addEventListener('mousemove', (e) => {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        
        // Move the background slightly opposite to mouse
        const moveX = (x - 0.5) * -40; // max px movement
        const moveY = (y - 0.5) * -40;

        requestAnimationFrame(() => {
            bg.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.1)`;
        });
    });
}
