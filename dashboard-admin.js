const SUPABASE_URL =
  "https://cbxjcwjlhvicurpndoyz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


const SESSION_KEY =
  "rolex_admin_session_token";


const token =
  localStorage.getItem(SESSION_KEY);


if (!token) {
  window.location.href = "index.html";
}


/* =========================
   MODULES
========================= */

const permissionModules = {

  "deposits.view": {
    title: "Dépôts",
    description: "Gestion et suivi des dépôts",
    icon: "fa-money-bill-transfer",
    page: "admin-depots.html"
  },

  "investments.view": {
    title: "Investissements",
    description: "Suivi des investissements",
    icon: "fa-chart-column",
    page: "admin-investissements.html"
  },

  "withdrawals.view": {
    title: "Retraits",
    description: "Gestion des demandes de retrait",
    icon: "fa-wallet",
    page: "admin-retraits.html"
  },

  "payments.view": {
    title: "Paiements",
    description: "Suivi des paiements",
    icon: "fa-credit-card",
    page: "admin-paiements.html"
  }

};


const superModules = [

  {
    title: "Utilisateurs",
    description: "Administration des comptes",
    icon: "fa-users",
    page: "admin-utilisateurs.html"
  },

  {
    title: "Produits",
    description: "Gestion des produits",
    icon: "fa-box-open",
    page: "admin-produits.html"
  },

  {
    title: "Administrateurs",
    description: "Gestion des accès",
    icon: "fa-user-shield",
    page: "admin-administrateurs.html"
  },

  {
    title: "Paramètres",
    description: "Configuration de ROLEX",
    icon: "fa-sliders",
    page: "admin-parametres.html"
  }

];


/* =========================
   STATISTIQUES
========================= */

const statDefinitions = [

  {
    key: "pending_deposits",
    label: "Dépôts à traiter",
    icon: "fa-clock",
    money: false
  },

  {
    key: "total_deposits",
    label: "Dépôts approuvés",
    icon: "fa-money-bill-trend-up",
    money: true
  },

  {
    key: "active_investments",
    label: "Investissements actifs",
    icon: "fa-chart-line",
    money: false
  },

  {
    key: "total_invested",
    label: "Montant investi",
    icon: "fa-coins",
    money: true
  },

  {
    key: "pending_withdrawals",
    label: "Retraits à traiter",
    icon: "fa-hourglass-half",
    money: false
  },

  {
    key: "total_withdrawals",
    label: "Retraits approuvés",
    icon: "fa-money-bill-transfer",
    money: true
  },

  {
    key: "total_users",
    label: "Utilisateurs",
    icon: "fa-users",
    money: false
  },

  {
    key: "active_users",
    label: "Utilisateurs actifs",
    icon: "fa-user-check",
    money: false
  },

  {
    key: "blocked_users",
    label: "Utilisateurs bloqués",
    icon: "fa-user-lock",
    money: false
  },

  {
    key: "active_products",
    label: "Produits actifs",
    icon: "fa-box-open",
    money: false
  },

  {
    key: "total_balance",
    label: "Solde utilisateurs",
    icon: "fa-wallet",
    money: true
  },

  {
    key: "total_profit",
    label: "Profit utilisateurs",
    icon: "fa-arrow-trend-up",
    money: true
  },

  {
    key: "total_commissions",
    label: "Commissions",
    icon: "fa-network-wired",
    money: true
  }

];


/* =========================
   FORMAT
========================= */

function formatNumber(value) {

  return new Intl.NumberFormat(
    "fr-FR"
  ).format(
    Number(value || 0)
  );

}


function formatMoney(value) {

  return `${formatNumber(value)} XOF`;

}


function getInitials(name) {

  if (!name) {
    return "A";
  }

  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (parts.length === 1) {

    return parts[0]
      .substring(0, 1)
      .toUpperCase();

  }

  return (
    parts[0].substring(0, 1) +
    parts[parts.length - 1].substring(0, 1)
  ).toUpperCase();

}


/* =========================
   ERREUR
========================= */

function showError(message) {

  const box =
    document.getElementById("errorBox");

  box.textContent = message;

  box.style.display = "block";

}


function hideError() {

  const box =
    document.getElementById("errorBox");

  box.textContent = "";

  box.style.display = "none";

}


/* =========================
   ADMIN
========================= */

function renderAdmin(data) {

  const admin =
    data.admin;

  document.getElementById(
    "adminName"
  ).textContent =
    admin.full_name ||
    "Administrateur";


  document.getElementById(
    "adminPosition"
  ).textContent =
    admin.position ||
    (
      admin.role === "super_admin"
        ? "Super administrateur"
        : "Administrateur"
    );


  document.getElementById(
    "adminAvatar"
  ).textContent =
    getInitials(
      admin.full_name
    );


  const roleLabel =
    document.getElementById(
      "roleLabel"
    );


  if (
    admin.role === "super_admin"
  ) {

    roleLabel.textContent =
      "Accès super administrateur";

  } else {

    roleLabel.textContent =
      admin.position ||
      "Accès administrateur limité";

  }

}


/* =========================
   STATISTIQUES
========================= */

function renderStats(data) {

  const grid =
    document.getElementById(
      "statsGrid"
    );

  const stats =
    data.stats || {};


  const available =
    statDefinitions.filter(
      item =>
        Object.prototype.hasOwnProperty.call(
          stats,
          item.key
        )
    );


  if (!available.length) {

    grid.innerHTML = `
      <div class="loading">
        Aucune statistique disponible pour ce compte.
      </div>
    `;

    return;
  }


  grid.innerHTML =
    available.map(item => {

      const value =
        item.money
          ? formatMoney(stats[item.key])
          : formatNumber(stats[item.key]);


      return `
        <article class="stat-card">

          <div class="stat-top">

            <div class="stat-label">
              ${item.label}
            </div>

            <div class="stat-icon">
              <i class="fa-solid ${item.icon}"></i>
            </div>

          </div>

          <div class="stat-value ${item.money ? "money" : ""}">
            ${value}
          </div>

        </article>
      `;

    }).join("");

}


/* =========================
   MODULES
========================= */

function renderModules(data) {

  const grid =
    document.getElementById(
      "moduleGrid"
    );

  const admin =
    data.admin;


  let modules = [];


  if (
    admin.role === "super_admin"
  ) {

    modules = [

      ...Object.values(
        permissionModules
      ),

      ...superModules

    ];

  } else {

    const permissions =
      Array.isArray(data.permissions)
        ? data.permissions
        : [];


    modules =
      permissions
        .filter(
          permission =>
            permissionModules[permission]
        )
        .map(
          permission =>
            permissionModules[permission]
        );

  }


  if (!modules.length) {

    grid.innerHTML = `
      <div class="loading">
        Aucun module accessible.
      </div>
    `;

    return;
  }


  grid.innerHTML =
    modules.map(module => {

      return `
        <article
          class="module"
          data-page="${module.page}"
        >

          <div class="module-icon">
            <i class="fa-solid ${module.icon}"></i>
          </div>

          <div>

            <strong>
              ${module.title}
            </strong>

            <span>
              ${module.description}
            </span>

          </div>

        </article>
      `;

    }).join("");


  document
    .querySelectorAll(".module[data-page]")
    .forEach(module => {

      module.addEventListener(
        "click",
        () => {

          window.location.href =
            module.dataset.page;

        }
      );

    });

}


/* =========================
   NAVIGATION
========================= */

function applyNavigationPermissions(data) {

  const admin =
    data.admin;


  document
    .querySelectorAll(
      "[data-permission]"
    )
    .forEach(item => {

      const permission =
        item.dataset.permission;


      const allowed =
        admin.role === "super_admin" ||
        (
          Array.isArray(data.permissions) &&
          data.permissions.includes(permission)
        );


      item.style.display =
        allowed
          ? "flex"
          : "none";

    });


  document
    .querySelectorAll(
      ".super-only"
    )
    .forEach(item => {

      item.style.display =
        admin.role === "super_admin"
          ? "flex"
          : "none";

    });

}


/* =========================
   CHARGEMENT
========================= */

async function loadDashboard() {

  hideError();


  if (!token) {

    window.location.href =
      "index.html";

    return;

  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_admin_dashboard",
      {
        p_token: token
      }
    );


  if (error) {

    console.error(
      "get_admin_dashboard:",
      error
    );


    localStorage.removeItem(
      "rolex_admin_session_token"
    );

    localStorage.removeItem(
      "rolex_admin_id"
    );

    localStorage.removeItem(
      "rolex_admin_role"
    );

    localStorage.removeItem(
      "rolex_admin_user_code"
    );

    localStorage.removeItem(
      "rolex_admin_name"
    );


    showError(
      "Session administrateur invalide ou expirée."
    );


    setTimeout(() => {

      window.location.href =
        "index.html";

    }, 1200);


    return;

  }


  if (
    !data ||
    !data.admin
  ) {

    localStorage.removeItem(
      SESSION_KEY
    );

    window.location.href =
      "index.html";

    return;

  }


  renderAdmin(data);

  renderStats(data);

  renderModules(data);

  applyNavigationPermissions(data);


  if (data.server_time) {

    const date =
      new Date(
        data.server_time
      );


    document.getElementById(
      "serverTime"
    ).textContent =
      `Dernière synchronisation serveur : ${date.toLocaleString("fr-FR")}`;

  }

}


/* =========================
   MENU MOBILE
========================= */

function setupMenu() {

  const sidebar =
    document.getElementById(
      "sidebar"
    );

  const toggle =
    document.getElementById(
      "menuToggle"
    );


  toggle.addEventListener(
    "click",
    () => {

      sidebar.classList.toggle(
        "open"
      );


      const icon =
        toggle.querySelector("i");


      icon.className =
        sidebar.classList.contains("open")
          ? "fa-solid fa-xmark"
          : "fa-solid fa-bars";

    }
  );

}


/* =========================
   BOUTONS MENU
========================= */

function setupNavigation() {

  document
    .querySelectorAll(
      ".nav-item[data-page]"
    )
    .forEach(item => {

      item.addEventListener(
        "click",
        () => {

          const page =
            item.dataset.page;


          if (!page) {
            return;
          }


          window.location.href =
            page;

        }
      );

    });

}


/* =========================
   DECONNEXION
========================= */

function setupLogout() {

  const button =
    document.getElementById(
      "logoutBtn"
    );


  button.addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        "rolex_admin_session_token"
      );

      localStorage.removeItem(
        "rolex_admin_id"
      );

      localStorage.removeItem(
        "rolex_admin_role"
      );

      localStorage.removeItem(
        "rolex_admin_user_code"
      );

      localStorage.removeItem(
        "rolex_admin_name"
      );


      window.location.href =
        "index.html";

    }
  );

}


/* =========================
   INITIALISATION
========================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupMenu();

    setupNavigation();

    setupLogout();

    await loadDashboard();


    /*
      Actualisation toutes les 60 secondes.
      Les données sont toujours récupérées
      depuis Supabase.
    */

    setInterval(
      loadDashboard,
      60000
    );

  }
);
