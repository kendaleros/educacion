// Core Data Manager - Powered by Supabase

function normalizeVideoInput(value) {
    if (!value) return "";
    const input = value.trim();
    const iframeSrc = input.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
    return (iframeSrc ? iframeSrc[1] : input)
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function getGoogleDriveFileId(url) {
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (fileMatch) return fileMatch[1];

    try {
        const parsed = new URL(url);
        if (parsed.hostname.includes("drive.google.com")) {
            return parsed.searchParams.get("id");
        }
    } catch (err) {
        return null;
    }

    return null;
}

function isOdyseeUrl(url) {
    try {
        return new URL(url).hostname.includes("odysee.com");
    } catch (err) {
        return false;
    }
}

function getOdyseeEmbedUrl(url) {
    const source = normalizeVideoInput(url);
    if (!source || !isOdyseeUrl(source)) return "";

    try {
        const parsed = new URL(source);
        let path = parsed.pathname || "";
        path = path.replace(/^\/%24\/embed\//i, "/$/embed/");

        if (!path.startsWith("/$/embed/")) {
            path = `/$/embed${path.startsWith("/") ? path : `/${path}`}`;
        }

        return `https://odysee.com${path}${parsed.search}`;
    } catch (err) {
        return source;
    }
}

function getVideoProvider(url) {
    const source = normalizeVideoInput(url);
    if (!source) return "generic";
    if (getGoogleDriveFileId(source)) return "drive";
    if (isOdyseeUrl(source)) return "odysee";
    if (source.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)) return "youtube";
    if (source.match(/vimeo\.com\/(?:video\/)?([0-9]+)/)) return "vimeo";
    return "generic";
}

function getGoogleDriveDirectUrl(url) {
    const source = normalizeVideoInput(url);
    const driveFileId = getGoogleDriveFileId(source);
    if (!driveFileId) return "";
    return `https://drive.google.com/uc?export=download&id=${driveFileId}`;
}

// URL Embed parser helper (YouTube, Vimeo & Google Drive support)
function getEmbedUrl(url, options = {}) {
    const source = normalizeVideoInput(url);
    if (!source) return "";

    const autoplay = options.autoplay === true;
    const ytMatch = source.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}${autoplay ? "?autoplay=1" : ""}`;
    }

    const vimeoMatch = source.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch) {
        const params = new URLSearchParams({
            badge: "0",
            autopause: "0",
            player_id: "0",
            app_id: "58479"
        });
        if (autoplay) {
            params.set("autoplay", "1");
        }
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?${params.toString()}`;
    }

    const driveFileId = getGoogleDriveFileId(source);
    if (driveFileId) {
        return `https://drive.google.com/file/d/${driveFileId}/preview`;
    }

    const odyseeEmbedUrl = getOdyseeEmbedUrl(source);
    if (odyseeEmbedUrl) {
        return odyseeEmbedUrl;
    }

    return source;
}

// Get video thumbnail URL
function getThumbnailUrl(url) {
    const source = normalizeVideoInput(url);
    if (!source) return "https://via.placeholder.com/160x90?text=No+Video";
    const ytMatch = source.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    const vimeoMatch = source.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
    const driveFileId = getGoogleDriveFileId(source);
    if (driveFileId) return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w320`;
    if (isOdyseeUrl(source)) return "https://via.placeholder.com/160x90?text=Odysee";
    return "https://via.placeholder.com/160x90?text=Video";
}

// Database Operations using Supabase
const DB = {
    // --- Users ---
    getUsers: async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) { console.error(error); return []; }
        return data;
    },

    approveUser: async (id) => {
        const { error } = await supabase.from('users').update({ is_validated: true }).eq('id', id);
        if (error) { console.error(error); return false; }
        return true;
    },

    suspendUser: async (id) => {
        const { error } = await supabase.from('users').update({ is_validated: false }).eq('id', id);
        if (error) { console.error(error); return false; }
        return true;
    },

    // --- Courses ---
    getCourses: async () => {
        const { data, error } = await supabase.from('courses').select('*');
        if (error) { console.error(error); return []; }
        return data;
    },

    createCourse: async (title, description) => {
        const { data, error } = await supabase.from('courses').insert([{ title, description }]).select().single();
        if (error) { console.error(error); return null; }
        return data;
    },

    updateCourse: async (id, title, description) => {
        const { data, error } = await supabase.from('courses').update({ title, description }).eq('id', id).select().single();
        if (error) { console.error(error); return null; }
        return data;
    },

    deleteCourse: async (id) => {
        const { error } = await supabase.from('courses').delete().eq('id', id);
        if (error) { console.error(error); return false; }
        return true;
    },

    // --- Modules ---
    getModules: async (courseId = null) => {
        let query = supabase.from('modules').select('*').order('order');
        if (courseId) query = query.eq('course_id', courseId);
        const { data, error } = await query;
        if (error) { console.error(error); return []; }
        return data;
    },

    createModule: async (courseId, title, description, order = 0) => {
        const { data, error } = await supabase.from('modules').insert([{ course_id: courseId, title, description, order: parseInt(order) || 0 }]).select().single();
        if (error) { console.error(error); return null; }
        return data;
    },

    updateModule: async (id, title, description, order = 0) => {
        const { data, error } = await supabase.from('modules').update({ title, description, order: parseInt(order) || 0 }).eq('id', id).select().single();
        if (error) { console.error(error); return null; }
        return data;
    },

    deleteModule: async (id) => {
        const { error } = await supabase.from('modules').delete().eq('id', id);
        if (error) { console.error(error); return false; }
        return true;
    },

    // --- Videos ---
    getVideos: async (moduleId = null) => {
        let query = supabase.from('videos').select('*').order('order');
        if (moduleId) query = query.eq('module_id', moduleId);
        const { data, error } = await query;
        if (error) { console.error(error); return []; }
        return data;
    },

    createVideo: async (moduleId, title, videoUrl, description, order = 0) => {
        const { data, error } = await supabase.from('videos').insert([{ module_id: moduleId, title, video_url: videoUrl, description, order: parseInt(order) || 0 }]).select().single();
        if (error) { console.error(error); return null; }
        return data;
    },

    updateVideo: async (id, title, videoUrl, description, order = 0) => {
        const { data, error } = await supabase.from('videos').update({ title, video_url: videoUrl, description, order: parseInt(order) || 0 }).eq('id', id).select().single();
        if (error) { console.error(error); return null; }
        return data;
    },

    deleteVideo: async (id) => {
        const { error } = await supabase.from('videos').delete().eq('id', id);
        if (error) { console.error(error); return false; }
        return true;
    }
};
