document.addEventListener("DOMContentLoaded", () => {
    const sidebarElement = document.getElementById("sidebar");

    if (sidebarElement) {
        fetch('../composant/sidebar.html')
            .then(response => response.text())
            .then(data => {
                sidebarElement.innerHTML = data;
                displayCurrentDate();

            })
            .catch(error => {
                console.error("Erreur lors du chargement de la barre latérale:", error);
            });
    }
});

document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'logoutBtn') {
        sessionStorage.removeItem('currentUser');
        window.location.href = '../auth/login.html';
    }
});

function displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateElement = document.getElementById('current-date');
    
    if (dateElement) {
        dateElement.textContent = now.toLocaleDateString('fr-FR', options);
    } else {
        console.warn("Élément current-date non trouvé");
    }
}
