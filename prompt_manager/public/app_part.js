
function openJsonModal(scene) {
    // Formatting JSON nicely
    jsonEditor.value = JSON.stringify(scene, null, 2);
    jsonModal.classList.add('show');
}

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
            await fetchProfile();
            render();
        } else {
            alert("Failed to save JSON");
        }
    } catch (err) {
        alert("Invalid JSON: " + err.message);
    }
});

async function deleteScene(id) {
    if (!confirm(`Are you sure you want to delete scene ${id}?`)) return;

    try {
        const res = await fetch(`${API_BASE}/scenes/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            await fetchProfile();
            render();
        } else {
            alert("Failed to delete scene");
        }
    } catch (err) {
        console.error(err);
    }
}
