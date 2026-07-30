/* ============================================================
   PG MANAGEMENT SYSTEM - API CLIENT WRAPPER
   ============================================================ */

const API_BASE_URL = "http://127.0.0.1:8000";

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
        return user ? JSON.parse(user) : null;
    },

    setUser(user) {
        localStorage.setItem("worker_user", JSON.stringify(user));
    },

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = options.headers || {};

        const token = this.getToken();
        if (token && !headers["Authorization"]) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);

            // Handle Unauthorized redirect
            if (response.status === 401 && !endpoint.includes("/auth/login")) {
                this.clearAuth();
                window.location.href = "login.html";
                throw new Error("Session expired. Please log in again.");
            }

            const data = await response.json();

            if (!response.ok) {
                const errorMessage = data.detail || "An error occurred while processing request";
                throw new Error(errorMessage);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },

    // Auth API
    async login(username, password) {
        const response = await this.request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });
        if (response.access_token) {
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