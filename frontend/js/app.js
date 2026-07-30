/* ============================================================
   PG MANAGEMENT SYSTEM - DASHBOARD CONTROLLER
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const isLoginPage = window.location.pathname.endsWith("login.html");
    const token = ApiClient.getToken();

    if (isLoginPage) {
        if (token) {
            window.location.href = "index.html";
            return;
        }
        initLoginController();
    } else {
        if (!token) {
            window.location.href = "login.html";
            return;
        }
        initDashboardController();
    }
});

// Toast Notification Helper
function showToast(message, type = "success") {
    const container = document.getElementById("toast-container") || createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span style="font-size:18px">${type === "success" ? "✓" : "⚠️"}</span>
        <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
    return container;
}

// LOGIN CONTROLLER
function initLoginController() {
    const loginForm = document.getElementById("login-form");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value;
        const submitBtn = loginForm.querySelector("button[type='submit']");

        if (!username || !password) {
            showToast("Please enter both username and password", "error");
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "Authenticating...";

            await ApiClient.login(username, password);
            showToast("Login successful! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "index.html";
            }, 800);
        } catch (error) {
            showToast(error.message || "Invalid credentials", "error");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Sign In to Dashboard →";
        }
    });
}

// MAIN DASHBOARD CONTROLLER
let state = {
    rooms: [],
    students: [],
    workers: [],
    payments: [],
    reports: []
};

function initDashboardController() {
    const user = ApiClient.getUser();
    if (user) {
        const nameEl = document.getElementById("user-name");
        const roleEl = document.getElementById("user-role");
        const avatarEl = document.getElementById("user-avatar");

        if (nameEl) nameEl.textContent = user.full_name || user.username;
        if (roleEl) roleEl.textContent = user.role || "Worker";
        if (avatarEl) avatarEl.textContent = (user.full_name || user.username)[0].toUpperCase();
    }

    // Bind Logout
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            ApiClient.clearAuth();
            window.location.href = "login.html";
        });
    }

    // Bind Tab Switching
    const navItems = document.querySelectorAll(".nav-item[data-tab]");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            navItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            document.querySelectorAll(".tab-content").forEach(tab => {
                tab.classList.remove("active");
            });

            const activeTabContent = document.getElementById(`tab-${targetTab}`);
            if (activeTabContent) activeTabContent.classList.add("active");

            const pageTitle = document.getElementById("page-title");
            if (pageTitle) pageTitle.textContent = item.textContent.trim();
        });
    });

    initModals();
    loadDashboardData();
}

async function loadDashboardData() {
    try {
        const [rooms, students, workers, payments, reports] = await Promise.all([
            ApiClient.getRooms(),
            ApiClient.getStudents(),
            ApiClient.getWorkers(),
            ApiClient.getPayments(),
            ApiClient.getReports()
        ]);

        state.rooms = rooms;
        state.students = students;
        state.workers = workers;
        state.payments = payments;
        state.reports = reports;

        renderOverviewStats();
        renderRooms();
        renderStudents();
        renderWorkers();
        renderPayments();
        renderReports();
    } catch (error) {
        showToast(error.message || "Failed to load dashboard data", "error");
    }
}

// RENDERING FUNCTIONS
function renderOverviewStats() {
    const totalRooms = state.rooms.length;
    const totalCapacity = state.rooms.reduce((acc, r) => acc + (r.capacity || 0), 0);
    const totalOccupied = state.rooms.reduce((acc, r) => acc + (r.occupied || 0), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
    const totalStudents = state.students.length;
    const totalRevenue = state.payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

    document.getElementById("stat-total-rooms").textContent = totalRooms;
    document.getElementById("stat-occupancy-rate").textContent = `${occupancyRate}%`;
    document.getElementById("stat-total-students").textContent = totalStudents;
    document.getElementById("stat-total-revenue").textContent = `$${totalRevenue.toLocaleString()}`;
}

function renderRooms() {
    const container = document.getElementById("rooms-grid-container");
    const containerTab2 = document.getElementById("rooms-grid-container-tab2");
    const roomSelect = document.getElementById("student-room-select");

    if (!container) return;

    if (state.rooms.length === 0) {
        const emptyHtml = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-secondary);">No rooms registered yet.</div>`;
        container.innerHTML = emptyHtml;
        if (containerTab2) containerTab2.innerHTML = emptyHtml;
        return;
    }

    const html = state.rooms.map(room => {
        const pct = room.capacity > 0 ? Math.round((room.occupied / room.capacity) * 100) : 0;
        const isFull = room.occupied >= room.capacity;
        return `
            <div class="room-card">
                <div class="room-header">
                    <div class="room-number">Room ${room.room_number}</div>
                    <div class="room-rent">$${parseFloat(room.rent_amount).toLocaleString()}</div>
                </div>
                <div style="font-size:13px; color:var(--text-secondary);">
                    Capacity: ${room.occupied} / ${room.capacity} Occupants
                </div>
                <div class="occupancy-bar-bg">
                    <div class="occupancy-bar-fill" style="width: ${pct}%;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
                    <span class="badge ${isFull ? 'badge-full' : 'badge-available'}">
                        ${isFull ? 'Full' : 'Available'}
                    </span>
                    <span style="font-size:12px; color:var(--text-muted);">${pct}% Occupied</span>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = html;
    if (containerTab2) containerTab2.innerHTML = html;

    if (roomSelect) {
        roomSelect.innerHTML = `<option value="">Select Room (Optional)</option>` + 
            state.rooms
                .filter(r => r.occupied < r.capacity)
                .map(r => `<option value="${r.id}">Room ${r.room_number} ($${r.rent_amount}/mo)</option>`)
                .join("");
    }
}

function renderStudents() {
    const tbody = document.getElementById("students-table-body");
    const studentSelect = document.getElementById("payment-student-select");
    if (!tbody) return;

    if (state.students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-secondary);">No students registered yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.students.map(s => {
        const room = state.rooms.find(r => r.id === s.room_id);
        const roomText = room ? `Room ${room.room_number}` : 'Unassigned';
        return `
            <tr>
                <td><strong>#${s.id}</strong></td>
                <td>${s.full_name}</td>
                <td>${s.email}</td>
                <td>${s.phone}</td>
                <td><span class="badge badge-active">${roomText}</span></td>
                <td><span class="badge badge-completed">${s.status}</span></td>
            </tr>
        `;
    }).join("");

    if (studentSelect) {
        studentSelect.innerHTML = `<option value="">Select Student</option>` + 
            state.students.map(s => `<option value="${s.id}">${s.full_name} (${s.email})</option>`).join("");
    }
}

function renderWorkers() {
    const tbody = document.getElementById("workers-table-body");
    if (!tbody) return;

    if (state.workers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary);">No workers registered.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.workers.map(w => `
        <tr>
            <td><strong>#${w.id}</strong></td>
            <td>${w.username}</td>
            <td>${w.full_name}</td>
            <td>${w.email}</td>
            <td><span class="badge badge-active" style="text-transform:capitalize;">${w.role}</span></td>
        </tr>
    `).join("");
}

function renderPayments() {
    const tbody = document.getElementById("payments-table-body");
    if (!tbody) return;

    if (state.payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-secondary);">No payment records found.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.payments.map(p => {
        const student = state.students.find(s => s.id === p.student_id);
        const studentName = student ? student.full_name : `Student #${p.student_id}`;
        return `
            <tr>
                <td><strong>#${p.id}</strong></td>
                <td>${studentName}</td>
                <td style="color:var(--accent-emerald); font-weight:700;">$${parseFloat(p.amount).toLocaleString()}</td>
                <td>${p.payment_date || 'N/A'}</td>
                <td>${p.payment_method}</td>
                <td><span class="badge badge-completed">${p.status}</span></td>
            </tr>
        `;
    }).join("");
}

function renderReports() {
    const tbody = document.getElementById("reports-table-body");
    if (!tbody) return;

    if (state.reports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary);">No reports filed.</td></tr>`;
        return;
    }

    tbody.innerHTML = state.reports.map(r => {
        const worker = state.workers.find(w => w.id === r.worker_id);
        const workerName = worker ? worker.full_name : 'N/A';
        const isPending = r.status === 'pending';
        return `
            <tr>
                <td><strong>#${r.id}</strong></td>
                <td><strong>${r.title}</strong><br><small style="color:var(--text-secondary);">${r.description}</small></td>
                <td>${workerName}</td>
                <td><span class="badge ${isPending ? 'badge-pending' : 'badge-completed'}">${r.status}</span></td>
                <td>${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Today'}</td>
            </tr>
        `;
    }).join("");
}

// MODAL FORMS HANDLER
function initModals() {
    document.querySelectorAll("[data-modal-open]").forEach(btn => {
        btn.addEventListener("click", () => {
            const modalId = btn.getAttribute("data-modal-open");
            const modal = document.getElementById(modalId);
            if (modal) modal.classList.add("active");
        });
    });

    document.querySelectorAll("[data-modal-close]").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.closest(".modal-overlay").classList.remove("active");
        });
    });

    // Form Submits
    const formRoom = document.getElementById("form-add-room");
    if (formRoom) {
        formRoom.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                room_number: document.getElementById("room_number").value.trim(),
                capacity: parseInt(document.getElementById("capacity").value),
                rent_amount: parseFloat(document.getElementById("rent_amount").value)
            };
            try {
                await ApiClient.createRoom(payload);
                showToast("Room added successfully!", "success");
                formRoom.reset();
                formRoom.closest(".modal-overlay").classList.remove("active");
                loadDashboardData();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    const formStudent = document.getElementById("form-add-student");
    if (formStudent) {
        formStudent.addEventListener("submit", async (e) => {
            e.preventDefault();
            const roomIdVal = document.getElementById("student-room-select").value;
            const payload = {
                full_name: document.getElementById("student_name").value.trim(),
                email: document.getElementById("student_email").value.trim(),
                phone: document.getElementById("student_phone").value.trim(),
                room_id: roomIdVal ? parseInt(roomIdVal) : null
            };
            try {
                await ApiClient.createStudent(payload);
                showToast("Student registered successfully!", "success");
                formStudent.reset();
                formStudent.closest(".modal-overlay").classList.remove("active");
                loadDashboardData();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    const formWorker = document.getElementById("form-add-worker");
    if (formWorker) {
        formWorker.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                username: document.getElementById("worker_username").value.trim(),
                password: document.getElementById("worker_password").value,
                full_name: document.getElementById("worker_fullname").value.trim(),
                email: document.getElementById("worker_email").value.trim(),
                phone: document.getElementById("worker_phone").value.trim(),
                role: document.getElementById("worker_role").value
            };
            try {
                await ApiClient.createWorker(payload);
                showToast("Worker staff registered!", "success");
                formWorker.reset();
                formWorker.closest(".modal-overlay").classList.remove("active");
                loadDashboardData();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    const formPayment = document.getElementById("form-add-payment");
    if (formPayment) {
        formPayment.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                student_id: parseInt(document.getElementById("payment-student-select").value),
                amount: parseFloat(document.getElementById("payment_amount").value),
                payment_method: document.getElementById("payment_method").value
            };
            try {
                await ApiClient.createPayment(payload);
                showToast("Payment recorded successfully!", "success");
                formPayment.reset();
                formPayment.closest(".modal-overlay").classList.remove("active");
                loadDashboardData();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }

    const formReport = document.getElementById("form-add-report");
    if (formReport) {
        formReport.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                title: document.getElementById("report_title").value.trim(),
                description: document.getElementById("report_description").value.trim()
            };
            try {
                await ApiClient.createReport(payload);
                showToast("Maintenance report submitted!", "success");
                formReport.reset();
                formReport.closest(".modal-overlay").classList.remove("active");
                loadDashboardData();
            } catch (err) {
                showToast(err.message, "error");
            }
        });
    }
}