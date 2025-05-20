document.addEventListener("DOMContentLoaded", () => {
  // Récupération des éléments DOM
  const cardContainer = document.getElementById("promoContainer");
  const tableContainer = document.getElementById("tableContainer");
  const tableBody = document.getElementById("tableBody");
  const cardViewBtn = document.getElementById("cardViewBtn");
  const tableViewBtn = document.getElementById("tableViewBtn");

  // Éléments du modal
  const addPromoBtn = document.querySelector("button.bg-orange-500.text-white.px-4.py-2.rounded-lg");
  const addPromoModal = document.getElementById("addPromoModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelModalBtn = document.getElementById("cancelModalBtn");
  const referentielsContainer = document.getElementById("referentielsContainer");
  const addPromoForm = document.getElementById("addPromoForm");

  // Variables de pagination
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalPages = 1;
  let allPromotions = [];
  let referentielsList = [];
  let currentView = "cards";

  // Écouteurs d'événements
  addPromoBtn.addEventListener("click", openAddPromoModal);
  closeModalBtn.addEventListener("click", closeAddPromoModal);
  cancelModalBtn.addEventListener("click", closeAddPromoModal);
  addPromoModal.addEventListener("click", (e) => e.target === addPromoModal && closeAddPromoModal());
  cardViewBtn.addEventListener("click", () => currentView !== "cards" && switchView("cards"));
  tableViewBtn.addEventListener("click", () => currentView !== "table" && switchView("table"));
  addPromoForm.addEventListener("submit", handleFormSubmit);
  document.getElementById("statusFilter").addEventListener("change", () => {
    currentPage = 1;
    applyFiltersAndPagination();
  });
  document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    applyFiltersAndPagination();
  });
  document.getElementById('itemsPerPage').addEventListener('change', (e) => {
    itemsPerPage = parseInt(e.target.value);
    currentPage = 1;
    applyFiltersAndPagination();
  });
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      applyFiltersAndPagination();
    }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      applyFiltersAndPagination();
    }
  });

  async function loadData() {
    try {
      const [promotionsRes, utilisateursRes, referentielsRes] = await Promise.all([
        fetch('http://localhost:3000/promotions'),
        fetch('http://localhost:3000/utilisateurs'),
        fetch('http://localhost:3000/referentiels')
      ]);
      
      if (!promotionsRes.ok || !utilisateursRes.ok || !referentielsRes.ok) {
        throw new Error('Erreur de chargement des données');
      }
      
      return {
        promotions: await promotionsRes.json(),
        utilisateurs: await utilisateursRes.json(),
        referentiels: await referentielsRes.json()
      };
    } catch (error) {
      console.error('Erreur:', error);
      return null;
    }
  }

  async function displayStats() {
    const data = await loadData();
    if (data) {
      const apprenants = data.utilisateurs.filter(u => u.role === "Apprenant").length;
      const referentiels = data.referentiels.length;
      const promoActive = data.promotions.filter(p => p.statut === "active").length;
      const totalPromo = data.promotions.length;

      document.getElementById('Apprenant').textContent = apprenants.toLocaleString();
      document.getElementById('Référentiel').textContent = referentiels.toLocaleString();
      document.getElementById('PromoActive').textContent = promoActive.toLocaleString();
      document.getElementById('TotalPromo').textContent = totalPromo.toLocaleString();
    }
  }

  // Fonctions pour le modal
  function openAddPromoModal() {
    addPromoModal.classList.remove("hidden");
    document.querySelector("#addPromoModal h3").textContent = 
      addPromoForm.dataset.editingId ? "Modifier la promotion" : "Ajouter une nouvelle promotion";
    loadReferentielsForModal();
  }

  function closeAddPromoModal() {
    addPromoModal.classList.add("hidden");
    addPromoForm.reset();
    delete addPromoForm.dataset.editingId;
    document.querySelector("#addPromoModal h3").textContent = "Ajouter une nouvelle promotion";
    clearValidationErrors();
  }

  function resetAddPromoForm() {
    addPromoForm.reset();
    delete addPromoForm.dataset.editingId;
    document.querySelector("#addPromoModal h3").textContent = "Ajouter une nouvelle promotion";
    clearValidationErrors();
  }

  async function getNextId(endpoint) {
    const response = await fetch(`http://localhost:3000/${endpoint}`);
    const data = await response.json();
    
    if (!data.length) return "1";
    
    const maxId = Math.max(...data.map(item => 
      typeof item.id === 'string' ? parseInt(item.id) : item.id
    ));
    
    return (maxId + 1).toString();
  }

  async function handleEditPromotion(promoId) {
    try {
      const response = await fetch(`http://localhost:3000/promotions/${promoId}`);
      const promotion = await response.json();
      
      if (!response.ok) throw new Error("Promotion non trouvée");

      document.getElementById("promoName").value = promotion.nom;
      document.getElementById("startDate").value = promotion.date_debut;
      document.getElementById("endDate").value = promotion.date_fin;
      document.getElementById("promoImage").value = promotion.image;
      document.querySelector("input[name='isActive']").checked = promotion.statut === "active";

      const checkboxes = document.querySelectorAll('input[name="referentiels"]');
      checkboxes.forEach(checkbox => {
        checkbox.checked = promotion.referentiels.includes(parseInt(checkbox.value));
      });

      document.querySelector("#addPromoModal h3").textContent = "Modifier la promotion";
      addPromoForm.dataset.editingId = promoId;

      openAddPromoModal();
    } catch (error) {
      console.error("Erreur:", error);
      showAlert("Erreur lors du chargement de la promotion", "error");
    }
  }

  async function handleDeletePromotion(promoId) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette promotion ?")) return;

    try {
      const response = await fetch(`http://localhost:3000/promotions/${promoId}`, {
        method: "DELETE"
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      showAlert("Promotion supprimée avec succès!", "success");
      loadPromotions();
      displayStats();
    } catch (error) {
      console.error("Erreur:", error);
      showAlert("Erreur lors de la suppression de la promotion", "error");
    }
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    clearValidationErrors();

    const promoName = document.getElementById("promoName");
    const startDate = document.getElementById("startDate");
    const endDate = document.getElementById("endDate");
    const checkboxes = document.querySelectorAll('input[name="referentiels"]:checked');

    let isValid = true;

    if (!promoName.value.trim()) {
      showValidationError(promoName, "Le nom de la promotion est requis");
      isValid = false;
    }

    if (!startDate.value) {
      showValidationError(startDate, "La date de début est requise");
      isValid = false;
    }

    if (!endDate.value) {
      showValidationError(endDate, "La date de fin est requise");
      isValid = false;
    } else if (startDate.value && new Date(endDate.value) < new Date(startDate.value)) {
      showValidationError(endDate, "La date de fin doit être après la date de début");
      isValid = false;
    }

    if (checkboxes.length === 0) {
      const errorElement = document.getElementById("referentielsError");
      errorElement.textContent = "Sélectionnez au moins un référentiel";
      errorElement.classList.remove("hidden");
      isValid = false;
    }

    if (!isValid) return;

    try {
      const formData = {
        nom: promoName.value.trim(),
        date_debut: startDate.value,
        date_fin: endDate.value,
        image: document.getElementById("promoImage").value || "https://via.placeholder.com/150",
        statut: document.querySelector("input[name='isActive']").checked ? "active" : "inactive",
        referentiels: Array.from(checkboxes).map(checkbox => parseInt(checkbox.value)),
        nombre_apprenants: 0
      };

      const isEditing = addPromoForm.dataset.editingId;
      let method = 'POST';
      let url = 'http://localhost:3000/promotions';

      if (isEditing) {
        method = 'PUT';
        url = `http://localhost:3000/promotions/${addPromoForm.dataset.editingId}`;
        formData.id = parseInt(addPromoForm.dataset.editingId);
      } else {
        const newId = await getNextId('promotions');
        formData.id = newId;
      }

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error("Erreur lors de l'enregistrement");

      closeAddPromoModal();
      loadPromotions();
      displayStats();
      showAlert(`Promotion ${isEditing ? 'modifiée' : 'ajoutée'} avec succès!`, "success");
    } catch (error) {
      console.error("Erreur:", error);
      showAlert(`Erreur lors de ${addPromoForm.dataset.editingId ? 'la modification' : 'l\'ajout'} de la promotion`, "error");
    }
  }

  function loadReferentielsForModal() {
    referentielsContainer.innerHTML = `
      <div id="referentielsCheckboxes" class="space-y-2 mt-2"></div>
      <div id="referentielsError" class="mt-1 text-sm text-red-600 hidden"></div>
    `;

    const checkboxesContainer = document.getElementById("referentielsCheckboxes");

    if (referentielsList.length === 0) {
      fetch("http://localhost:3000/referentiels")
        .then(res => res.json())
        .then(referentiels => {
          referentielsList = referentiels;
          populateReferentielsCheckboxes(checkboxesContainer, referentiels);
        })
        .catch(error => {
          console.error("Erreur:", error);
          referentielsContainer.innerHTML = "<p class='text-red-500 text-sm'>Impossible de charger les référentiels</p>";
        });
    } else {
      populateReferentielsCheckboxes(checkboxesContainer, referentielsList);
    }
  }

  function populateReferentielsCheckboxes(container, referentiels) {
    referentiels.forEach(ref => {
      const checkboxDiv = document.createElement("div");
      checkboxDiv.className = "flex items-center";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.name = "referentiels";
      checkbox.value = ref.id;
      checkbox.id = `referentiel-${ref.id}`;
      checkbox.className = "h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded";

      const label = document.createElement("label");
      label.htmlFor = `referentiel-${ref.id}`;
      label.className = "ml-2 block text-sm text-gray-700";
      label.textContent = ref.nom;

      checkboxDiv.appendChild(checkbox);
      checkboxDiv.appendChild(label);
      container.appendChild(checkboxDiv);
    });
  }

  function showValidationError(inputElement, message) {
    const errorElement = document.createElement("div");
    errorElement.className = "mt-1 text-sm text-red-600";
    errorElement.textContent = message;

    inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);

    inputElement.classList.add("border-red-500");
    inputElement.classList.remove("border-gray-300", "focus:ring-orange-500", "focus:border-orange-500");
    inputElement.classList.add("focus:ring-red-500", "focus:border-red-500");
  }

  function clearValidationErrors() {
    document.querySelectorAll(".text-red-600").forEach(el => {
      if (el.id !== "referentielsError") el.remove();
    });

    const referentielsError = document.getElementById("referentielsError");
    if (referentielsError) {
      referentielsError.textContent = "";
      referentielsError.classList.add("hidden");
    }

    document.querySelectorAll("input, select").forEach(input => {
      input.classList.remove("border-red-500", "focus:ring-red-500", "focus:border-red-500");
      input.classList.add("border-gray-300", "focus:ring-orange-500", "focus:border-orange-500");
    });
  }

  function switchView(view) {
    currentView = view;

    if (view === "cards") {
      cardContainer.classList.remove("hidden");
      tableContainer.classList.add("hidden");
      cardViewBtn.classList.add("bg-orange-500", "text-white");
      cardViewBtn.classList.remove("bg-gray-200", "hover:bg-gray-300");
      tableViewBtn.classList.remove("bg-orange-500", "text-white");
      tableViewBtn.classList.add("bg-gray-200", "hover:bg-gray-300");
    } else {
      cardContainer.classList.add("hidden");
      tableContainer.classList.remove("hidden");
      tableViewBtn.classList.add("bg-orange-500", "text-white");
      tableViewBtn.classList.remove("bg-gray-200", "hover:bg-gray-300");
      cardViewBtn.classList.remove("bg-orange-500", "text-white");
      cardViewBtn.classList.add("bg-gray-200", "hover:bg-gray-300");
    }
  }

  function loadPromotions() {
    cardContainer.innerHTML = "";
    tableBody.innerHTML = "";

    Promise.all([
      fetch("http://localhost:3000/referentiels").then(res => res.json()),
      fetch("http://localhost:3000/promotions").then(res => res.json())
    ])
      .then(([referentiels, promotions]) => {
        const referentielsMap = createReferentielsMap(referentiels);
        allPromotions = promotions;
        referentielsList = referentiels;
        applyFiltersAndPagination();
      })
      .catch(error => {
        console.error("Erreur:", error);
        showErrorMessages();
      });
  }

  function applyFiltersAndPagination() {
    const filtered = filterPromotionsData();
    totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    currentPage = Math.min(currentPage, totalPages);

    const paginatedData = getPaginatedData(filtered);
    const referentielsMap = createReferentielsMap(referentielsList);

    renderPromotions(paginatedData, referentielsMap);
    updatePaginationControls(filtered.length);
  }

  function filterPromotionsData() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    return allPromotions.filter(promo => {
      const nameMatch = promo.nom.toLowerCase().includes(searchTerm);
      const statusMatch = statusFilter === 'all' ||
        (statusFilter === 'active' && promo.statut === 'active') ||
        (statusFilter === 'inactive' && promo.statut === 'inactive');
      return nameMatch && statusMatch;
    });
  }

  function getPaginatedData(data) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }

  function updatePaginationControls(totalItems) {
    totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;

    const pageNumbersContainer = document.getElementById('pageNumbers');
    pageNumbersContainer.innerHTML = '';

    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      const pageBtn = createPageButton(1);
      pageNumbersContainer.appendChild(pageBtn);
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-2 py-1 text-gray-600';
        ellipsis.textContent = '...';
        pageNumbersContainer.appendChild(ellipsis);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbersContainer.appendChild(createPageButton(i));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-2 py-1 text-gray-600';
        ellipsis.textContent = '...';
        pageNumbersContainer.appendChild(ellipsis);
      }
      const pageBtn = createPageButton(totalPages);
      pageNumbersContainer.appendChild(pageBtn);
    }
  }

  function createPageButton(pageNumber) {
    const button = document.createElement('button');
    button.className = `px-3 py-1 rounded-md text-sm ${currentPage === pageNumber ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`;
    button.textContent = pageNumber;
    button.addEventListener('click', () => {
      currentPage = pageNumber;
      applyFiltersAndPagination();
    });
    return button;
  }

  function createReferentielsMap(referentiels) {
    const map = {};
    referentiels.forEach(ref => map[ref.id] = ref.nom);
    return map;
  }

  function renderPromotions(promotions, referentielsMap) {
    cardContainer.innerHTML = "";
    tableBody.innerHTML = "";

    promotions.forEach(promo => {
      cardContainer.appendChild(createPromoCard(promo, referentielsMap));
      tableBody.appendChild(createPromoTableRow(promo, referentielsMap));
    });
  }

  function createPromoCard(promo, referentielsMap) {
    const card = document.createElement("div");
    card.className = "h-full";
    card.innerHTML = `
      <div class="flex flex-col h-full border-t-4 ${promo.statut === 'active' ? 'border-green-500' : 'border-red-500'} bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div class="p-4 flex-grow flex flex-col">
          <div class="flex justify-between items-start mb-3">
            <div>
              <h2 class="text-xl font-bold text-gray-800 truncate">${promo.nom}</h2>
              <div class="text-xs space-x-1">
                <span>${formatDate(promo.date_debut)}</span>
                <span>-</span>
                <span>${formatDate(promo.date_fin)}</span>
              </div>
            </div>
            <img src="${promo.image}" alt="${promo.nom}" 
                 class="w-10 h-10 object-cover rounded-full border-2 border-white shadow-md ml-4">
          </div>
          
          <div class="space-y-2 text-gray-600 mb-4">
            <div class="flex items-center">
              <i class="ri-group-line text-orange-500 mr-2"></i>
              <span>${promo.nombre_apprenants} Apprenant${promo.nombre_apprenants > 1 ? 's' : ''}</span>
            </div>
            <div class="flex items-center">
              <i class="ri-book-2-line text-orange-500 mr-2"></i>
              <span class="text-sm truncate">${getReferentielsList(promo, referentielsMap)}</span>
            </div>
          </div>
    
          <div class="mt-auto grid grid-cols-2 space-x-2 pt-3 border-t border-gray-100 items-center">
            <div>
              <span class="text-xs font-semibold px-2 py-1 rounded-full ${promo.statut === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                ${promo.statut === 'active' ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div class="flex justify-end">
              <button class="edit-btn text-orange-500 hover:text-orange-700 p-1 rounded-full hover:bg-orange-50 transition-colors">
                <i class="ri-edit-line text-lg"></i>
              </button>
              <button class="delete-btn text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors">
                <i class="ri-delete-bin-line text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    card.querySelector('.edit-btn').addEventListener('click', () => handleEditPromotion(promo.id));
    card.querySelector('.delete-btn').addEventListener('click', () => handleDeletePromotion(promo.id));
    
    return card;
  }

  function createPromoTableRow(promo, referentielsMap) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-10 w-10">
            <img src="${promo.image}" alt="${promo.nom}" class="h-10 w-10 rounded-full object-cover">
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="ml-4">
          <div class="text-sm font-medium text-gray-900">${promo.nom}</div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${formatDate(promo.date_debut)}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${formatDate(promo.date_fin)}</div>
      </td>
      <td class="px-6 py-4 whitespace-normal">
        <div class="flex flex-wrap gap-1">${getReferentielsBadges(promo, referentielsMap)}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${promo.statut === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          ${promo.statut === 'active' ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div class="flex gap-2">
          <button class="edit-btn text-orange-500 hover:text-orange-700">
            <i class="ri-edit-line"></i>
          </button>
          <button class="delete-btn text-red-500 hover:text-red-700">
            <i class="ri-delete-bin-line"></i>
          </button>
        </div>
      </td>
    `;
    
    row.querySelector('.edit-btn').addEventListener('click', () => handleEditPromotion(promo.id));
    row.querySelector('.delete-btn').addEventListener('click', () => handleDeletePromotion(promo.id));
    
    return row;
  }

  function getReferentielsList(promo, referentielsMap) {
    return promo.referentiels.map(id => referentielsMap[id]).join(", ");
  }

  function getReferentielsBadges(promo, referentielsMap) {
    const badgeColors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-yellow-100 text-yellow-800",
      "bg-purple-100 text-purple-800",
      "bg-pink-100 text-pink-800"
    ];

    return promo.referentiels
      .map((id, index) => {
        const colorClass = badgeColors[index % badgeColors.length];
        return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} mr-1 mb-1">
                  ${referentielsMap[id]}
                </span>`;
      })
      .join("");
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }

  function showErrorMessages() {
    cardContainer.innerHTML = "<p class='text-red-500'>Impossible de charger les données.</p>";
    tableBody.innerHTML = "<tr><td colspan='6' class='px-6 py-4 text-red-500'>Impossible de charger les données.</td></tr>";
  }

  function showAlert(message, type) {
    const alert = document.createElement("div");
    alert.className = `fixed top-4 right-4 px-6 py-4 rounded-md shadow-lg ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`;
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => {
      alert.classList.add("opacity-0", "transition-opacity", "duration-500");
      setTimeout(() => alert.remove(), 500);
    }, 8000);
  }

  // Initialisation
  displayStats();
  switchView("cards");
  loadPromotions();
  resetAddPromoForm();
});