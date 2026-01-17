const API_BASE = 'http://localhost:3000/api';

let allImages = [];

// Initialize
async function init() {
    await loadGalleries();
    window.addEventListener('resize', debounce(renderJustifiedGallery, 200));
}

// Load all images from all scenes
async function loadGalleries() {
    try {
        const res = await fetch(`${API_BASE}/profile`);
        const data = await res.json();

        data.scenes.forEach(scene => {
            if (scene.generated_images && scene.generated_images.length > 0) {
                scene.generated_images.forEach(imageUrl => {
                    allImages.push({
                        url: imageUrl,
                        sceneName: scene.name,
                        sceneId: scene.id,
                        width: 1, // Placeholder
                        height: 1, // Placeholder
                        aspectRatio: 1 // Placeholder
                    });
                });
            }
        });

        // Sort by timestamp descending (newest first)
        // Assumes filename is timestamp e.g. "1768634290.jpg"
        allImages.sort((a, b) => {
            const getContent = (url) => {
                const parts = url.split('/');
                const filename = parts[parts.length - 1];
                return filename;
            };
            // String comparison of filenames is sufficient for fixed-length timestamps
            return getContent(b.url).localeCompare(getContent(a.url));
        });

        // Update stats
        const scenesWithImages = data.scenes.filter(s => s.generated_images && s.generated_images.length > 0).length;
        document.getElementById('totalImages').textContent = allImages.length;
        document.getElementById('totalScenes').textContent = scenesWithImages;

        // Hide empty state if we have images
        if (allImages.length === 0) {
            document.getElementById('loadingState').style.display = 'none';
            document.getElementById('emptyState').style.display = 'block';
            return;
        }

        // Update loading state
        const loadingState = document.getElementById('loadingState');
        loadingState.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading images metadata... <div id="loadingProgress" class="loading-progress">0%</div>';

        // Preload image dimensions to get aspect ratios
        await preloadImagesDimensions();

        // Hide loading
        document.getElementById('loadingState').style.display = 'none';

        // Show gallery
        document.getElementById('galleryGrid').style.display = 'flex';
        renderJustifiedGallery();

    } catch (err) {
        console.error('Failed to load galleries', err);
        document.getElementById('loadingState').innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed to load images';
    }
}

// Preload images to get dimensions
async function preloadImagesDimensions() {
    const total = allImages.length;
    let loaded = 0;
    const progressEl = document.getElementById('loadingProgress');

    const updateProgress = () => {
        loaded++;
        const percent = Math.round((loaded / total) * 100);
        if (progressEl) progressEl.textContent = `${percent}%`;
    };

    const promises = allImages.map(img => {
        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                img.width = image.naturalWidth;
                img.height = image.naturalHeight;
                img.aspectRatio = image.naturalWidth / image.naturalHeight;
                updateProgress();
                resolve();
            };
            image.onerror = () => {
                // If fails, keep default (square)
                console.warn('Failed to load image metadata:', img.url);
                updateProgress();
                resolve();
            };
            image.src = img.url;
        });
    });

    await Promise.all(promises);
}

// Render justified gallery (True Flickr/Google Photos style)
function renderJustifiedGallery() {
    const container = document.getElementById('galleryGrid');
    if (!container) return;

    container.innerHTML = '';

    const containerWidth = container.clientWidth;
    // If container is hidden or 0 width, retrying later might be needed, but assuming visible
    if (containerWidth === 0) return;

    const targetRowHeight = 300; // Desired height
    const gap = 4;

    let currentRow = [];
    let currentRowWidth = 0; // Sum of (targetHeight * aspect)

    for (let i = 0; i < allImages.length; i++) {
        const img = allImages[i];
        // Calculate theoretical width at target height
        const imgWidth = targetRowHeight * img.aspectRatio;

        currentRow.push(img);
        currentRowWidth += imgWidth;

        // Calculate total width including gaps if we were to stop here
        const currentGapTotal = (currentRow.length - 1) * gap;

        // If adding this image makes the row wider than container (with some buffer), break the row
        // Or if it's "close enough" to full.
        // Simple logic: If we exceed container width, we MUST break. 
        // But usually we went over, so we compress down.

        if (currentRowWidth + currentGapTotal > containerWidth) {
            // We have enough images for a row.
            // Distribute them to fit exactly.
            // Formula: FinalHeight = (ContainerWidth - TotalGaps) / SumAspectRatios

            const sumAspectRatios = currentRow.reduce((sum, item) => sum + item.aspectRatio, 0);
            const totalGaps = (currentRow.length - 1) * gap;
            const availableWidth = containerWidth - totalGaps;

            // Allow checking if the previous set was better? 
            // Simple greedy approach: once we exceed, we use this set.
            // Note: If we just exceeded, we might want to drop the last one?
            // "Standard" knapsack-like issue.
            // Simple version: accumulate until width > containerWidth, then render those.

            // Let's stick to the current set (including the one that pushed over) 
            // and shrink them to fit.

            const finalHeight = availableWidth / sumAspectRatios;

            // Check if final height is too small (e.g. < 150px), indicating too many narrow images?
            // Usually fine.

            renderRow(container, currentRow, finalHeight, gap);

            currentRow = [];
            currentRowWidth = 0;
        }
    }

    // Handle last row
    if (currentRow.length > 0) {
        // We don't justify the last row, we just let it be left-aligned with target height
        // Or slightly adjusted? standard is Left Aligned, Target Height.
        renderRow(container, currentRow, targetRowHeight, gap, true);
    }
}

function renderRow(container, images, height, gap, isLastRow = false) {
    const row = document.createElement('div');
    row.className = 'gallery-row';
    row.style.height = `${Math.floor(height)}px`;
    row.style.marginBottom = `${gap}px`;

    // If last row, we might not want to fill width if it's sparse
    if (isLastRow) {
        row.style.justifyContent = 'flex-start';
    }

    images.forEach(img => {
        const item = document.createElement('div');
        item.className = 'gallery-item';

        // Calculate width: Height * Aspect
        // We use flex-basis or explicit width
        const width = height * img.aspectRatio;
        item.style.width = `${width}px`;
        // Ensure it doesn't grow/shrink unexpectedly
        item.style.flexGrow = isLastRow ? '0' : '1';
        item.style.flexShrink = '1';

        item.innerHTML = `
            <img src="${img.url}" alt="${img.sceneName}" loading="lazy">
            <div class="gallery-item-title">${img.sceneName}</div>
        `;

        item.addEventListener('click', () => openLightbox(img));
        row.appendChild(item);
    });

    container.appendChild(row);
}


// Lightbox functions
function openLightbox(image) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxTitle = document.getElementById('lightboxTitle');

    if (!lightbox || !lightboxImage) return;

    lightboxImage.src = image.url;

    // Create info content
    const infoHtml = `
        <div>${image.sceneName}</div>
        <div style="font-size: 0.8rem; color: #8b949e; margin-top: 5px;">
            ${image.width} x ${image.height} px
        </div>
    `;

    if (lightboxTitle) lightboxTitle.innerHTML = infoHtml;

    lightbox.classList.add('show');

    // Close on background click
    lightbox.onclick = (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
            closeLightbox();
        }
    };

    // Close on ESC key
    document.addEventListener('keydown', handleEscKey);
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('show');
        // Clear src to stop video/memory?
        const img = document.getElementById('lightboxImage');
        if (img) setTimeout(() => { img.src = ''; }, 300);
    }
    document.removeEventListener('keydown', handleEscKey);
}

function handleEscKey(e) {
    if (e.key === 'Escape') {
        closeLightbox();
    }
}

// Utility: Debounce for resize
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize on load
init();
