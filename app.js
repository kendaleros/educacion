// Core Data Manager - Powered by Supabase

// URL Embed parser helper (YouTube & Vimeo support)
function getEmbedUrl(url) {
    if (!url) return "";
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return url;
}

// Get video thumbnail URL
function getThumbnailUrl(url) {
    if (!url) return "https://via.placeholder.com/160x90?text=No+Video";
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`;
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch) return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
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
