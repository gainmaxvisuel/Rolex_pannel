const SUPABASE_URL =
  "https://cbxjcwjlhvicurpndoyz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const SESSION_KEY = "rolex_admin_session_token";

const token = localStorage.getItem(SESSION_KEY);

if (!token) {
  window.location.href = "index.html";
}

const settingsKeys = [
  "deposit_minimum",
  "signup_bonus",
  "referral_level_1_percent",
  "referral_level_2_percent",
  "referral_level_3_percent",
  "withdrawal_minimum",
  "withdrawal_fee_percent",
  "withdrawal_start_hour",
  "withdrawal_end_hour",
  "withdrawals_per_day"
];

const page = document.getElementById("page");
const saveBtn = document.getElementById("saveBtn");
const message = document.getElementById("message");

function showMessage(text, type) {
  message.textContent = text;
  message.className = "message " + type;

  setTimeout(() => {
    message.className = "message";
  }, 3500);
}

async function loadSettings() {
  page.classList.add("loading");

  const { data, error } =
    await supabaseClient.rpc(
      "get_admin_settings",
      {
        p_token: token
      }
    );

  if (error) {
    console.error(error);

    if (
      error.message.includes("Accès administrateur") ||
      error.message.includes("refusé")
    ) {
      localStorage.removeItem(SESSION_KEY);
      window.location.href = "index.html";
      return;
    }

    showMessage(
      "Impossible de charger les paramètres.",
      "error"
    );

    page.classList.remove("loading");
    return;
  }

  settingsKeys.forEach(key => {
    const input = document.getElementById(key);

    if (!input) return;

    if (
      data &&
      Object.prototype.hasOwnProperty.call(data, key)
    ) {
      input.value = data[key];
    }
  });

  page.classList.remove("loading");
}

async function saveSettings() {
  saveBtn.disabled = true;
  saveBtn.textContent = "Enregistrement...";

  try {
    for (const key of settingsKeys) {
      const input = document.getElementById(key);

      if (!input) continue;

      const value = Number(input.value);

      if (!Number.isFinite(value) || value < 0) {
        throw new Error(
          "Valeur invalide pour : " + key
        );
      }

      if (
        (key === "withdrawal_start_hour" ||
         key === "withdrawal_end_hour") &&
        (value < 0 || value > 23)
      ) {
        throw new Error(
          "L'heure doit être comprise entre 0 et 23."
        );
      }

      if (
        key === "withdrawals_per_day" &&
        !Number.isInteger(value)
      ) {
        throw new Error(
          "Le nombre de retraits par jour doit être un entier."
        );
      }

      const { error } =
        await supabaseClient.rpc(
          "admin_update_setting",
          {
            p_token: token,
            p_key: key,
            p_value: value
          }
        );

      if (error) {
        throw error;
      }
    }

    showMessage(
      "Les paramètres ont été enregistrés.",
      "success"
    );

    await loadSettings();

  } catch (error) {
    console.error(error);

    showMessage(
      error.message ||
      "Erreur lors de l'enregistrement.",
      "error"
    );
  }

  saveBtn.disabled = false;
  saveBtn.textContent =
    "Enregistrer les modifications";
}

saveBtn.addEventListener(
  "click",
  saveSettings
);

document
  .getElementById("menuBtn")
  .addEventListener("click", () => {
    document
      .getElementById("sidebar")
      .classList.toggle("open");
  });

loadSettings();

setInterval(
  loadSettings,
  60000
);
