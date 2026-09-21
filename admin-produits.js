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
  location.href = "index.html";
}

let products = [];
let editingId = null;

const $ = id =>
  document.getElementById(id);


function money(value) {
  return Number(value || 0)
    .toLocaleString("fr-FR") + " XOF";
}


function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


/* =========================
   CHARGER PRODUITS
========================= */

async function loadProducts() {

  $("productsBody").innerHTML = `
    <tr>
      <td colspan="7">
        <div class="loading">Chargement...</div>
      </td>
    </tr>
  `;

  const { data, error } =
    await supabaseClient.rpc(
      "get_admin_products",
      {
        p_token: token
      }
    );

  if (error) {
    $("productsBody").innerHTML = `
      <tr>
        <td colspan="7">
          <div class="error">
            ${esc(error.message)}
          </div>
        </td>
      </tr>
    `;
    return;
  }

  products =
    Array.isArray(data) ? data : [];

  render();
}


/* =========================
   AFFICHAGE
========================= */

function render() {

  const search =
    $("search").value
      .toLowerCase()
      .trim();

  const list =
    products.filter(p =>
      !search ||
      p.name.toLowerCase().includes(search)
    );

  $("total").textContent =
    products.length;

  $("active").textContent =
    products.filter(p => p.active).length;

  $("inactive").textContent =
    products.filter(p => !p.active).length;

  $("maxPrice").textContent =
    money(
      Math.max(
        0,
        ...products.map(p =>
          Number(p.price || 0)
        )
      )
    );

  if (!list.length) {

    $("productsBody").innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty">
            Aucun produit trouvé.
          </div>
        </td>
      </tr>
    `;

    return;
  }


  $("productsBody").innerHTML =
    list.map(p => `

      <tr>

        <td>

          <div class="product">

            ${
              p.image_url
              ? `<img src="${esc(p.image_url)}">`
              : `<img src="" alt="">`
            }

            <div>
              <b>${esc(p.name)}</b>
              <span class="muted">
                ${esc(p.id)}
              </span>
            </div>

          </div>

        </td>

        <td>
          <b>${money(p.price)}</b>
        </td>

        <td>
          ${p.cycle_hours / 24} jours
        </td>

        <td>
          ${money(p.daily_return)}
        </td>

        <td>
          ${money(p.total_return)}
        </td>

        <td>

          <span class="status ${
            p.active ? "active" : "inactive"
          }">

            ${
              p.active
              ? "Actif"
              : "Inactif"
            }

          </span>

        </td>

        <td>

          <button
            class="action"
            onclick="editProduct('${p.id}')"
            title="Modifier"
          >
            <i class="fa-solid fa-pen"></i>
          </button>

          <button
            class="action"
            onclick="toggleProduct('${p.id}', ${!p.active})"
          >
            <i class="fa-solid ${
              p.active
              ? "fa-toggle-off"
              : "fa-toggle-on"
            }"></i>
          </button>

        </td>

      </tr>

    `).join("");
}


/* =========================
   NOUVEAU
========================= */

$("addBtn").onclick = () => {

  editingId = null;

  $("modalTitle").textContent =
    "Nouveau produit";

  $("productForm").reset();

  $("overlay").classList.add("show");
};


/* =========================
   MODIFIER
========================= */

function editProduct(id) {

  const p =
    products.find(x => x.id === id);

  if (!p) return;

  editingId = id;

  $("modalTitle").textContent =
    "Modifier le produit";

  $("name").value =
    p.name || "";

  $("price").value =
    p.price || "";

  $("cycle").value =
    p.cycle_hours || "";

  $("daily").value =
    p.daily_return || "";

  $("totalReturn").value =
    p.total_return || "";

  $("image").value =
    p.image_url || "";

  $("overlay").classList.add("show");
}


/* =========================
   ENREGISTRER
========================= */

$("productForm").onsubmit =
  async event => {

    event.preventDefault();

    const name =
      $("name").value.trim();

    const price =
      Number($("price").value);

    const cycle =
      Number($("cycle").value);

    const daily =
      Number($("daily").value);

    const totalReturn =
      Number($("totalReturn").value);

    const image =
      $("image").value.trim() || null;


    try {

      let result;

      if (editingId) {

        result =
          await supabaseClient.rpc(
            "admin_update_product",
            {
              p_token: token,
              p_product_id: editingId,
              p_name: name,
              p_price: price,
              p_cycle_hours: cycle,
              p_daily_return: daily,
              p_total_return: totalReturn,
              p_image_url: image
            }
          );

      } else {

        result =
          await supabaseClient.rpc(
            "admin_create_product",
            {
              p_token: token,
              p_name: name,
              p_price: price,
              p_cycle_hours: cycle,
              p_daily_return: daily,
              p_total_return: totalReturn,
              p_active: true,
              p_image_url: image
            }
          );
      }


      if (result.error)
        throw result.error;


      alert(
        editingId
        ? "Produit modifié."
        : "Produit créé."
      );

      closeModal();

      await loadProducts();

    } catch (error) {

      alert(
        "Erreur : " +
        error.message
      );
    }
  };


/* =========================
   ACTIVER / DESACTIVER
========================= */

async function toggleProduct(
  id,
  active
) {

  const action =
    active
    ? "activer"
    : "désactiver";

  if (
    !confirm(
      `Voulez-vous ${action} ce produit ?`
    )
  ) return;


  const { error } =
    await supabaseClient.rpc(
      "admin_toggle_product",
      {
        p_token: token,
        p_product_id: id,
        p_active: active
      }
    );


  if (error) {
    alert(error.message);
    return;
  }

  await loadProducts();
}


/* =========================
   FERMER
========================= */

function closeModal() {
  $("overlay")
    .classList
    .remove("show");

  editingId = null;
}

$("closeBtn").onclick = closeModal;
$("cancelBtn").onclick = closeModal;


/* =========================
   RECHERCHE
========================= */

$("search").oninput = render;


/* =========================
   ACTUALISER
========================= */

$("refreshBtn").onclick =
  loadProducts;


/* =========================
   MENU MOBILE
========================= */

$("menuBtn").onclick = () => {
  $("sidebar")
    .classList
    .toggle("open");
};


/* =========================
   DEMARRAGE
========================= */

loadProducts();

setInterval(
  loadProducts,
  60000
);
