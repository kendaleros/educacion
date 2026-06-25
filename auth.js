// Authentication & Session Guard Helpers - Powered by Supabase

const AUTH = {
    // Get the currently logged in user session
    getCurrentUser: () => {
        const session = sessionStorage.getItem("currentUser");
        if (!session) return null;
        try {
            return JSON.parse(session);
        } catch (err) {
            console.error("Stored session is invalid:", err);
            sessionStorage.removeItem("currentUser");
            return null;
        }
    },

    // Login process using Supabase
    login: async (username, password) => {
        try {
            const identifier = username.trim();

            // Buscar usuario por username (only fetch needed columns).
            let { data: user, error } = await supabase
                .from('users')
                .select('id, username, email, is_staff, is_validated, password')
                .eq('username', identifier)
                .maybeSingle();

            if (error) throw error;

            // Si no existe, buscar por email.
            if (!user) {
                const emailResult = await supabase
                    .from('users')
                    .select('id, username, email, is_staff, is_validated, password')
                    .eq('email', identifier)
                    .maybeSingle();

                if (emailResult.error) throw emailResult.error;
                user = emailResult.data;
            }

            if (!user || user.password !== password) {
                return { success: false, message: "Nombre de usuario o contraseña incorrectos." };
            }

            if (!user.is_staff && !user.is_validated) {
                return { success: false, pending: true, username: user.username };
            }

            // Strip password before storing in session
            const { password: _pw, ...safeUser } = user;
            sessionStorage.setItem("currentUser", JSON.stringify(safeUser));
            return { success: true, user: safeUser };
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, message: "Error al iniciar sesión. Intenta de nuevo." };
        }
    },

    // Register process using Supabase
    register: async (username, email, password) => {
        try {
            // Validate username format (alphanumeric, underscores, hyphens, 3-30 chars)
            if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
                return { success: false, message: "El nombre de usuario solo puede contener letras, números, guiones y guiones bajos (3-30 caracteres)." };
            }

            // Validate email format
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return { success: false, message: "El formato del correo electrónico no es válido." };
            }

            // Validate password strength
            if (password.length < 6) {
                return { success: false, message: "La contraseña debe tener al menos 6 caracteres." };
            }

            // Verificar si username ya existe
            let { data: existingUsername } = await supabase
                .from('users')
                .select('id')
                .eq('username', username);

            if (existingUsername && existingUsername.length > 0) {
                return { success: false, message: "El nombre de usuario ya está registrado." };
            }

            // Verificar si email ya existe
            let { data: existingEmail } = await supabase
                .from('users')
                .select('id')
                .eq('email', email);

            if (existingEmail && existingEmail.length > 0) {
                return { success: false, message: "El correo electrónico ya está registrado." };
            }

            // Crear nuevo usuario
            const { data: newUser, error } = await supabase
                .from('users')
                .insert([{
                    username,
                    email,
                    password,
                    is_staff: false,
                    is_validated: false
                }])
                .select('id, username, email, is_staff, is_validated')
                .single();

            if (error) throw error;

            return { success: true, user: newUser };
        } catch (err) {
            console.error('Register error:', err);
            return { success: false, message: "Error al registrarse. Intenta de nuevo." };
        }
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

        if (!user.is_staff && !user.is_validated) {
            sessionStorage.removeItem("currentUser");
            window.location.href = "login.html?pending=" + encodeURIComponent(user.username);
            return null;
        }

        if (requiredRole === "admin" && !user.is_staff) {
            window.location.href = "dashboard.html";
            return null;
        }

        return user;
    },

    redirectIfLoggedIn: () => {
        const user = AUTH.getCurrentUser();
        if (user) {
            if (user.is_staff || user.is_validated) {
                window.location.href = "dashboard.html";
            }
        }
    }
};
