// Core Data Manager & LocalStorage Database

// Initial Mock Data to seed the application
const DEFAULT_COURSES = [
    {
        id: 1,
        title: "Curso de Git & GitHub",
        description: "Aprende el sistema de control de versiones líder en el mundo y trabaja en equipo de forma profesional."
    },
    {
        id: 2,
        title: "JavaScript Moderno (ES6+)",
        description: "Domina las bases sólidas de JS y aprende las características más recientes de ECMAScript para desarrollo web."
    }
];

const DEFAULT_MODULES = [
    { id: 1, courseId: 1, title: "Fundamentos de Git", description: "Configuración inicial y flujo básico de Git.", order: 1 },
    { id: 2, courseId: 1, title: "Trabajando con Ramas", description: "Creación, fusión y resolución de conflictos.", order: 2 },
    { id: 3, courseId: 2, title: "Sintaxis Moderna y ES6+", description: "Variables let/const, arrow functions, desestructuración.", order: 1 },
    { id: 4, courseId: 2, title: "Programación Asíncrona", description: "Callbacks, Promesas y Async/Await.", order: 2 }
];

const DEFAULT_VIDEOS = [
    { id: 1, moduleId: 1, title: "Instalación y Git Config", videoUrl: "https://www.youtube.com/watch?v=OSEKO-D3i1E", description: "Instalación de Git paso a paso y configuración de tu correo e identidad.", order: 1 },
    { id: 2, moduleId: 1, title: "Mi primer Commit (init, add, commit)", videoUrl: "https://www.youtube.com/watch?v=JelS11sTsmI", description: "Cómo inicializar un repositorio, agregar archivos y guardarlos en el historial.", order: 2 },
    { id: 3, moduleId: 2, title: "Creación y Fusión de Ramas", videoUrl: "https://www.youtube.com/watch?v=O129s5r2h0w", description: "Aprende el uso básico de git branch y git merge.", order: 1 },
    { id: 4, moduleId: 3, title: "Arrow Functions & Templates", videoUrl: "https://www.youtube.com/watch?v=2nqp870G5bE", description: "Sintaxis compacta de funciones y uso de template strings.", order: 1 }
];

const DEFAULT_USERS = [
    { id: 1, username: "admin", email: "admin@curso.com", password: "adminpassword", isStaff: true, isValidated: true },
    { id: 2, username: "estudiante", email: "student@curso.com", password: "studentpassword", isStaff: false, isValidated: true },
    { id: 3, username: "pendiente", email: "pending@curso.com", password: "pendingpassword", isStaff: false, isValidated: false }
];

// Helper database getters and setters
function getDb(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
    }
    return JSON.parse(data);
}

function setDb(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

// Database Operations
const DB = {
    getUsers: () => getDb("users", DEFAULT_USERS),
    saveUsers: (users) => setDb("users", users),

    getCourses: () => getDb("courses", DEFAULT_COURSES),
    saveCourses: (courses) => setDb("courses", courses),

    getModules: () => getDb("modules", DEFAULT_MODULES),
    saveModules: (modules) => setDb("modules", modules),

    getVideos: () => getDb("videos", DEFAULT_VIDEOS),
    saveVideos: (videos) => setDb("videos", videos),

    // --- Users CRUD ---
    approveUser: (id) => {
        const users = DB.getUsers();
        const user = users.find(u => u.id === id);
        if (user) {
            user.isValidated = true;
            DB.saveUsers(users);
            return true;
        }
        return false;
    },

    suspendUser: (id) => {
        const users = DB.getUsers();
        const user = users.find(u => u.id === id);
        if (user) {
            user.isValidated = false;
            DB.saveUsers(users);
            return true;
        }
        return false;
    },

    // --- Courses CRUD ---
    createCourse: (title, description) => {
        const courses = DB.getCourses();
        const newCourse = {
            id: courses.length > 0 ? Math.max(...courses.map(c => c.id)) + 1 : 1,
            title,
            description
        };
        courses.push(newCourse);
        DB.saveCourses(courses);
        return newCourse;
    },

    updateCourse: (id, title, description) => {
        const courses = DB.getCourses();
        const course = courses.find(c => c.id === id);
        if (course) {
            course.title = title;
            course.description = description;
            DB.saveCourses(courses);
            return course;
        }
        return null;
    },

    deleteCourse: (id) => {
        let courses = DB.getCourses();
        courses = courses.filter(c => c.id !== id);
        DB.saveCourses(courses);

        // Cascade delete modules & videos
        let modules = DB.getModules();
        const modulesToDelete = modules.filter(m => m.courseId === id).map(m => m.id);
        modules = modules.filter(m => m.courseId !== id);
        DB.saveModules(modules);

        let videos = DB.getVideos();
        videos = videos.filter(v => !modulesToDelete.includes(v.moduleId));
        DB.saveVideos(videos);
        return true;
    },

    // --- Modules CRUD ---
    createModule: (courseId, title, description, order = 0) => {
        const modules = DB.getModules();
        const newModule = {
            id: modules.length > 0 ? Math.max(...modules.map(m => m.id)) + 1 : 1,
            courseId,
            title,
            description,
            order: parseInt(order) || 0
        };
        modules.push(newModule);
        DB.saveModules(modules);
        return newModule;
    },

    updateModule: (id, title, description, order = 0) => {
        const modules = DB.getModules();
        const module = modules.find(m => m.id === id);
        if (module) {
            module.title = title;
            module.description = description;
            module.order = parseInt(order) || 0;
            DB.saveModules(modules);
            return module;
        }
        return null;
    },

    deleteModule: (id) => {
        let modules = DB.getModules();
        modules = modules.filter(m => m.id !== id);
        DB.saveModules(modules);

        let videos = DB.getVideos();
        videos = videos.filter(v => v.moduleId !== id);
        DB.saveVideos(videos);
        return true;
    },

    // --- Videos CRUD ---
    createVideo: (moduleId, title, videoUrl, description, order = 0) => {
        const videos = DB.getVideos();
        const newVideo = {
            id: videos.length > 0 ? Math.max(...videos.map(v => v.id)) + 1 : 1,
            moduleId,
            title,
            videoUrl,
            description,
            order: parseInt(order) || 0
        };
        videos.push(newVideo);
        DB.saveVideos(videos);
        return newVideo;
    },

    updateVideo: (id, title, videoUrl, description, order = 0) => {
        const videos = DB.getVideos();
        const video = videos.find(v => v.id === id);
        if (video) {
            video.title = title;
            video.videoUrl = videoUrl;
            video.description = description;
            video.order = parseInt(order) || 0;
            DB.saveVideos(videos);
            return video;
        }
        return null;
    },

    deleteVideo: (id) => {
        let videos = DB.getVideos();
        videos = videos.filter(v => v.id !== id);
        DB.saveVideos(videos);
        return true;
    }
};

// URL Embed parser helper (YouTube & Vimeo support)
function getEmbedUrl(url) {
    if (!url) return "";
    
    // YouTube Regex matches: youtube.com/watch?v=..., youtu.be/...
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    // Vimeo Regex matches: vimeo.com/...
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    
    return url;
}
