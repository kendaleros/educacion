// Authentication & Session Guard Helpers - Powered by Supabase

const AUTH = {
    // Get the currently logged in user session
    getCurrentUser: () => {
        const session = sessionStorage.getItem("currentUser");
        if (!session) return null;
        return JSON.parse(session);
    },

    // Login process using Supabase
    login: async (username, password) => {
        try {
            // Buscar usuario por username o email en Supabase
            let { data: users, error } = await supabase
                .from('users')
                .select('*')
                .or(`username.eq.${username},email.eq.${username}`)
                .eq('password', password);

            if (error) throw error;

            if (!users || users.length === 0) {
                return { success: false, message: "Nombre de usuario o contraseña incorrectos." };
            }

            const user = users[0];

            if (!user.is_staff && !user.is_validated) {
                return { success: false, pending: true, username: user.username };
            }

            // Guardar sesión
            sessionStorage.setItem("currentUser", JSON.stringify(user));
            return { success: true, user };
        } catch (err) {
            console.error('Login error:', err);
            return { success: false, message: "Error al iniciar sesión. Intenta de nuevo." };
        }
    },

    // Register process using Supabase
    register: async (username, email, password) => {
        try {
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
                .select()
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
