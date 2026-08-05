/* ============================================================
   PG MANAGEMENT SYSTEM - API CLIENT WRAPPER
   ============================================================ */

// Set this to your deployed backend URL.
// - For local dev: use "http://127.0.0.1:8000"
// - For production: replace with your Render URL (no trailing slash)
const API_BASE_URL =
    (typeof window !== "undefined" && window.PG_API_BASE_URL) ||
    "https://pg-management-system-hnlh.onrender.com";

const ApiClient = {
    getToken() {
        return localStorage.getItem("access_token");
    },

    setToken(token) {
        localStorage.setItem("access_token", token);
    },

    clearAuth() {
        localStorage.removeItem("access_token");
        localStorage.removeItem("worker_user");
    },

    getUser() {
        const user = localStorage.getItem("worker_user");
        try {
            return user ? JSON.parse(user) : null;
        } catch (_) {
            return null;
        }
    },

    setUser(user) {
        localStorage.setItem("worker_user", JSON.stringify(user));
    },

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = Object.assign({}, options.headers || {});

        const token = this.getToken();
        if (token && !headers["Authorization"]) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }

        const config = Object.assign({}, options, { headers });

        let response;
        try {
            response = await fetch(url, config);
        } catch (networkErr) {
            // Network / CORS / DNS failure
            throw new Error(
                "Cannot reach the backend server. Please check your connection or try again later."
            );
        }

        // Handle Unauthorized redirect (but skip the login endpoint itself)
        if (response.status === 401 && !String(endpoint).includes("/auth/login")) {
            this.clearAuth();
            // Only redirect if we aren't already on the login page
            if (!window.location.pathname.endsWith("login.html")) {
                window.location.href = "login.html";
            }
            throw new Error("Session expired. Please log in again.");
        }

        // Try to parse JSON regardless of status
        let data = null;
        const text = await response.text();
        if (text) {
            try {
                data = JSON.parse(text);
            } catch (_) {
                data = { detail: text };
            }
        }

        if (!response.ok) {
            const message =
                (data && (data.detail || data.message)) ||
                `Request failed with status ${response.status}`;
            throw new Error(message);
        }

        return data;
    },

    // Auth API
    async login(username, password) {
        const response = await this.request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });
        if (response && response.access_token) {
            this.setToken(response.access_token);
            this.setUser(response.worker);
        }
        return response;
    },

    // Workers API
    async getWorkers() {
        return await this.request("/workers");
    },

    async createWorker(workerData) {
        return await this.request("/workers", {
            method: "POST",
            body: JSON.stringify(workerData)
        });
    },

    // Rooms API
    async getRooms() {
        return await this.request("/rooms");
    },

    async createRoom(roomData) {
        return await this.request("/rooms", {
            method: "POST",
            body: JSON.stringify(roomData)
        });
    },

    async deleteRoom(roomId) {
        return await this.request(`/rooms/${roomId}`, {
            method: "DELETE"
        });
    },

    // Students API
    async getStudents() {
        return await this.request("/students");
    },

    async createStudent(studentData) {
        return await this.request("/students", {
            method: "POST",
            body: JSON.stringify(studentData)
        });
    },

    async deleteStudent(studentId) {
        return await this.request(`/students/${studentId}`, {
            method: "DELETE"
        });
    },

    // Payments API
    async getPayments() {
        return await this.request("/payments");
    },

    async createPayment(paymentData) {
        return await this.request("/payments", {
            method: "POST",
            body: JSON.stringify(paymentData)
        });
    },

    // Reports API
    async getReports() {
        return await this.request("/reports");
    },

    async createReport(reportData) {
        return await this.request("/reports", {
            method: "POST",
            body: JSON.stringify(reportData)
        });
    }
};

// Expose globally so plain <script> tags (no module system) can use it
window.ApiClient = ApiClient;
