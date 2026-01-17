const API_BASE = 'http://localhost:3000/api';

let allImages = [];

// Initialize
async function init() {
    await loadGalleries();
}

// Load all images from all scenes
async function loadGalleries() {
    try {
        const res = await fetch(`${API_BASE}/profile`);
        const data = await res.json();

        // Collect all images with scene info
        allImages = [];
        data.scenes.forEach(scene => {
            if (scene.generated_images && scene.generated_images.length > 0) {
                scene.generated_images.forEach(imageUrl => {
                    allImages.push({
                        url: imageUrl,
                        sceneName: scene.name,
                        sceneId: scene.id
                    });
                });
            }
        });

        // Update stats
        const scenesWithImages = data.scenes.filter(s => s.generated_images && s.generated_images.length > 0).length;
        document.getElementById('totalImages').textContent = allImages.length;
        document.getElementById('totalScenes').textContent = scenesWithImages;

        // Hide loading
        document.getElementById('loadingState').style.display = 'none';

        // Show gallery or empty state
        if (allImages.length === 0) {
            document.getElementById('emptyState').style.display = 'block';
        } else {
            document.getElementById('galleryGrid').style.display = 'flex';
            renderJustifiedGallery();
        }
    } catch (err) {
        console.error('Failed to load galleries', err);
        document.getElementById('loadingState').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed to load images';
    }
}

// Render justified gallery (Google Photos style)
function renderJustifiedGallery() {
    const container = document.getElementById('galleryGrid');
    container.innerHTML = '';

    // Simple justified layout - group images into rows
    const rowHeight = 250;
    const containerWidth = container.offsetWidth || 1400;
    const gap = 4;

    let currentRow = [];
    let currentRowWidth = 0;

    allImages.forEach((image, index) => {
        // Assume square images for simplicity (can be enhanced with actual image dimensions)
        const aspectRatio = 1; // Default to square
        const imageWidth = rowHeight * aspectRatio;

        currentRow.push(image);
        currentRowWidth += imageWidth + gap;

        // If row is full or last image
        if (currentRowWidth >= containerWidth - 100 || index === allImages.length - 1) {
            // Create row
            const row = document.createElement('div');
            row.className = 'gallery-row';

            currentRow.forEach(img => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `
                    <img src="${img.url}" alt="${img.sceneName}" loading="lazy">
                    <div class="gallery-item-title">${img.sceneName}</div>
                `;

                item.addEventListener('click', () => openLightbox(img));
                row.appendChild(item);
            });

            container.appendChild(row);

            // Reset for next row
            currentRow = [];
            currentRowWidth = 0;
        }
    });
}

// Lightbox functions
function openLightbox(image) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');

    lightboxImage.src = image.url;
    lightboxTitle.textContent = image.sceneName;
    lightbox.classList.add('show');

    // Close on background click
    lightbox.onclick = (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    };

    // Close on ESC key
    document.addEventListener('keydown', handleEscKey);
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.remove('show');
    document.removeEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
}

// Initialize on load
init();
