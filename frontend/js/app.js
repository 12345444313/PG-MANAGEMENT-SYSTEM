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

    bindOverviewRoomSearch();
    bindTableSearch();

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

bindStudentsSearch();
        initModals();
    loadDashboardData();
}

function bindOverviewRoomSearch() {
    const roomsSearch = document.getElementById("rooms-search");
    if (roomsSearch) {
        roomsSearch.addEventListener("input", () => renderRooms());
    }
}

function bindStudentsSearch() {
    const studentsSearch = document.getElementById("students-search");
    if (studentsSearch) {
        studentsSearch.addEventListener("input", renderStudents);
    }
}

function bindTableSearch() {
    const workersSearch = document.getElementById("workers-search");
    const paymentsSearch = document.getElementById("payments-search");

    if (workersSearch) {
        workersSearch.addEventListener("input", renderWorkers);
    }

    if (paymentsSearch) {
        paymentsSearch.addEventListener("input", renderPayments);
    }
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
    const totalStudents = state.students.length;

    const totalRoomsEl = document.getElementById("stat-total-rooms");
    const totalStudentsEl = document.getElementById("stat-total-students");

    if (totalRoomsEl) totalRoomsEl.textContent = totalRooms;
    if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
}

function renderRooms() {
    const container = document.getElementById("rooms-grid-container");
    const containerTab2 = document.getElementById("rooms-grid-container-tab2");
    const roomSelect = document.getElementById("student-room-select");
    const roomsSearch = document.getElementById("rooms-search");

    if (!container) return;

    const searchTerm = (roomsSearch?.value || "").trim().toLowerCase();
    const filteredRooms = state.rooms.filter(room => String(room.room_number).toLowerCase().includes(searchTerm));

    if (filteredRooms.length === 0) {
        const emptyHtml = `<div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-secondary);">No matching rooms found.</div>`;
        container.innerHTML = emptyHtml;
        if (containerTab2) containerTab2.innerHTML = emptyHtml;
        hideRoomPopup();
        return;
    }

    const html = filteredRooms.map(room => {
        const isFull = room.occupied >= room.capacity;
        const isSelected = String(room.id) === (window.currentRoomId || "");
        return `
            <div class="room-card ${isSelected ? 'selected' : ''}" data-room-id="${room.id}">
                <div class="room-header">
                    <div class="room-number">Room ${room.room_number}</div>
                    <div class="room-rent">$${parseFloat(room.rent_amount).toLocaleString()}</div>
                </div>
                <div style="font-size:13px; color:var(--text-secondary); margin-bottom:12px;">
                    Capacity: ${room.occupied} / ${room.capacity} Occupants
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                    <span class="badge ${isFull ? 'badge-full' : 'badge-available'}">
                        ${isFull ? 'Full' : 'Available'}
                    </span>
                    <button class="btn-delete" data-delete-room="${room.id}">Delete</button>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = html;
    if (containerTab2) containerTab2.innerHTML = html;

    const attachRoomCardHandlers = (target) => {
        target.querySelectorAll(".room-card").forEach(card => {
            card.addEventListener("click", () => {
                const roomId = card.getAttribute("data-room-id");
                window.currentRoomId = roomId;
                renderRooms();
                const cardRect = card.getBoundingClientRect();
                showRoomPopup(roomId, cardRect);
            });
        });
    };

    attachRoomCardHandlers(container);
    if (containerTab2) attachRoomCardHandlers(containerTab2);

    container.querySelectorAll("[data-delete-room]").forEach(btn => {
        btn.addEventListener("click", async (event) => {
            event.stopPropagation();
            const roomId = Number(btn.getAttribute("data-delete-room"));
            try {
                await ApiClient.deleteRoom(roomId);
                showToast("Room deleted successfully", "success");
                loadDashboardData();
            } catch (error) {
                showToast(error.message || "Failed to delete room", "error");
            }
        });
    });

    if (containerTab2) {
        containerTab2.querySelectorAll("[data-delete-room]").forEach(btn => {
            btn.addEventListener("click", async (event) => {
                event.stopPropagation();
                const roomId = Number(btn.getAttribute("data-delete-room"));
                try {
                    await ApiClient.deleteRoom(roomId);
                    showToast("Room deleted successfully", "success");
                    loadDashboardData();
                } catch (error) {
                    showToast(error.message || "Failed to delete room", "error");
                }
            });
        });
    }

    if (roomSelect) {
        roomSelect.innerHTML = `<option value="">Select Room (Optional)</option>` + 
            state.rooms
                .filter(r => r.occupied < r.capacity)
                .map(r => `<option value="${r.id}">Room ${r.room_number} ($${r.rent_amount}/mo)</option>`)
                .join("");
    }

    if (!window.currentRoomId && filteredRooms.length > 0) {
        window.currentRoomId = String(filteredRooms[0].id);
        renderRoomResidents(window.currentRoomId);
    } else if (window.currentRoomId) {
        renderRoomResidents(window.currentRoomId);
    }
}

function showRoomPopup(roomId, cardRect) {
    const roomPopup = document.getElementById("room-popup-bubble");
    const roomPopupClose = document.getElementById("room-popup-close");
    if (!roomPopup) return;

    renderRoomResidents(roomId);
    roomPopup.classList.remove("hidden");

    const popupWidth = Math.min(320, window.innerWidth - 32);
    const popupHeight = Math.min(260, window.innerHeight - 80);
    const left = Math.min(window.innerWidth - popupWidth - 20, Math.max(16, cardRect.right + 18));
    const top = Math.min(window.innerHeight - popupHeight - 20, Math.max(16, cardRect.top + window.scrollY));

    roomPopup.style.width = `${popupWidth}px`;
    roomPopup.style.height = `${popupHeight}px`;
    roomPopup.style.left = `${left}px`;
    roomPopup.style.top = `${top}px`;

    if (roomPopupClose) {
        roomPopupClose.onclick = () => hideRoomPopup();
    }
}

function hideRoomPopup() {
    const roomPopup = document.getElementById("room-popup-bubble");
    if (roomPopup) roomPopup.classList.add("hidden");
}

function renderRoomResidents(roomId) {
    const roomDetailContent = document.getElementById("room-detail-content");
    const popupTitle = document.querySelector("#room-popup-bubble .room-popup-title");
    if (!roomDetailContent) return;

    const room = state.rooms.find(r => String(r.id) === String(roomId));
    const students = state.students.filter(student => String(student.room_id) === String(roomId));

    if (popupTitle && room) {
        popupTitle.textContent = `Room ${room.room_number} Residents`;
    }

    if (!room) {
        roomDetailContent.textContent = "No room selected.";
        return;
    }

    if (students.length === 0) {
        roomDetailContent.innerHTML = `<div class="room-detail-item">No students assigned to Room ${room.room_number}.</div>`;
        return;
    }

    roomDetailContent.innerHTML = students.map(student => `
        <div class="room-detail-item">
            <div class="name">${student.full_name}</div>
            <div class="meta">${student.email} • ${student.phone}</div>
            <div class="meta">Status: ${student.status}</div>
        </div>
    `).join("");
}

function renderStudents() {
    const tbody = document.getElementById("students-table-body");
    const studentSelect = document.getElementById("payment-student-select");
    const studentsSearch = document.getElementById("students-search");
    if (!tbody) return;

    const searchTerm = (studentsSearch?.value || "").trim().toLowerCase();
    const filteredStudents = state.students.filter(student => {
        const room = state.rooms.find(r => r.id === student.room_id);
        const haystack = [
            student.full_name,
            student.father_name || "",
            student.aadhaar_no || "",
            student.email,
            student.phone,
            student.father_phone || "",
            room ? `Room ${room.room_number}` : ""
        ].join(" ").toLowerCase();
        return haystack.includes(searchTerm);
    });

    if (filteredStudents.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:30px; color:var(--text-secondary);">No students match your search.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredStudents.map(s => {
        const room = state.rooms.find(r => r.id === s.room_id);
        const roomText = room ? `Room ${room.room_number}` : 'Unassigned';
        const paidAmount = state.payments
            .filter(payment => Number(payment.student_id) === Number(s.id))
            .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
        const feeStatus = paidAmount > 0 ? 'Paid' : 'Not Paid';
        const feeBadge = feeStatus === 'Paid' ? 'badge-completed' : 'badge-pending';
        return `
            <tr>
                <td><strong>#${s.id}</strong></td>
                <td>${s.full_name}</td>
                <td>${s.father_name || '-'}</td>
                <td>${s.aadhaar_no || '-'}</td>
                <td>${s.email}</td>
                <td>${s.phone}</td>
                <td>${s.father_phone || '-'}</td>
                <td><span class="badge badge-active">${roomText}</span></td>
                <td><span class="badge badge-completed">${s.status}</span></td>
                <td><span class="badge ${feeBadge}">${feeStatus}</span></td>
                <td><button class="btn-delete" data-delete-student="${s.id}">Delete</button></td>
            </tr>
        `;
    }).join("");

    tbody.querySelectorAll("[data-delete-student]").forEach(btn => {
        btn.addEventListener("click", async () => {
            const studentId = Number(btn.getAttribute("data-delete-student"));
            try {
                await ApiClient.deleteStudent(studentId);
                showToast("Student deleted successfully", "success");
                loadDashboardData();
            } catch (error) {
                showToast(error.message || "Failed to delete student", "error");
            }
        });
    });

    if (studentSelect) {
        studentSelect.innerHTML = `<option value="">Select Student</option>` + 
            state.students.map(s => `<option value="${s.id}">${s.full_name} (${s.email})</option>`).join("");
    }
}

function renderWorkers() {
    const tbody = document.getElementById("workers-table-body");
    const workersSearch = document.getElementById("workers-search");
    if (!tbody) return;

    const searchTerm = (workersSearch?.value || "").trim().toLowerCase();
    const filteredWorkers = state.workers.filter(w => {
        const haystack = [w.username, w.full_name, w.email, w.role].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(searchTerm);
    });

    if (filteredWorkers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-secondary);">No workers match your search.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredWorkers.map(w => `
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
    const paymentsSearch = document.getElementById("payments-search");
    if (!tbody) return;

    const searchTerm = (paymentsSearch?.value || "").trim().toLowerCase();
    const filteredPayments = state.payments.filter(p => {
        const student = state.students.find(s => s.id === p.student_id);
        const studentName = student ? student.full_name : `Student #${p.student_id}`;
        const haystack = [studentName, p.amount, p.payment_date, p.payment_method, p.status].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(searchTerm);
    });

    if (filteredPayments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-secondary);">No payment records match your search.</td></tr>`;
        return;
    }

    tbody.innerHTML = filteredPayments.map(p => {
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
    import ApiClient from "./api.js";

    async function init() {
        const workers = await ApiClient.getWorkers();
        console.log("Workers:", workers);
    }
    init();
}