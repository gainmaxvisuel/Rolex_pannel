const SUPABASE_URL = "https://cbxjcwjlhvicurpndoyz.supabase.co";
const SUPABASE_KEY = "sb_publishable_KUd51SQCl10pIgztFFGq9Q_Jp1YCK6o";

const supabaseClient = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

const SESSION_KEY = "rolex_admin_session_token";

let deposits = [];
let rejectDepositId = null;

const message = document.getElementById("message");
const loading = document.getElementById("loading");
const tableContainer = document.getElementById("tableContainer");
const emptyState = document.getElementById("emptyState");
const depositBody = document.getElementById("depositBody");
const statusFilter = document.getElementById("statusFilter");
const searchInput = document.getElementById("searchInput");
const refreshBtn = document.getElementById("refreshBtn");

const rejectModal = document.getElementById("rejectModal");
const rejectReason = document.getElementById("rejectReason");
const cancelReject = document.getElementById("cancelReject");
const confirmReject = document.getElementById("confirmReject");

const token = localStorage.getItem(SESSION_KEY);

if (!token) {
window.location.href = "index.html";
}

function showMessage(text, type = "error") {
message.textContent = text;
message.className = message show ${type};

setTimeout(() => {
message.className = "message";
}, 5000);
}

function escapeHtml(value) {
if (value === null || value === undefined) return "";

return String(value)
.replaceAll("&", "&")
.replaceAll("<", "<")
.replaceAll(">", ">")
.replaceAll('"', """)
.replaceAll("'", "'");
}

function formatAmount(value) {
const number = Number(value || 0);

return new Intl.NumberFormat("fr-FR").format(number) + " XOF";
}

function formatDate(value) {
if (!value) return "—";

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return "—";
}

return new Intl.DateTimeFormat("fr-FR", {
dateStyle: "short",
timeStyle: "short"
}).format(date);
}

function statusLabel(status) {
const labels = {
pending: "En attente",
verified: "Vérifié",
approved: "Validé",
rejected: "Rejeté"
};

return labels[status] || status || "—";
}

function statusClass(status) {
return [
"pending",
"verified",
"approved",
"rejected"
].includes(status)
? status
: "pending";
}

function filteredDeposits() {
const filter = statusFilter.value;
const search = searchInput.value.trim().toLowerCase();

return deposits.filter(deposit => {

if (filter && deposit.status !== filter) {  
  return false;  
}  

if (!search) {  
  return true;  
}  

const text = [  
  deposit.full_name,  
  deposit.user_code,  
  deposit.phone,  
  deposit.payer_phone  
]  
  .filter(Boolean)  
  .join(" ")  
  .toLowerCase();  

return text.includes(search);

});
}

function renderDeposits() {
const list = filteredDeposits();

depositBody.innerHTML = "";

if (!list.length) {
tableContainer.style.display = "none";
emptyState.style.display = "block";
return;
}

emptyState.style.display = "none";
tableContainer.style.display = "block";

list.forEach(deposit => {

const tr = document.createElement("tr");  

const status = deposit.status;  

let actions = "";  

if (status === "pending") {  
  actions = `  
    <button  
      class="action-btn verify"  
      data-action="verify"  
      data-id="${escapeHtml(deposit.id)}"  
    >  
      <i class="fa-solid fa-check"></i>  
      Vérifier  
    </button>  
  `;  
}  

if (status === "verified") {  
  actions = `  
    <button  
      class="action-btn approve"  
      data-action="approve"  
      data-id="${escapeHtml(deposit.id)}"  
    >  
      <i class="fa-solid fa-circle-check"></i>  
      Valider  
    </button>  

    <button  
      class="action-btn reject"  
      data-action="reject"  
      data-id="${escapeHtml(deposit.id)}"  
    >  
      <i class="fa-solid fa-xmark"></i>  
      Rejeter  
    </button>  
  `;  
}  

if (status === "approved") {  
  actions = `  
    <span style="color:#34d399;font-size:12px;">  
      <i class="fa-solid fa-circle-check"></i>  
      Dépôt validé  
    </span>  
  `;  
}  

if (status === "rejected") {  
  actions = `  
    <span style="color:#f87171;font-size:12px;">  
      <i class="fa-solid fa-circle-xmark"></i>  
      Dépôt rejeté  
    </span>  
  `;  
}  

tr.innerHTML = `  
  <td>  
    <div class="user-name">  
      ${escapeHtml(deposit.full_name || "—")}  
    </div>  
    <div class="user-code">  
      ${escapeHtml(deposit.user_code || "—")}  
    </div>  
  </td>  

  <td>  
    ${escapeHtml(deposit.country_code || "—")}  
  </td>  

  <td>  
    ${escapeHtml(deposit.payer_phone || "—")}  
  </td>  

  <td>  
    <span class="amount">  
      ${formatAmount(deposit.amount)}  
    </span>  
  </td>  

  <td>  
    ${formatDate(deposit.created_at)}  
  </td>  

  <td>  
    <span class="status ${statusClass(status)}">  
      ${escapeHtml(statusLabel(status))}  
    </span>  
  </td>  

  <td>  
    <div class="actions">  
      ${actions}  
    </div>  
  </td>  
`;  

depositBody.appendChild(tr);

});
}

async function loadDeposits() {

if (!token) {
window.location.href = "index.html";
return;
}

loading.style.display = "block";
tableContainer.style.display = "none";
emptyState.style.display = "none";

try {

const selectedStatus = statusFilter.value || null;  

const { data, error } = await supabaseClient.rpc(  
  "get_admin_deposits",  
  {  
    p_token: token,  
    p_status: selectedStatus  
  }  
);  

if (error) {  
  throw error;  
}  

deposits = Array.isArray(data) ? data : [];  

loading.style.display = "none";  

renderDeposits();

} catch (error) {

console.error(error);  

loading.style.display = "none";  
tableContainer.style.display = "none";  
emptyState.style.display = "block";  

showMessage(  
  error?.message || "Impossible de charger les dépôts."  
);  

if (  
  error?.message?.toLowerCase().includes("session") ||  
  error?.message?.toLowerCase().includes("permission")  
) {  
  setTimeout(() => {  
    localStorage.removeItem(SESSION_KEY);  
    window.location.href = "index.html";  
  }, 1800);  
}

}
}

async function verifyDeposit(depositId) {

if (!depositId) return;

if (!confirm("Voulez-vous vérifier ce dépôt ?")) {
return;
}

try {

setBusy(true);  

const { data, error } = await supabaseClient.rpc(  
  "admin_verify_deposit",  
  {  
    p_token: token,  
    p_deposit_id: depositId  
  }  
);  

if (error) {  
  throw error;  
}  

console.log("Dépôt vérifié :", data);  

showMessage(  
  "Le dépôt a été vérifié.",  
  "success"  
);  

await loadDeposits();

} catch (error) {

console.error(error);  

showMessage(  
  error?.message || "Impossible de vérifier le dépôt."  
);

} finally {
setBusy(false);
}
}

async function approveDeposit(depositId) {

if (!depositId) return;

const confirmed = confirm(
"Confirmer définitivement la validation de ce dépôt ?"
);

if (!confirmed) {
return;
}

try {

setBusy(true);  

const { data, error } = await supabaseClient.rpc(  
  "admin_approve_deposit",  
  {  
    p_token: token,  
    p_deposit_id: depositId  
  }  
);  

if (error) {  
  throw error;  
}  

console.log("Dépôt validé :", data);  

showMessage(  
  "Dépôt validé avec succès.",  
  "success"  
);  

await loadDeposits();

} catch (error) {

console.error(error);  

showMessage(  
  error?.message || "Impossible de valider le dépôt."  
);

} finally {
setBusy(false);
}
}

function openRejectModal(depositId) {

rejectDepositId = depositId;
rejectReason.value = "";

rejectModal.classList.add("show");

setTimeout(() => {
rejectReason.focus();
}, 100);
}

function closeRejectModal() {

rejectDepositId = null;
rejectReason.value = "";

rejectModal.classList.remove("show");
}

async function rejectDeposit() {

const depositId = rejectDepositId;
const reason = rejectReason.value.trim();

if (!depositId) {
closeRejectModal();
return;
}

if (!reason) {
showMessage("Le motif du rejet est obligatoire.");
rejectReason.focus();
return;
}

try {

setBusy(true);  

const { data, error } = await supabaseClient.rpc(  
  "admin_reject_deposit",  
  {  
    p_token: token,  
    p_deposit_id: depositId,  
    p_reason: reason  
  }  
);  

if (error) {  
  throw error;  
}  

console.log("Dépôt rejeté :", data);  

closeRejectModal();  

showMessage(  
  "Le dépôt a été rejeté.",  
  "success"  
);  

await loadDeposits();

} catch (error) {

console.error(error);  

showMessage(  
  error?.message || "Impossible de rejeter le dépôt."  
);

} finally {
setBusy(false);
}
}

function setBusy(state) {

refreshBtn.disabled = state;

document
.querySelectorAll(".action-btn")
.forEach(button => {
button.disabled = state;
});

confirmReject.disabled = state;
}

depositBody.addEventListener("click", event => {

const button = event.target.closest("[data-action]");

if (!button) return;

const action = button.dataset.action;
const depositId = button.dataset.id;

if (action === "verify") {
verifyDeposit(depositId);
}

if (action === "approve") {
approveDeposit(depositId);
}

if (action === "reject") {
openRejectModal(depositId);
}
});

statusFilter.addEventListener("change", loadDeposits);

searchInput.addEventListener("input", renderDeposits);

refreshBtn.addEventListener("click", loadDeposits);

cancelReject.addEventListener("click", closeRejectModal);

confirmReject.addEventListener("click", rejectDeposit);

rejectModal.addEventListener("click", event => {

if (event.target === rejectModal) {
closeRejectModal();
}
});

document.getElementById("backBtn").addEventListener("click", () => {
window.location.href = "dashboard-admin.html";
});

loadDeposits();

setInterval(() => {
loadDeposits();
}, 60000);
