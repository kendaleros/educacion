// Authentication & Session Guard Helpers

const AUTH = {
    // Get the currently logged in user session
    getCurrentUser: () => {
        const session = sessionStorage.getItem("currentUser");
        if (!session) return null;
        
        // Safety check: verify user still exists and status is active in DB
        const user = JSON.parse(session);
        const users = DB.getUsers();
        const dbUser = users.find(u => u.id === user.id);
        
        if (!dbUser) {
            AUTH.logout();
            return null;
        }
        
        return dbUser;
    },

    // Login process
    login: (username, password) => {
        const users = DB.getUsers();
        const user = users.find(
            u => (u.username === username || u.email === username) && u.password === password
        );

        if (!user) {
            return { success: false, message: "Nombre de usuario o contraseña incorrectos." };
        }

        if (!user.isStaff && !user.isValidated) {
            return { success: false, pending: true, username: user.username };
        }

        // Store session in sessionStorage (cleared when closing tab)
        sessionStorage.setItem("currentUser", JSON.stringify(user));
        return { success: true, user };
    },

    // Register process
    register: (username, email, password) => {
        const users = DB.getUsers();
        
        // Checks
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, message: "El nombre de usuario ya está registrado." };
        }
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, message: "El correo electrónico ya está registrado." };
        }

        const newUser = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            username,
            email,
            password,
            isStaff: false,
            isValidated: false
        };

        users.push(newUser);
        DB.saveUsers(users);
        return { success: true, user: newUser };
    },

    // Logout process
    logout: () => {
        sessionStorage.removeItem("currentUser");
        window.location.href = "login.html";
    },

    // Page level guards
    checkAuth: (requiredRole = null) => {
        const user = AUTH.getCurrentUser();
        
        if (!user) {
            window.location.href = "login.html";
            return null;
        }

        // Redirect unvalidated users
        if (!user.isStaff && !user.isValidated) {
            sessionStorage.removeItem("currentUser");
            window.location.href = "login.html?pending=" + encodeURIComponent(user.username);
            return null;
        }

        // Check special role
        if (requiredRole === "admin" && !user.isStaff) {
            window.location.href = "dashboard.html";
            return null;
        }

        return user;
    },

    // Redirect logged in users away from login/register
    redirectIfLoggedIn: () => {
        const user = AUTH.getCurrentUser();
        if (user) {
            if (user.isStaff || user.isValidated) {
                window.location.href = "dashboard.html";
            }
        }
    }
};
