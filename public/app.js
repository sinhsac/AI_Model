const API_BASE = '/api';

// DOM Elements
const scenesGrid = document.getElementById('scenesGrid');
const sceneCount = document.getElementById('sceneCount');
const charNameDisplay = document.getElementById('charNameDisplay');
const charAgeDisplay = document.getElementById('charAgeDisplay');
const charVisuals = document.getElementById('charVisuals');
const profileSelect = document.getElementById('profileSelect');

// Modals
const sceneModal = document.getElementById('sceneModal');
const profileModal = document.getElementById('profileModal');
const promptModal = document.getElementById('promptModal');
const galleryModal = document.getElementById('galleryModal');
const jsonModal = document.getElementById('jsonModal');
const deleteModal = document.getElementById('deleteModal');
const cloneModal = document.getElementById('cloneModal');

// Buttons
const addSceneBtn = document.getElementById('addSceneBtn');
const editProfileBtn = document.getElementById('editProfileBtn');
const closeModalBtns = document.querySelectorAll('.close-modal');
const sceneForm = document.getElementById('sceneForm');
const profileForm = document.getElementById('profileForm');
const generatedPromptText = document.getElementById('generatedPromptText');
const copyBtn = document.getElementById('copyBtn');
const saveJsonBtn = document.getElementById('saveJsonBtn');
const jsonEditor = document.getElementById('jsonEditor');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const openCloneModalBtn = document.getElementById('openCloneModalBtn');
const cloneForm = document.getElementById('cloneForm');

// Gallery Elements
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const galleryGrid = document.getElementById('galleryGrid');

// Pagination
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageIndicator = document.getElementById('pageIndicator');
const sceneSearchInput = document.getElementById('sceneSearchInput');

// State
let profileData = null;
let currentPage = 1;
const itemsPerPage = 8;
let searchQuery = ''; // Add search state
let currentSceneIdForUpload = null;
let sceneIdToDelete = null;
let imagePathToDelete = null; // New state for image deletion
// Load from local storage or default
let currentProfileId = localStorage.getItem('currentProfileId') || 'linhtrang';

// Init
async function init() {
    await fetchProfiles();
    // Ensure selector matches storage if valid (handled in fetchProfiles usually, but let's be explicit)
    if (profileSelect.querySelector(`option[value="${currentProfileId}"]`)) {
        profileSelect.value = currentProfileId;
    } else {
        // Fallback if stored ID no longer exists
        currentProfileId = 'linhtrang';
        localStorage.setItem('currentProfileId', currentProfileId);
    }

    // Update Gallery Link immediately
    const navGalleryLink = document.getElementById('navGalleryLink');
    if (navGalleryLink) navGalleryLink.href = `/galleries?id=${currentProfileId}`;

    await fetchProfile();

    // Bind Profile Change
    const updateGalleryLink = (id) => {
        if (navGalleryLink) navGalleryLink.href = `/galleries?id=${id}`;
    };

    profileSelect.addEventListener('change', async (e) => {
        currentProfileId = e.target.value;
        localStorage.setItem('currentProfileId', currentProfileId); // Save state
        updateGalleryLink(currentProfileId);
        currentPage = 1;
        await fetchProfile();
        render();
    });

    // Search Listener
    if (sceneSearchInput) {
        sceneSearchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            currentPage = 1; // Reset to first page
            render();
        });
    }

    render();
}

// Toast Logic
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return; // Guard

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Remove after 3s
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-in forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// Fetch Profiles List
async function fetchProfiles() {
    try {
        const res = await fetch(`${API_BASE}/profiles`);
        const data = await res.json();

        if (data.profiles && data.profiles.length) {
            profileSelect.innerHTML = '';
            data.profiles.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.name;
                if (p.id === currentProfileId) opt.selected = true;
                profileSelect.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Failed to fetch profiles", err);
    }
}

// Fetch Profile Data
async function fetchProfile() {
    try {
        const res = await fetch(`${API_BASE}/profile?id=${currentProfileId}`);
        if (!res.ok) throw new Error("Profile not found");
        profileData = await res.json();
    } catch (err) {
        console.error("Failed to fetch profile", err);
        showToast("Failed to fetch profile data.", 'error');
        profileData = null;
    }
}

// Render UI with Pagination
function render() {
    if (!profileData) {
        scenesGrid.innerHTML = '<p style="text-align:center; padding: 2rem;">No data loaded.</p>';
        return;
    }

    // Character Info
    const char = profileData.character;
    charNameDisplay.textContent = char.name;
    charAgeDisplay.textContent = char.age;

    // Display personality and background if available
    let visualsText = `${char.ethnicity || ''}, ${char.hair || ''}`;
    if (char.face && char.face.features) visualsText += `. ${char.face.features}`;

    if (char.personality && char.personality.traits) {
        visualsText += ` | ${char.personality.traits.slice(0, 3).join(', ')}`;
    }
    if (char.background && char.background.occupation) {
        visualsText += ` | ${char.background.occupation}`;
    }
    charVisuals.textContent = visualsText;

    // Sort scenes by updatedAt desc (most recent first)
    let scenes = profileData.scenes ? [...profileData.scenes] : [];
    scenes.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0);
        const dateB = new Date(b.updatedAt || 0);
        return dateB - dateA;
    });

    // Filter scenes
    if (searchQuery) {
        scenes = scenes.filter(scene => {
            const sName = (scene.name || '').toLowerCase();
            const sId = (scene.id || '').toLowerCase();
            const sAct = (scene.action || '').toLowerCase();
            const sSet = (scene.setting || '').toLowerCase();
            return sName.includes(searchQuery) ||
                sId.includes(searchQuery) ||
                sAct.includes(searchQuery) ||
                sSet.includes(searchQuery);
        });
    }

    sceneCount.textContent = `${scenes.length}`;

    // Pagination Logic
    const totalPages = Math.ceil(scenes.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    if (totalPages === 0) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pagedScenes = scenes.slice(start, end);

    scenesGrid.innerHTML = '';

    if (scenes.length === 0) {
        scenesGrid.innerHTML = '<p style="text-align:center; padding:2rem; grid-column:1/-1;">No scenes found. Create one!</p>';
    }

    pagedScenes.forEach(scene => {
        const card = document.createElement('div');
        card.className = 'scene-card glass-panel';

        const imgCount = scene.generated_images ? scene.generated_images.length : 0;
        const lastUpdated = scene.updatedAt ? new Date(scene.updatedAt).toLocaleDateString() : 'N/A';

        let thumbHtml = '';
        if (imgCount > 0) {
            // Sort images by path/name desc
            const sortedImages = [...scene.generated_images].sort((a, b) => {
                return b.localeCompare(a);
            });
            const latestImg = sortedImages[0];
            thumbHtml = `<img src="${latestImg}" class="scene-thumbnail" alt="${scene.name}">`;
        }

        card.innerHTML = `
            <div class="scene-header">
                <span class="scene-title" title="${scene.name}">${scene.name}</span>
                <span class="scene-id">${scene.id}</span>
            </div>
            
            ${thumbHtml}

            <div class="scene-details">
                <p><i class="fas fa-video"></i> ${scene.action || ''}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${scene.setting || ''}</p>
                 ${scene.image_count && scene.image_count > 1 ? `<p style="color: #58a6ff; font-weight: bold;"><i class="fas fa-layer-group"></i> Target: ${scene.image_count} images</p>` : ''}
            </div>
            
             <div class="scene-meta">
                <span>Updated: ${lastUpdated}</span>
                <span><i class="fas fa-images"></i> ${imgCount}</span>
            </div>

            <div class="scene-actions">
                <button class="btn btn-primary btn-icon generate-btn" title="Generate Prompt"><i class="fas fa-magic"></i></button>
                <button class="btn btn-outline btn-icon edit-btn" title="Edit Scene"><i class="fas fa-edit"></i></button>
                <button class="btn btn-secondary btn-icon clone-btn" title="Clone & Edit"><i class="fas fa-copy"></i></button>
                <button class="btn btn-secondary btn-icon json-btn" title="Edit JSON"><i class="fas fa-code"></i></button>
                <button class="btn btn-outline btn-icon gallery-btn" title="Gallery"><i class="fas fa-image"></i></button>
                <button class="btn btn-danger btn-icon delete-btn" title="Delete Scene"><i class="fas fa-trash"></i></button>
            </div>
        `;

        card.querySelector('.generate-btn').addEventListener('click', () => generatePrompt(scene));
        card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(scene));
        card.querySelector('.clone-btn').addEventListener('click', () => cloneScene(scene));
        card.querySelector('.gallery-btn').addEventListener('click', () => openGalleryModal(scene));
        card.querySelector('.json-btn').addEventListener('click', () => openJsonModal(scene));
        card.querySelector('.delete-btn').addEventListener('click', () => requestDelete(scene));

        const titleEl = card.querySelector('.scene-title');
        const thumbEl = card.querySelector('.scene-thumbnail');
        titleEl.addEventListener('click', () => openGalleryModal(scene));
        if (thumbEl) thumbEl.addEventListener('click', () => openGalleryModal(scene));

        scenesGrid.appendChild(card);
    });

    // Update Controls
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Actions
async function generatePrompt(scene) {
    try {
        const res = await fetch(`${API_BASE}/generate-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scene,
                profileId: currentProfileId // Pass context
            })
        });
        const data = await res.json();
        generatedPromptText.textContent = data.prompt;
        promptModal.classList.add('show');
    } catch (err) {
        console.error("Error generating prompt", err);
        showToast("Error generating prompt", 'error');
    }
}

function openEditModal(scene) {
    resetForm();
    document.getElementById('sceneModalTitle').textContent = "Edit Scene: " + scene.id;
    document.getElementById('sceneId').value = scene.id;
    document.getElementById('sceneName').value = scene.name;
    document.getElementById('sceneAction').value = scene.action;
    document.getElementById('sceneSetting').value = scene.setting;
    document.getElementById('sceneOutfit').value = scene.outfit_changes || '';
    document.getElementById('sceneLighting').value = scene.lighting || '';
    document.getElementById('sceneView').value = scene.view || '';
    document.getElementById('sceneProps').value = scene.props || '';
    document.getElementById('sceneImageCount').value = scene.image_count || 1;

    sceneModal.classList.add('show');
}

function cloneScene(scene) {
    openEditModal(scene);
    document.getElementById('sceneModalTitle').textContent = "Clone Scene (New)";
    document.getElementById('sceneId').value = ""; // Clear ID to force creation
    document.getElementById('sceneName').value += " (Copy)";
}

function openGalleryModal(scene) {
    currentSceneIdForUpload = scene.id;
    galleryGrid.innerHTML = '';

    if (scene.generated_images && scene.generated_images.length > 0) {
        scene.generated_images.forEach(url => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.style.position = 'relative'; // Ensure relative for absolute button

            div.innerHTML = `
                <img src="${url}" onclick="window.open('${url}','_blank')" title="Click to view full size">
                <button class="btn-delete-img" style="
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: rgba(0,0,0,0.6);
                    color: #ff4d4d;
                    border: none;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                " title="Delete Image">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Hover effect logic could be here, but inline style is simpler for now
            div.querySelector('.btn-delete-img').addEventListener('mouseenter', (e) => e.target.style.background = 'rgba(0,0,0,0.9)');
            div.querySelector('.btn-delete-img').addEventListener('mouseleave', (e) => e.target.style.background = 'rgba(0,0,0,0.6)');

            div.querySelector('.btn-delete-img').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent opening image
                requestDeleteImage(url, scene.id);
            });

            galleryGrid.appendChild(div);
        });
    } else {
        galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #555;">No images uploaded yet.</p>';
    }

    galleryModal.classList.add('show');
}

function openJsonModal(scene) {
    jsonEditor.value = JSON.stringify(scene, null, 2);
    jsonModal.classList.add('show');
}

function requestDelete(scene) {
    sceneIdToDelete = scene.id;
    imagePathToDelete = null; // Clear image state
    document.getElementById('deleteTargetName').textContent = `Scene: ${scene.name}`;
    deleteModal.classList.add('show');
}

function requestDeleteImage(path, sceneId) {
    imagePathToDelete = path;
    currentSceneIdForUpload = sceneId; // Track scene context
    sceneIdToDelete = null; // Clear scene delete state
    document.getElementById('deleteTargetName').textContent = "this image";
    deleteModal.classList.add('show');
}

// Delete Logic
confirmDeleteBtn.addEventListener('click', async () => {
    confirmDeleteBtn.textContent = "Deleting...";
    confirmDeleteBtn.disabled = true;

    try {
        if (sceneIdToDelete) {
            // Delete Scene
            const res = await fetch(`${API_BASE}/scenes/${sceneIdToDelete}?profileId=${currentProfileId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                deleteModal.classList.remove('show');
                showToast("Scene deleted successfully");
                await fetchProfile();
                render();
            } else {
                showToast("Failed to delete scene", 'error');
            }
        } else if (imagePathToDelete) {
            // Delete Image
            const res = await fetch(`${API_BASE}/upload?path=${encodeURIComponent(imagePathToDelete)}&profileId=${currentProfileId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                deleteModal.classList.remove('show');
                showToast("Image deleted successfully");
                await fetchProfile();
                // Refresh modal content
                const updatedScene = profileData.scenes.find(s => s.id === currentSceneIdForUpload);
                if (updatedScene) openGalleryModal(updatedScene);
                render();
            } else {
                showToast("Failed to delete image", 'error');
            }
        }

    } catch (err) {
        console.error(err);
        showToast("Error deleting item", 'error');
    } finally {
        confirmDeleteBtn.textContent = "Delete Forever";
        confirmDeleteBtn.disabled = false;
        sceneIdToDelete = null;
        imagePathToDelete = null;
    }
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.remove('show');
    sceneIdToDelete = null;
});

// JSON Save Logic
saveJsonBtn.addEventListener('click', async () => {
    try {
        const updatedScene = JSON.parse(jsonEditor.value);
        if (!updatedScene.id) throw new Error("ID is required");

        const res = await fetch(`${API_BASE}/scenes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scene: updatedScene,
                profileId: currentProfileId
            })
        });

        if (res.ok) {
            jsonModal.classList.remove('show');
            showToast("JSON updated successfully");
            await fetchProfile();
            render();
        } else {
            showToast("Failed to save JSON", 'error');
        }
    } catch (err) {
        showToast("Invalid JSON: " + err.message, 'error');
    }
});

// Upload Logic
uploadBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async (e) => {
    if (!e.target.files.length) return;
    const file = e.target.files[0];

    const reader = new FileReader();
    reader.onload = async function (evt) {
        const base64 = evt.target.result;

        try {
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;

            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sceneId: currentSceneIdForUpload,
                    image: base64,
                    profileId: currentProfileId
                })
            });

            const data = await res.json();
            if (data.success) {
                showToast("Image uploaded successfully");
                await fetchProfile();
                const updatedScene = profileData.scenes.find(s => s.id === currentSceneIdForUpload);
                if (updatedScene) openGalleryModal(updatedScene);
                render();
            }
        } catch (err) {
            showToast('Upload failed', 'error');
            console.error(err);
        } finally {
            uploadBtn.textContent = 'Upload Image';
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Image';
            uploadBtn.disabled = false;
        }
    };
    reader.readAsDataURL(file);
});

// Form Handlers
sceneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(sceneForm);
    const sceneData = {};
    formData.forEach((value, key) => {
        if (value) sceneData[key] = value;
    });

    const isEdit = !!sceneData.id;
    const method = isEdit ? 'PUT' : 'POST';
    const bodyKey = isEdit ? 'scene' : 'newScene';

    try {
        const res = await fetch(`${API_BASE}/scenes`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                [bodyKey]: sceneData,
                profileId: currentProfileId
            })
        });

        if (res.ok) {
            sceneModal.classList.remove('show');
            showToast("Scene saved successfully");
            await fetchProfile();
            render();
        } else {
            showToast("Failed to save", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Error saving scene", 'error');
    }
});

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!profileData) return;

    // Construct deep object from flat form
    const current = profileData.character;

    const updated = {
        ...current,
        name: document.getElementById('pName').value,
        age: document.getElementById('pAge').value,
        ethnicity: document.getElementById('pEthnicity').value,
        hair: document.getElementById('pHair').value,

        body: {
            ...current.body || {},
            height: document.getElementById('pBodyHeight').value,
            type: document.getElementById('pBodyType').value,
            build: document.getElementById('pBodyBuild').value,
            posture: document.getElementById('pBodyPosture').value,

            // New Fields
            characteristics: document.getElementById('pBodyCharacteristics').value,
            chest: document.getElementById('pBodyChest').value,
            waist: document.getElementById('pBodyWaist').value,
            hips: document.getElementById('pBodyHips').value,
            arms: document.getElementById('pBodyArms').value,
            legs: document.getElementById('pBodyLegs').value,
            skin_texture: document.getElementById('pBodySkin').value,
            overall_aesthetic: document.getElementById('pBodyAesthetic').value
        },

        face: {
            ...current.face || {},
            shape: document.getElementById('pFaceShape').value,
            skin: document.getElementById('pFaceSkin').value,
            cheekbones: document.getElementById('pFaceCheekbones').value,
            eyes: document.getElementById('pFaceEyes').value,
            eyebrows: document.getElementById('pFaceEyebrows').value,
            nose: document.getElementById('pFaceNose').value,
            lips: document.getElementById('pFaceLips').value,
            features: document.getElementById('pFaceFeatures').value
        },

        base_outfit: {
            ...current.base_outfit || {},
            top: document.getElementById('pOutfitTop').value,
            bottom: document.getElementById('pOutfitBottom').value,
            accessories: document.getElementById('pOutfitAcc').value
        },

        photography: {
            ...current.photography || {},
            quality: document.getElementById('pPhotoQual').value,
            lighting: document.getElementById('pPhotoLight').value,
            composition: document.getElementById('pPhotoComp').value
        }
    };

    // Add personality if fields exist
    const traitsInput = document.getElementById('pPersonalityTraits').value;
    updated.personality = {
        ...current.personality || {},
        traits: traitsInput ? traitsInput.split(',').map(t => t.trim()).filter(t => t) : [],
        mbti: document.getElementById('pPersonalityMbti').value,
        tone: document.getElementById('pPersonalityTone').value
    };

    // Add background if fields exist
    updated.background = {
        ...current.background || {},
        hometown: document.getElementById('pBackgroundHometown').value,
        occupation: document.getElementById('pBackgroundOccupation').value,
        education: document.getElementById('pBackgroundEducation').value,
        family: document.getElementById('pBackgroundFamily').value,
        lifestyle: document.getElementById('pBackgroundLifestyle').value
    };

    // Preserve core_identity_prompt if exists
    // core_identity_prompt
    updated.core_identity_prompt = document.getElementById('pCoreIdentity').value;

    try {
        const res = await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                character: updated,
                profileId: currentProfileId
            })
        });

        if (res.ok) {
            profileModal.classList.remove('show');
            await fetchProfile();
            render();
            showToast("Profile Updated Successfully!");
        } else {
            showToast("Failed to save profile", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Error saving profile", 'error');
    }
});

// Pagination Helpers
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        render();
    }
});

nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil((profileData.scenes ? profileData.scenes.length : 0) / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        render();
    }
});

// Helpers
function resetForm() {
    sceneForm.reset();
    document.getElementById('sceneId').value = '';
    document.getElementById('sceneImageCount').value = 1;
    document.getElementById('sceneModalTitle').textContent = "Add New Scene";
}

addSceneBtn.addEventListener('click', () => {
    resetForm();
    sceneModal.classList.add('show');
});

editProfileBtn.addEventListener('click', () => {
    if (!profileData) return;
    const char = profileData.character;

    // Basic
    document.getElementById('pName').value = char.name || '';
    document.getElementById('pAge').value = char.age || '';
    document.getElementById('pEthnicity').value = char.ethnicity || '';
    document.getElementById('pHair').value = char.hair || '';

    // Body
    if (char.body) {
        document.getElementById('pBodyHeight').value = char.body.height || '';
        document.getElementById('pBodyType').value = char.body.type || '';
        document.getElementById('pBodyBuild').value = char.body.build || '';
        document.getElementById('pBodyPosture').value = char.body.posture || '';

        // New Fields
        document.getElementById('pBodyCharacteristics').value = char.body.characteristics || '';
        document.getElementById('pBodyChest').value = char.body.chest || '';
        document.getElementById('pBodyWaist').value = char.body.waist || '';
        document.getElementById('pBodyHips').value = char.body.hips || '';
        document.getElementById('pBodyArms').value = char.body.arms || '';
        document.getElementById('pBodyLegs').value = char.body.legs || '';
        document.getElementById('pBodySkin').value = char.body.skin_texture || '';
        document.getElementById('pBodyAesthetic').value = char.body.overall_aesthetic || '';
    }

    // Face
    if (char.face) {
        document.getElementById('pFaceShape').value = char.face.shape || '';
        document.getElementById('pFaceSkin').value = char.face.skin || '';
        document.getElementById('pFaceCheekbones').value = char.face.cheekbones || '';
        document.getElementById('pFaceEyes').value = char.face.eyes || '';
        document.getElementById('pFaceEyebrows').value = char.face.eyebrows || '';
        document.getElementById('pFaceNose').value = char.face.nose || '';
        document.getElementById('pFaceLips').value = char.face.lips || '';
        document.getElementById('pFaceFeatures').value = char.face.features || '';
    }

    // Outfit
    if (char.base_outfit) {
        document.getElementById('pOutfitTop').value = char.base_outfit.top || '';
        document.getElementById('pOutfitBottom').value = char.base_outfit.bottom || '';
        document.getElementById('pOutfitAcc').value = char.base_outfit.accessories || '';
    }

    // Photo
    if (char.photography) {
        document.getElementById('pPhotoQual').value = char.photography.quality || '';
        document.getElementById('pPhotoLight').value = char.photography.lighting || '';
        document.getElementById('pPhotoComp').value = char.photography.composition || '';
    }

    // Personality
    if (char.personality) {
        document.getElementById('pPersonalityTraits').value = char.personality.traits ? char.personality.traits.join(', ') : '';
        document.getElementById('pPersonalityMbti').value = char.personality.mbti || '';
        document.getElementById('pPersonalityTone').value = char.personality.tone || '';
    }

    // Background
    // Background
    if (char.background) {
        document.getElementById('pBackgroundHometown').value = char.background.hometown || '';
        document.getElementById('pBackgroundOccupation').value = char.background.occupation || '';
        document.getElementById('pBackgroundEducation').value = char.background.education || '';
        document.getElementById('pBackgroundFamily').value = char.background.family || '';
        document.getElementById('pBackgroundLifestyle').value = char.background.lifestyle || '';
    }

    // Core Identity
    document.getElementById('pCoreIdentity').value = char.core_identity_prompt || '';

    profileModal.classList.add('show');
});

// Close Modals
closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        sceneModal.classList.remove('show');
        profileModal.classList.remove('show');
        promptModal.classList.remove('show');
        galleryModal.classList.remove('show');
        jsonModal.classList.remove('show');
        galleryModal.classList.remove('show');
        jsonModal.classList.remove('show');
        deleteModal.classList.remove('show');
        cloneModal.classList.remove('show');
    });
});

// Clone Logic
openCloneModalBtn.addEventListener('click', () => {
    document.getElementById('cloneForm').reset();
    cloneModal.classList.add('show');
});

cloneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newId = document.getElementById('cloneId').value.trim();
    const newName = document.getElementById('cloneName').value.trim();

    if (!newId || !newName) return;

    try {
        const res = await fetch(`${API_BASE}/profiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: newId,
                name: newName,
                sourceId: currentProfileId // Clone from current
            })
        });

        if (res.ok) {
            cloneModal.classList.remove('show');
            showToast("Profile cloned successfully!");
            // Refresh list and select new one
            await fetchProfiles();
            // Select the new one
            profileSelect.value = newId;
            // Trigger change event manually
            profileSelect.dispatchEvent(new Event('change'));
        } else {
            const data = await res.json();
            showToast(data.message || "Failed to clone profile", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Error cloning profile", 'error');
    }
});

// Copy Logic
// Copy Logic
function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        if (successful) {
            showToast("Prompt copied to clipboard");
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        } else {
            showToast("Fallback: Copying failed", 'error');
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
        showToast("Unable to copy", 'error');
    }

    document.body.removeChild(textArea);
}

copyBtn.addEventListener('click', () => {
    const text = generatedPromptText.textContent;
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }

    navigator.clipboard.writeText(text)
        .then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            showToast("Prompt copied to clipboard");
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        })
        .catch(err => {
            console.error('Async: Could not copy text: ', err);
            // Try fallback if async fails (e.g. non-secure context)
            fallbackCopyTextToClipboard(text);
        });
});

// Init
init();
