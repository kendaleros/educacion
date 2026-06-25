// Core Data Manager - Powered by Supabase

// Default thumbnail for all videos
const DEFAULT_THUMBNAIL = "https://i.imgur.com/sYV8Lyi.png";

// Regex patterns for video provider detection (used by multiple functions)
const YT_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const VIMEO_REGEX = /vimeo\.com\/(?:video\/)?([0-9]+)/;

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
    if (source.match(YT_REGEX)) return "youtube";
    if (source.match(VIMEO_REGEX)) return "vimeo";
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
    const ytMatch = source.match(YT_REGEX);
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}${autoplay ? "?autoplay=1" : ""}`;
    }

    const vimeoMatch = source.match(VIMEO_REGEX);
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
    return DEFAULT_THUMBNAIL;
}

// Return an array of candidate thumbnail URLs for a video URL (YouTube, Vimeo, Drive, Odysee)
function getCandidateThumbnails(url) {
    const source = normalizeVideoInput(url);
    const candidates = [];
    
    if (!source) return candidates;

    const ytMatch = source.match(YT_REGEX);
    if (ytMatch) {
        const id = ytMatch[1];
        candidates.push(
            `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${id}/sddefault.jpg`,
            `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
            `https://img.youtube.com/vi/${id}/default.jpg`
        );
        return candidates;
    }

    const vimeoMatch = source.match(VIMEO_REGEX);
    if (vimeoMatch) {
        candidates.push(`https://vumbnail.com/${vimeoMatch[1]}.jpg`);
        return candidates;
    }

    const driveFileId = getGoogleDriveFileId(source);
    if (driveFileId) {
        candidates.push(
            `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w640`,
            `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w320`
        );
        return candidates;
    }

    if (isOdyseeUrl(source)) {
        candidates.push("https://via.placeholder.com/640x360?text=Odysee");
        return candidates;
    }

    return candidates;
}

// Database Operations using Supabase
// Internal helpers to reduce repetitive error handling across CRUD methods.
async function _dbQuery(queryPromise, fallback = []) {
    const { data, error } = await queryPromise;
    if (error) { console.error(error); return fallback; }
    return data;
}

async function _dbMutate(queryPromise, fallback = null) {
    const { data, error } = await queryPromise;
    if (error) { console.error(error); return fallback; }
    return data ?? true;
}

const DB = {
    // --- Users ---
    getUsers: () => _dbQuery(supabase.from('users').select('*')),
    approveUser: (id) => _dbMutate(supabase.from('users').update({ is_validated: true }).eq('id', id), false),
    suspendUser: (id) => _dbMutate(supabase.from('users').update({ is_validated: false }).eq('id', id), false),

    // --- Courses ---
    getCourses: () => _dbQuery(supabase.from('courses').select('*')),
    createCourse: (title, description) => _dbMutate(supabase.from('courses').insert([{ title, description }]).select().single()),
    updateCourse: (id, title, description) => _dbMutate(supabase.from('courses').update({ title, description }).eq('id', id).select().single()),
    deleteCourse: (id) => _dbMutate(supabase.from('courses').delete().eq('id', id), false),

    // --- Modules ---
    getModules: (courseId = null) => {
        let query = supabase.from('modules').select('*').order('order');
        if (courseId) query = query.eq('course_id', courseId);
        return _dbQuery(query);
    },
    createModule: (courseId, title, description, order = 0) =>
        _dbMutate(supabase.from('modules').insert([{ course_id: courseId, title, description, order: parseInt(order) || 0 }]).select().single()),
    updateModule: (id, title, description, order = 0) =>
        _dbMutate(supabase.from('modules').update({ title, description, order: parseInt(order) || 0 }).eq('id', id).select().single()),
    deleteModule: (id) => _dbMutate(supabase.from('modules').delete().eq('id', id), false),

    // --- Videos ---
    getVideos: (moduleId = null) => {
        let query = supabase.from('videos').select('*').order('order');
        if (moduleId) query = query.eq('module_id', moduleId);
        return _dbQuery(query);
    },
    createVideo: (moduleId, title, videoUrl, description, order = 0) =>
        _dbMutate(supabase.from('videos').insert([{ module_id: moduleId, title, video_url: videoUrl, description, order: parseInt(order) || 0 }]).select().single()),
    updateVideo: (id, title, videoUrl, description, order = 0) =>
        _dbMutate(supabase.from('videos').update({ title, video_url: videoUrl, description, order: parseInt(order) || 0 }).eq('id', id).select().single()),
    deleteVideo: (id) => _dbMutate(supabase.from('videos').delete().eq('id', id), false)
};
