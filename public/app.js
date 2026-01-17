const API_BASE = 'http://localhost:3000/api';

// DOM Elements
const scenesGrid = document.getElementById('scenesGrid');
const sceneCount = document.getElementById('sceneCount');
const charNameDisplay = document.getElementById('charNameDisplay');
const charAgeDisplay = document.getElementById('charAgeDisplay');
const charVisuals = document.getElementById('charVisuals');

// Modals
const sceneModal = document.getElementById('sceneModal');
const profileModal = document.getElementById('profileModal');
const promptModal = document.getElementById('promptModal');
const galleryModal = document.getElementById('galleryModal');
const jsonModal = document.getElementById('jsonModal');
const deleteModal = document.getElementById('deleteModal');

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

// Gallery Elements
const imageInput = document.getElementById('imageInput');
const uploadBtn = document.getElementById('uploadBtn');
const galleryGrid = document.getElementById('galleryGrid');

// Pagination
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageIndicator = document.getElementById('pageIndicator');

// State
let profileData = null;
let currentPage = 1;
const itemsPerPage = 8;
let currentSceneIdForUpload = null;
let sceneIdToDelete = null;

// Init
async function init() {
    await fetchProfile();
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

// Fetch Data
async function fetchProfile() {
    try {
        const res = await fetch(`${API_BASE}/profile`);
        profileData = await res.json();
    } catch (err) {
        console.error("Failed to fetch profile", err);
        showToast("Failed to connect to server.", 'error');
    }
}

// Render UI with Pagination
function render() {
    if (!profileData) return;

    // Character Info
    const char = profileData.character;
    charNameDisplay.textContent = char.name;
    charAgeDisplay.textContent = char.age;

    // Display personality and background if available
    let visualsText = `${char.ethnicity}, ${char.hair}. ${char.face.features}`;
    if (char.personality) {
        visualsText += ` | ${char.personality.traits.slice(0, 3).join(', ')}`;
    }
    if (char.background) {
        visualsText += ` | ${char.background.occupation}`;
    }
    charVisuals.textContent = visualsText;

    // Sort scenes by updatedAt desc (most recent first)
    let scenes = [...profileData.scenes];
    scenes.sort((a, b) => {
        const dateA = new Date(a.updatedAt || 0);
        const dateB = new Date(b.updatedAt || 0);
        return dateB - dateA;
    });

    sceneCount.textContent = scenes.length;

    // Pagination Logic
    const totalPages = Math.ceil(scenes.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pagedScenes = scenes.slice(start, end);

    scenesGrid.innerHTML = '';

    pagedScenes.forEach(scene => {
        const card = document.createElement('div');
        card.className = 'scene-card glass-panel';

        const imgCount = scene.generated_images ? scene.generated_images.length : 0;
        const lastUpdated = scene.updatedAt ? new Date(scene.updatedAt).toLocaleDateString() : 'N/A';

        let thumbHtml = '';
        if (imgCount > 0) {
            // Sort images by path string descending to get the latest timestamp
            // Assumption: filenames are timestamps or sequential
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
                <p><i class="fas fa-video"></i> ${scene.action}</p>
                <p><i class="fas fa-map-marker-alt"></i> ${scene.setting}</p>
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

        // Interactive Title & Thumbnail
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
            body: JSON.stringify({ scene })
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

    sceneModal.classList.add('show');
}

function openGalleryModal(scene) {
    currentSceneIdForUpload = scene.id;
    galleryGrid.innerHTML = '';

    if (scene.generated_images && scene.generated_images.length > 0) {
        scene.generated_images.forEach(url => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            div.innerHTML = `<img src="${url}" onclick="window.open('${url}','_blank')">`;
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
    document.getElementById('deleteTargetName').textContent = scene.name;
    deleteModal.classList.add('show');
}

// Delete Logic
confirmDeleteBtn.addEventListener('click', async () => {
    if (!sceneIdToDelete) return;

    confirmDeleteBtn.textContent = "Deleting...";
    confirmDeleteBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/scenes/${sceneIdToDelete}`, {
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
    } catch (err) {
        console.error(err);
        showToast("Error deleting scene", 'error');
    } finally {
        confirmDeleteBtn.textContent = "Delete Forever";
        confirmDeleteBtn.disabled = false;
        sceneIdToDelete = null;
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
            body: JSON.stringify({ scene: updatedScene })
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
                    image: base64
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
            body: JSON.stringify({ [bodyKey]: sceneData })
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

    // Construct deep object from flat form
    const current = profileData.character;

    const updated = {
        ...current,
        name: document.getElementById('pName').value,
        age: document.getElementById('pAge').value,
        ethnicity: document.getElementById('pEthnicity').value,
        hair: document.getElementById('pHair').value,

        body: {
            ...current.body,
            height: document.getElementById('pBodyHeight').value,
            type: document.getElementById('pBodyType').value,
            build: document.getElementById('pBodyBuild').value,
            posture: document.getElementById('pBodyPosture').value
        },

        face: {
            ...current.face,
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
            ...current.base_outfit,
            top: document.getElementById('pOutfitTop').value,
            bottom: document.getElementById('pOutfitBottom').value,
            accessories: document.getElementById('pOutfitAcc').value
        },

        photography: {
            ...current.photography,
            quality: document.getElementById('pPhotoQual').value,
            lighting: document.getElementById('pPhotoLight').value,
            composition: document.getElementById('pPhotoComp').value
        }
    };

    // Add personality if fields exist
    const traitsInput = document.getElementById('pPersonalityTraits').value;
    if (traitsInput) {
        updated.personality = {
            traits: traitsInput.split(',').map(t => t.trim()).filter(t => t),
            mbti: document.getElementById('pPersonalityMbti').value,
            tone: document.getElementById('pPersonalityTone').value
        };
    } else if (current.personality) {
        updated.personality = current.personality;
    }

    // Add background if fields exist
    const hometownInput = document.getElementById('pBackgroundHometown').value;
    if (hometownInput) {
        updated.background = {
            hometown: hometownInput,
            occupation: document.getElementById('pBackgroundOccupation').value,
            education: document.getElementById('pBackgroundEducation').value,
            family: document.getElementById('pBackgroundFamily').value
        };
    } else if (current.background) {
        updated.background = current.background;
    }

    // Preserve core_identity_prompt if exists
    if (current.core_identity_prompt) {
        updated.core_identity_prompt = current.core_identity_prompt;
    }

    try {
        const res = await fetch(`${API_BASE}/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character: updated })
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
    const totalPages = Math.ceil(profileData.scenes.length / itemsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        render();
    }
});

// Helpers
function resetForm() {
    sceneForm.reset();
    document.getElementById('sceneId').value = '';
    document.getElementById('sceneModalTitle').textContent = "Add New Scene";
}

addSceneBtn.addEventListener('click', () => {
    resetForm();
    sceneModal.classList.add('show');
});

editProfileBtn.addEventListener('click', () => {
    const char = profileData.character;

    // Basic
    document.getElementById('pName').value = char.name;
    document.getElementById('pAge').value = char.age;
    document.getElementById('pEthnicity').value = char.ethnicity;
    document.getElementById('pHair').value = char.hair;

    // Body
    document.getElementById('pBodyHeight').value = char.body.height;
    document.getElementById('pBodyType').value = char.body.type;
    document.getElementById('pBodyBuild').value = char.body.build;
    document.getElementById('pBodyPosture').value = char.body.posture;

    // Face
    document.getElementById('pFaceShape').value = char.face.shape;
    document.getElementById('pFaceSkin').value = char.face.skin;
    document.getElementById('pFaceCheekbones').value = char.face.cheekbones;
    document.getElementById('pFaceEyes').value = char.face.eyes;
    document.getElementById('pFaceEyebrows').value = char.face.eyebrows;
    document.getElementById('pFaceNose').value = char.face.nose;
    document.getElementById('pFaceLips').value = char.face.lips;
    document.getElementById('pFaceFeatures').value = char.face.features;

    // Outfit
    document.getElementById('pOutfitTop').value = char.base_outfit.top;
    document.getElementById('pOutfitBottom').value = char.base_outfit.bottom;
    document.getElementById('pOutfitAcc').value = char.base_outfit.accessories || '';

    // Photo
    document.getElementById('pPhotoQual').value = char.photography.quality;
    document.getElementById('pPhotoLight').value = char.photography.lighting;
    document.getElementById('pPhotoComp').value = char.photography.composition;

    // Personality
    if (char.personality) {
        document.getElementById('pPersonalityTraits').value = char.personality.traits ? char.personality.traits.join(', ') : '';
        document.getElementById('pPersonalityMbti').value = char.personality.mbti || '';
        document.getElementById('pPersonalityTone').value = char.personality.tone || '';
    }

    // Background
    if (char.background) {
        document.getElementById('pBackgroundHometown').value = char.background.hometown || '';
        document.getElementById('pBackgroundOccupation').value = char.background.occupation || '';
        document.getElementById('pBackgroundEducation').value = char.background.education || '';
        document.getElementById('pBackgroundFamily').value = char.background.family || '';
    }

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
        deleteModal.classList.remove('show');
    });
});

// Copy Logic
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(generatedPromptText.textContent)
        .then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            showToast("Prompt copied to clipboard");
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
});

// Init
init();
