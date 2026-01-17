
function cloneScene(scene) {
    resetForm();
    document.getElementById('sceneModalTitle').textContent = "Clone Scene (New)";
    // ID left empty intentionally to create new

    // Pre-fill data
    document.getElementById('sceneName').value = scene.name + " (Copy)";
    document.getElementById('sceneAction').value = scene.action;
    document.getElementById('sceneSetting').value = scene.setting;
    document.getElementById('sceneOutfit').value = scene.outfit_changes || '';
    document.getElementById('sceneLighting').value = scene.lighting || '';
    document.getElementById('sceneView').value = scene.view || '';
    document.getElementById('sceneProps').value = scene.props || '';

    sceneModal.classList.add('show');
    showToast("Cloning scene... Make edits and Save.");
}
