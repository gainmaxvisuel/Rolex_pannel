const SUPABASE_URL =
  "https://cbxjcwjlhvicurpndoyz.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const db =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

const token =
  localStorage.getItem("rolex_admin_session_token");

if (!token) location.href = "index.html";

let admins = [];
let editing = null;

const $ = id => document.getElementById(id);

const esc = v =>
  String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");


async function load() {

  $("body").innerHTML =
    `<tr><td colspan="7"><div class="loading">Chargement...</div></td></tr>`;

  const {data,error} =
    await db.rpc("get_admin_admins", {
      p_token: token
    });

  if (error) {
    $("body").innerHTML =
      `<tr><td colspan="7"><div class="error">${esc(error.message)}</div></td></tr>`;
    return;
  }

  admins = Array.isArray(data) ? data : [];

  render();
}


function render() {

  $("total").textContent = admins.length;

  $("active").textContent =
    admins.filter(a => a.status === "active").length;

  $("super").textContent =
    admins.filter(a => a.role === "super_admin").length;

  if (!admins.length) {
    $("body").innerHTML =
      `<tr><td colspan="7"><div class="empty">Aucun administrateur.</div></td></tr>`;
    return;
  }

  $("body").innerHTML = admins.map(a => `

    <tr>

      <td>
        <div class="name">${esc(a.full_name)}</div>
        <span class="muted">${esc(a.user_code)}</span>
      </td>

      <td>
        ${esc(a.country_code)} ${esc(a.phone)}
      </td>

      <td class="role">
        ${a.role === "super_admin"
          ? "Super administrateur"
          : "Administrateur"}
      </td>

      <td>
        ${esc(a.position || "—")}
      </td>

      <td>
        <span class="badge ${
          a.status === "active" ? "active" : "blocked"
        }">
          ${a.status === "active" ? "Actif" : "Bloqué"}
        </span>
      </td>

      <td>
        ${a.role === "super_admin"
          ? "Toutes"
          : (a.permissions || []).length}
      </td>

      <td>

        <button class="action"
          onclick="editAdmin('${a.id}')"
          title="Modifier">
          <i class="fa-solid fa-pen"></i>
        </button>

        <button class="action"
          onclick="toggleAdmin('${a.id}', ${a.status !== "active"})"
          title="${a.status === "active" ? "Désactiver" : "Activer"}">
          <i class="fa-solid ${
            a.status === "active"
            ? "fa-toggle-off"
            : "fa-toggle-on"
          }"></i>
        </button>

      </td>

    </tr>

  `).join("");
}


$("addBtn").onclick = () => {

  editing = null;

  $("title").textContent =
    "Nouvel administrateur";

  $("form").reset();

  $("country").value = "BF";

  $("passwordBox").style.display = "";
  $("permissionBox").style.display = "";

  document
    .querySelectorAll(".permissions input")
    .forEach(x => x.checked = false);

  $("overlay").classList.add("show");
};


window.editAdmin = id => {

  const a = admins.find(x => x.id === id);

  if (!a) return;

  editing = a;

  $("title").textContent =
    "Modifier l'administrateur";

  $("name").value = a.full_name || "";
  $("country").value = a.country_code || "BF";
  $("phone").value = a.phone || "";
  $("position").value = a.position || "";
  $("role").value = a.role || "admin";

  $("passwordBox").style.display = "none";

  document
    .querySelectorAll(".permissions input")
    .forEach(x =>
      x.checked =
        (a.permissions || []).includes(x.value)
    );

  $("permissionBox").style.display =
    a.role === "super_admin" ? "none" : "";

  $("overlay").classList.add("show");
};


$("role").onchange = () => {
  if (!editing)
    $("permissionBox").style.display =
      $("role").value === "super_admin" ? "none" : "";
};


$("form").onsubmit = async e => {

  e.preventDefault();

  const permissions =
    [...document.querySelectorAll(".permissions input:checked")]
      .map(x => x.value);

  try {

    let result;

    if (editing) {

      result = await db.rpc(
        "admin_update_admin",
        {
          p_token: token,
          p_admin_id: editing.id,
          p_full_name: $("name").value.trim(),
          p_position: $("position").value.trim(),
          p_role: $("role").value
        }
      );

      if (result.error) throw result.error;

      if (editing.role !== "super_admin" &&
          $("role").value !== "super_admin") {

        result = await db.rpc(
          "admin_update_permissions",
          {
            p_token: token,
            p_admin_id: editing.id,
            p_permissions: permissions
          }
        );

        if (result.error) throw result.error;
      }

    } else {

      result = await db.rpc(
        "admin_create_admin",
        {
          p_token: token,
          p_full_name: $("name").value.trim(),
          p_country_code: $("country").value,
          p_phone: $("phone").value.trim(),
          p_password: $("password").value,
          p_role: $("role").value,
          p_position: $("position").value.trim(),
          p_permissions: permissions
        }
      );

      if (result.error) throw result.error;
    }

    alert(
      editing
        ? "Administrateur modifié."
        : "Administrateur créé."
    );

    closeModal();
    load();

  } catch (err) {
    alert("Erreur : " + err.message);
  }
};


window.toggleAdmin = async (id, active) => {

  if (!confirm(
    active
      ? "Activer cet administrateur ?"
      : "Désactiver cet administrateur ?"
  )) return;

  const {error} =
    await db.rpc(
      "admin_toggle_admin",
      {
        p_token: token,
        p_admin_id: id,
        p_active: active
      }
    );

  if (error) {
    alert(error.message);
    return;
  }

  load();
};


function closeModal() {
  $("overlay").classList.remove("show");
  editing = null;
}

$("closeBtn").onclick = closeModal;
$("cancelBtn").onclick = closeModal;

$("menuBtn").onclick = () =>
  $("sidebar").classList.toggle("open");

load();

setInterval(load, 60000);
