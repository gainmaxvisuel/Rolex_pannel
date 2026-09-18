const SUPABASE_URL = "https://cbxjcwjlhvicurpndoyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const SESSION_KEY = "rolex_admin_session_token";

const token = localStorage.getItem(SESSION_KEY);

if (!token) {
  window.location.href = "index.html";
}

const permissionLabels = {
  "deposits.view": {
    title: "Dépôts",
    description: "Gestion et suivi des dépôts",
    icon: "fa-money-bill-transfer"
  },

  "investments.view": {
    title: "Investissements",
    description: "Suivi des investissements",
    icon: "fa-chart-column"
  },

  "withdrawals.view": {
    title: "Retraits",
    description: "Gestion des demandes de retrait",
    icon: "fa-wallet"
  },

  "payments.view": {
    title: "Paiements",
    description: "Suivi des paiements",
    icon: "fa-credit-card"
  }
};

const superModules = [
  {
    title: "Utilisateurs",
    description: "Administration des comptes utilisateurs",
    icon: "fa-users"
  },
  {
    title: "Produits",
    description: "Gestion des produits",
    icon: "fa-box-open"
  },
  {
    title: "Administrateurs",
    description: "Gestion des accès administrateurs",
    icon: "fa-user-shield"
  },
  {
    title: "Paramètres",
    description: "Configuration de la plateforme",
    icon: "fa-sliders"
  }
];

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

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function formatMoney(value) {
  return `${formatNumber(value)} XOF`;
}

function getInitials(name) {
  if (!name) return "A";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0].substring(0, 1).toUpperCase();
  }

  return (
    parts[0].substring(0, 1) +
    parts[parts.length - 1].substring(0, 1)
  ).toUpperCase();
}

function showError(message) {
  const box = document.getElementById("errorBox");

  box.textContent = message;
  box.style.display = "block";
}

function hideError() {
  const box = document.getElementById("errorBox");

  box.textContent = "";
  box.style.display = "none";
}

function isSuperAdmin(admin) {
  return admin && admin.role === "super_admin";
}

function hasPermission(data, permission) {
  if (!data || !data.admin) {
    return false;
  }

  if (isSuperAdmin(data.admin)) {
    return true;
  }

  return Array.isArray(data.permissions) &&
    data.permissions.includes(permission);
}

function renderAdmin(data) {
  const admin = data.admin;

  document.getElementById("adminName").textContent =
    admin.full_name || "Administrateur";

  document.getElementById("adminPosition").textContent =
    admin.position ||
    (admin.role === "super_admin"
      ? "Super administrateur"
      : "Administrateur");

  document.getElementById("adminAvatar").textContent =
    getInitials(admin.full_name);

  const roleLabel = document.getElementById("roleLabel");

  if (admin.role === "super_admin") {
    roleLabel.textContent = "Accès super administrateur";
  } else {
    roleLabel.textContent =
      admin.position || "Accès administrateur limité";
  }
}

function renderStats(data) {
  const grid = document.getElementById("statsGrid");
  const stats = data.stats || {};

  const available = statDefinitions.filter(
    item => Object.prototype.hasOwnProperty.call(stats, item.key)
  );

  if (available.length === 0) {
    grid.innerHTML = `
      <div class="loading">
        Aucune statistique disponible pour ce compte administrateur.
      </div>
    `;
    return;
  }

  grid.innerHTML = available.map(item => {
    const value = item.money
      ? formatMoney(stats[item.key])
      : formatNumber(stats[item.key]);

    return `
      <article class="stat-card">
        <div class="stat-top">
          <div class="stat-label">${item.label}</div>

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

function renderModules(data) {
  const grid = document.getElementById("moduleGrid");
  const admin = data.admin;

  let modules = [];

  if (isSuperAdmin(admin)) {
    modules = superModules.map(module => ({
      ...module,
      accessible: true
    }));

    const permissionModules = Object.values(permissionLabels).map(module => ({
      ...module,
      accessible: true
    }));

    modules = [
      ...permissionModules,
      ...modules
    ];
  } else {
    const permissions = Array.isArray(data.permissions)
      ? data.permissions
      : [];

    modules = permissions
      .filter(permission => permissionLabels[permission])
      .map(permission => ({
        ...permissionLabels[permission],
        accessible: true
      }));
  }

  if (modules.length === 0) {
    grid.innerHTML = `
      <div class="loading">
        Aucun module accessible avec les permissions actuelles.
      </div>
    `;
    return;
  }

  grid.innerHTML = modules.map(module => `
    <article class="module ${module.accessible ? "" : "empty-module"}">
      <div class="module-icon">
        <i class="fa-solid ${module.icon}"></i>
      </div>

      <div>
        <strong>${module.title}</strong>
        <span>${module.description}</span>
      </div>
    </article>
  `).join("");
}

function applyNavigationPermissions(data) {
  const admin = data.admin;

  document.querySelectorAll("[data-permission]").forEach(item => {
    const permission = item.dataset.permission;

    if (
      isSuperAdmin(admin) ||
      hasPermission(data, permission)
    ) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });

  document.querySelectorAll(".super-only").forEach(item => {
    item.style.display =
      isSuperAdmin(admin) ? "flex" : "none";
  });
}

async function loadDashboard() {
  hideError();

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  const { data, error } = await supabaseClient.rpc(
    "get_admin_dashboard",
    {
      p_token: token
    }
  );

  if (error) {
    console.error("get_admin_dashboard:", error);

    localStorage.removeItem(SESSION_KEY);

    showError(
      "Votre session administrateur est invalide ou expirée."
    );

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1400);

    return;
  }

  if (!data || !data.admin) {
    localStorage.removeItem(SESSION_KEY);

    window.location.href = "index.html";
    return;
  }

  renderAdmin(data);
  renderStats(data);
  renderModules(data);
  applyNavigationPermissions(data);

  if (data.server_time) {
    const date = new Date(data.server_time);

    document.getElementById("serverTime").textContent =
      `Dernière synchronisation serveur : ${date.toLocaleString("fr-FR")}`;
  }
}

function setupMenu() {
  const sidebar = document.getElementById("sidebar");
  const toggle = document.getElementById("menuToggle");

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");

    const icon = toggle.querySelector("i");

    if (sidebar.classList.contains("open")) {
      icon.className = "fa-solid fa-xmark";
    } else {
      icon.className = "fa-solid fa-bars";
    }
  });
}

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {

      if (
        item.id === "logoutBtn" ||
        item.classList.contains("active")
      ) {
        return;
      }

      /*
       * Les pages de gestion seront branchées ici
       * lorsqu'elles seront créées.
       *
       * Aucun chemin fictif n'est utilisé.
       */

      document.querySelectorAll(".nav-item").forEach(nav => {
        nav.classList.remove("active");
      });

      item.classList.add("active");

      if (window.innerWidth <= 760) {
        document.getElementById("sidebar").classList.remove("open");

        const icon = document
          .getElementById("menuToggle")
          ?.querySelector("i");

        if (icon) {
          icon.className = "fa-solid fa-bars";
        }
      }
    });
  });
}

function setupLogout() {
  const button = document.getElementById("logoutBtn");

  button.addEventListener("click", () => {
    localStorage.removeItem("rolex_admin_session_token");
    localStorage.removeItem("rolex_admin_id");
    localStorage.removeItem("rolex_admin_role");
    localStorage.removeItem("rolex_admin_user_code");
    localStorage.removeItem("rolex_admin_name");

    window.location.href = "index.html";
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupMenu();
  setupNavigation();
  setupLogout();

  await loadDashboard();

  /*
   * Actualisation périodique des données.
   * Les valeurs viennent toujours de Supabase.
   */
  setInterval(loadDashboard, 60000);
});
