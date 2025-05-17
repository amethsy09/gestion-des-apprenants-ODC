document.addEventListener("DOMContentLoaded", () => {
    const navbarElement = document.getElementById("navbar");

    if (navbarElement) {
        fetch('../composant/navbar.html') 
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.text();
            })
            .then(data => {
                navbarElement.innerHTML = data;
                document.body.style.paddingTop = '80px';
                
                // Charger les données utilisateur après l'injection du HTML
                loadUserInfo();
            })
            .catch(error => {
                console.error("Erreur de chargement de la navbar:", error);
            });
    }
});

function loadUserInfo() {
    try {
        const userData = JSON.parse(localStorage.getItem('currentUser'));
        
        if (!userData) {
            console.warn("Aucun utilisateur en session");
            return;
        }

        // Vérification périodique que les éléments existent
        const checkInterval = setInterval(() => {
            const firstNameEl = document.getElementById('userFirstName');
            const lastNameEl = document.getElementById('userLastName');
            
            if (firstNameEl && lastNameEl) {
                clearInterval(checkInterval);
                
                // Vérification supplémentaire des données
                if (userData.prenom && userData.nom) {
                    firstNameEl.textContent = userData.prenom;
                    lastNameEl.textContent = userData.nom;
                } else {
                    // Si les données sont incomplètes, faire une requête API
                    fetchUserDetails(userData.id);
                }
            }
        }, 100);
    } catch (error) {
        console.error("Erreur de traitement des données utilisateur:", error);
    }
}

function fetchUserDetails(userId) {
    fetch(`http://localhost:3000/utilisateurs/${userId}`)
        .then(response => {
            if (!response.ok) throw new Error('Erreur réseau');
            return response.json();
        })
        .then(userDetails => {
            const firstNameEl = document.getElementById('userFirstName');
            const lastNameEl = document.getElementById('userLastName');
            
            if (firstNameEl) firstNameEl.textContent = userDetails.prenom || 'Utilisateur';
            if (lastNameEl) lastNameEl.textContent = userDetails.nom || '';
        })
        .catch(error => {
            console.error("Erreur de récupération des détails utilisateur:", error);
        });
}

