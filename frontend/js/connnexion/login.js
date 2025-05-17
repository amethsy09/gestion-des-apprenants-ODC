document.addEventListener("DOMContentLoaded", function () {
  redirectRole();
});

document.getElementById("form").addEventListener("submit", function (e) {
  e.preventDefault();
  login();
});

function login() {
  // Reset errors
  document.getElementById("email-error").classList.add("hidden");
  document.getElementById("password-error").classList.add("hidden");
  document.getElementById("login-error").classList.add("hidden");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  let isValid = true;

  // Email validation
  if (!email) {
    showError("email-error", "L'email est obligatoire.");
    isValid = false;
  } else if (!validateEmail(email)) {
    showError("email-error", "Veuillez entrer un email valide (ex: exemple@domaine.com).");
    isValid = false;
  }

  // Password validation
  if (!password) {
    showError("password-error", "Le mot de passe est obligatoire.");
    isValid = false;
  } else if (password.length < 6) {
    showError("password-error", "Le mot de passe doit contenir au moins 6 caractères.");
    isValid = false;
  }

  if (!isValid) return;

  // Authentication
  authenticateUser(email, password);
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError(elementId, message) {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.classList.remove("hidden");
}

async function authenticateUser(email, password) {
  try {
    const response = await fetch('http://localhost:3000/utilisateurs');
    const data = await response.json();
    const users = data;

    const user = users.find(u => u.email === email && u.mot_de_passe === password);

    if (!user) {
      showError("login-error", "Email ou mot de passe incorrect.");
      return;
    }

    localStorage.setItem('utilisateurConnecte', JSON.stringify(user));
    redirectUser(user.role);

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    showError("login-error", "Une erreur est survenue lors de la connexion.");
  }
}

function redirectUser(role) {
  switch (role) {
    case 'Admin':
      window.location.href = '../../html/admin/promo.html';
      break;
    case 'Vigile':
      window.location.href = '../html/vigile-dashboard.html';
      break;
    case 'Apprenant':
      window.location.href = '../html/apprenant-dashboard.html';
      break;
    default:
      window.location.href = 'dashboard.html';
  }
}

function redirectRole() {
  const user = JSON.parse(localStorage.getItem('utilisateurConnecte'));
  if (user) {
    redirectUser(user.role);
  }
}

function logout() {
  localStorage.removeItem('utilisateurConnecte');
  window.location.href = '../../html/auth/index.html';
  document.getElementById("form").reset();
  
}
