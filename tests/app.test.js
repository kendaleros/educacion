// Unit tests for app.js utility functions

// Mock supabase globally before requiring app.js
const mockSupabase = {
    from: jest.fn()
};
global.supabase = mockSupabase;

const {
    normalizeVideoInput,
    getGoogleDriveFileId,
    isOdyseeUrl,
    getOdyseeEmbedUrl,
    getVideoProvider,
    getGoogleDriveDirectUrl,
    getEmbedUrl,
    getThumbnailUrl,
    getCandidateThumbnails,
    DB,
    DEFAULT_THUMBNAIL
} = require('../app');

// ============================================================
// normalizeVideoInput
// ============================================================
describe('normalizeVideoInput', () => {
    test('returns empty string for falsy values', () => {
        expect(normalizeVideoInput(null)).toBe('');
        expect(normalizeVideoInput(undefined)).toBe('');
        expect(normalizeVideoInput('')).toBe('');
    });

    test('trims whitespace', () => {
        expect(normalizeVideoInput('  https://example.com  ')).toBe('https://example.com');
    });

    test('extracts src from iframe tag', () => {
        const iframe = '<iframe src="https://www.youtube.com/embed/abc123" frameborder="0"></iframe>';
        expect(normalizeVideoInput(iframe)).toBe('https://www.youtube.com/embed/abc123');
    });

    test('extracts src with single quotes from iframe', () => {
        const iframe = "<iframe src='https://player.vimeo.com/video/12345'></iframe>";
        expect(normalizeVideoInput(iframe)).toBe('https://player.vimeo.com/video/12345');
    });

    test('decodes HTML entities', () => {
        expect(normalizeVideoInput('https://example.com?a=1&amp;b=2')).toBe('https://example.com?a=1&b=2');
        expect(normalizeVideoInput('title=&quot;hello&quot;')).toBe('title="hello"');
        expect(normalizeVideoInput("it&#39;s")).toBe("it's");
    });

    test('returns plain URL unchanged', () => {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        expect(normalizeVideoInput(url)).toBe(url);
    });
});

// ============================================================
// getGoogleDriveFileId
// ============================================================
describe('getGoogleDriveFileId', () => {
    test('returns null for non-Drive URLs', () => {
        expect(getGoogleDriveFileId('https://www.youtube.com/watch?v=abc')).toBeNull();
        expect(getGoogleDriveFileId('https://example.com')).toBeNull();
    });

    test('extracts file ID from /file/d/ format', () => {
        const url = 'https://drive.google.com/file/d/1aBcDeFgH/view?usp=sharing';
        expect(getGoogleDriveFileId(url)).toBe('1aBcDeFgH');
    });

    test('extracts file ID from ?id= parameter', () => {
        const url = 'https://drive.google.com/open?id=myFileId123';
        expect(getGoogleDriveFileId(url)).toBe('myFileId123');
    });

    test('returns null for malformed URLs', () => {
        expect(getGoogleDriveFileId('not a url at all')).toBeNull();
    });

    test('returns null for empty/falsy input', () => {
        expect(getGoogleDriveFileId('')).toBeNull();
    });
});

// ============================================================
// isOdyseeUrl
// ============================================================
describe('isOdyseeUrl', () => {
    test('returns true for odysee.com URLs', () => {
        expect(isOdyseeUrl('https://odysee.com/@channel/video')).toBe(true);
        expect(isOdyseeUrl('https://www.odysee.com/video')).toBe(true);
    });

    test('returns false for non-Odysee URLs', () => {
        expect(isOdyseeUrl('https://youtube.com/watch?v=abc')).toBe(false);
        expect(isOdyseeUrl('https://example.com')).toBe(false);
    });

    test('returns false for invalid URLs', () => {
        expect(isOdyseeUrl('not a url')).toBe(false);
        expect(isOdyseeUrl('')).toBe(false);
    });
});

// ============================================================
// getOdyseeEmbedUrl
// ============================================================
describe('getOdyseeEmbedUrl', () => {
    test('returns empty string for non-Odysee URLs', () => {
        expect(getOdyseeEmbedUrl('https://youtube.com/watch?v=abc')).toBe('');
        expect(getOdyseeEmbedUrl('')).toBe('');
        expect(getOdyseeEmbedUrl(null)).toBe('');
    });

    test('converts regular Odysee URL to embed format', () => {
        const url = 'https://odysee.com/@channel/video-title';
        const result = getOdyseeEmbedUrl(url);
        expect(result).toBe('https://odysee.com/$/embed/@channel/video-title');
    });

    test('keeps existing embed URLs intact', () => {
        const url = 'https://odysee.com/$/embed/@channel/video-title';
        expect(getOdyseeEmbedUrl(url)).toBe('https://odysee.com/$/embed/@channel/video-title');
    });

    test('normalizes %24 encoded dollar sign', () => {
        const url = 'https://odysee.com/%24/embed/@channel/video';
        expect(getOdyseeEmbedUrl(url)).toBe('https://odysee.com/$/embed/@channel/video');
    });
});

// ============================================================
// getVideoProvider
// ============================================================
describe('getVideoProvider', () => {
    test('returns "generic" for empty input', () => {
        expect(getVideoProvider('')).toBe('generic');
        expect(getVideoProvider(null)).toBe('generic');
    });

    test('returns "youtube" for YouTube URLs', () => {
        expect(getVideoProvider('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('youtube');
        expect(getVideoProvider('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube');
        expect(getVideoProvider('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('youtube');
    });

    test('returns "vimeo" for Vimeo URLs', () => {
        expect(getVideoProvider('https://vimeo.com/123456789')).toBe('vimeo');
        expect(getVideoProvider('https://vimeo.com/video/123456789')).toBe('vimeo');
    });

    test('returns "drive" for Google Drive URLs', () => {
        expect(getVideoProvider('https://drive.google.com/file/d/abc123/view')).toBe('drive');
    });

    test('returns "odysee" for Odysee URLs', () => {
        expect(getVideoProvider('https://odysee.com/@channel/video')).toBe('odysee');
    });

    test('returns "generic" for unknown providers', () => {
        expect(getVideoProvider('https://example.com/video.mp4')).toBe('generic');
    });
});

// ============================================================
// getGoogleDriveDirectUrl
// ============================================================
describe('getGoogleDriveDirectUrl', () => {
    test('returns empty string for non-Drive URLs', () => {
        expect(getGoogleDriveDirectUrl('https://youtube.com/watch?v=abc')).toBe('');
    });

    test('returns direct download URL for Drive file', () => {
        const url = 'https://drive.google.com/file/d/myFile123/view';
        expect(getGoogleDriveDirectUrl(url)).toBe('https://drive.google.com/uc?export=download&id=myFile123');
    });

    test('returns empty string for empty input', () => {
        expect(getGoogleDriveDirectUrl('')).toBe('');
    });
});

// ============================================================
// getEmbedUrl
// ============================================================
describe('getEmbedUrl', () => {
    test('returns empty string for empty input', () => {
        expect(getEmbedUrl('')).toBe('');
        expect(getEmbedUrl(null)).toBe('');
    });

    test('returns YouTube embed URL', () => {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        expect(getEmbedUrl(url)).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    test('returns YouTube embed URL with autoplay', () => {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        expect(getEmbedUrl(url, { autoplay: true })).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1');
    });

    test('returns Vimeo embed URL', () => {
        const url = 'https://vimeo.com/123456789';
        const result = getEmbedUrl(url);
        expect(result).toContain('https://player.vimeo.com/video/123456789');
        expect(result).toContain('badge=0');
        expect(result).toContain('autopause=0');
    });

    test('returns Vimeo embed URL with autoplay', () => {
        const url = 'https://vimeo.com/123456789';
        const result = getEmbedUrl(url, { autoplay: true });
        expect(result).toContain('autoplay=1');
    });

    test('returns Google Drive preview URL', () => {
        const url = 'https://drive.google.com/file/d/fileId123/view';
        expect(getEmbedUrl(url)).toBe('https://drive.google.com/file/d/fileId123/preview');
    });

    test('returns Odysee embed URL', () => {
        const url = 'https://odysee.com/@channel/video-title';
        const result = getEmbedUrl(url);
        expect(result).toContain('odysee.com/$/embed/');
    });

    test('returns source URL for unknown providers', () => {
        const url = 'https://example.com/video.mp4';
        expect(getEmbedUrl(url)).toBe('https://example.com/video.mp4');
    });
});

// ============================================================
// getThumbnailUrl
// ============================================================
describe('getThumbnailUrl', () => {
    test('always returns DEFAULT_THUMBNAIL', () => {
        expect(getThumbnailUrl('https://youtube.com/watch?v=abc')).toBe(DEFAULT_THUMBNAIL);
        expect(getThumbnailUrl('')).toBe(DEFAULT_THUMBNAIL);
        expect(getThumbnailUrl(null)).toBe(DEFAULT_THUMBNAIL);
    });
});

// ============================================================
// getCandidateThumbnails
// ============================================================
describe('getCandidateThumbnails', () => {
    test('returns empty array for empty input', () => {
        expect(getCandidateThumbnails('')).toEqual([]);
        expect(getCandidateThumbnails(null)).toEqual([]);
    });

    test('returns YouTube thumbnail candidates', () => {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const candidates = getCandidateThumbnails(url);
        expect(candidates).toHaveLength(5);
        expect(candidates[0]).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
        expect(candidates[4]).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/default.jpg');
    });

    test('returns Vimeo thumbnail candidate', () => {
        const url = 'https://vimeo.com/123456789';
        const candidates = getCandidateThumbnails(url);
        expect(candidates).toHaveLength(1);
        expect(candidates[0]).toBe('https://vumbnail.com/123456789.jpg');
    });

    test('returns Google Drive thumbnail candidates', () => {
        const url = 'https://drive.google.com/file/d/fileXyz/view';
        const candidates = getCandidateThumbnails(url);
        expect(candidates).toHaveLength(2);
        expect(candidates[0]).toContain('thumbnail?id=fileXyz');
        expect(candidates[0]).toContain('sz=w640');
        expect(candidates[1]).toContain('sz=w320');
    });

    test('returns Odysee placeholder thumbnail', () => {
        const url = 'https://odysee.com/@channel/video';
        const candidates = getCandidateThumbnails(url);
        expect(candidates).toHaveLength(1);
        expect(candidates[0]).toContain('placeholder');
    });

    test('returns empty array for unknown provider', () => {
        const url = 'https://example.com/video.mp4';
        const candidates = getCandidateThumbnails(url);
        expect(candidates).toEqual([]);
    });
});

// ============================================================
// DB operations (mocked supabase)
// ============================================================
describe('DB', () => {
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn()
        };
        mockSupabase.from.mockReturnValue(mockQuery);
    });

    describe('getUsers', () => {
        test('returns users data on success', async () => {
            const users = [{ id: 1, username: 'admin' }];
            mockQuery.select.mockResolvedValue({ data: users, error: null });
            const result = await DB.getUsers();
            expect(result).toEqual(users);
            expect(mockSupabase.from).toHaveBeenCalledWith('users');
        });

        test('returns empty array on error', async () => {
            mockQuery.select.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.getUsers();
            expect(result).toEqual([]);
        });
    });

    describe('approveUser', () => {
        test('returns true on success', async () => {
            mockQuery.eq.mockResolvedValue({ error: null });
            const result = await DB.approveUser(1);
            expect(result).toBe(true);
        });

        test('returns false on error', async () => {
            mockQuery.eq.mockResolvedValue({ error: new Error('fail') });
            const result = await DB.approveUser(1);
            expect(result).toBe(false);
        });
    });

    describe('suspendUser', () => {
        test('returns true on success', async () => {
            mockQuery.eq.mockResolvedValue({ error: null });
            const result = await DB.suspendUser(1);
            expect(result).toBe(true);
        });

        test('returns false on error', async () => {
            mockQuery.eq.mockResolvedValue({ error: new Error('fail') });
            const result = await DB.suspendUser(1);
            expect(result).toBe(false);
        });
    });

    describe('getCourses', () => {
        test('returns courses on success', async () => {
            const courses = [{ id: 1, title: 'Git' }];
            mockQuery.select.mockResolvedValue({ data: courses, error: null });
            const result = await DB.getCourses();
            expect(result).toEqual(courses);
        });

        test('returns empty array on error', async () => {
            mockQuery.select.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.getCourses();
            expect(result).toEqual([]);
        });
    });

    describe('createCourse', () => {
        test('returns created course on success', async () => {
            const course = { id: 1, title: 'New', description: 'Desc' };
            mockQuery.single.mockResolvedValue({ data: course, error: null });
            const result = await DB.createCourse('New', 'Desc');
            expect(result).toEqual(course);
        });

        test('returns null on error', async () => {
            mockQuery.single.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.createCourse('New', 'Desc');
            expect(result).toBeNull();
        });
    });

    describe('updateCourse', () => {
        test('returns updated course on success', async () => {
            const course = { id: 1, title: 'Updated', description: 'Desc' };
            mockQuery.single.mockResolvedValue({ data: course, error: null });
            const result = await DB.updateCourse(1, 'Updated', 'Desc');
            expect(result).toEqual(course);
        });

        test('returns null on error', async () => {
            mockQuery.single.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.updateCourse(1, 'Updated', 'Desc');
            expect(result).toBeNull();
        });
    });

    describe('deleteCourse', () => {
        test('returns true on success', async () => {
            mockQuery.eq.mockResolvedValue({ error: null });
            const result = await DB.deleteCourse(1);
            expect(result).toBe(true);
        });

        test('returns false on error', async () => {
            mockQuery.eq.mockResolvedValue({ error: new Error('fail') });
            const result = await DB.deleteCourse(1);
            expect(result).toBe(false);
        });
    });

    describe('getModules', () => {
        test('returns all modules when no courseId given', async () => {
            const modules = [{ id: 1, title: 'M1' }];
            mockQuery.order.mockResolvedValue({ data: modules, error: null });
            const result = await DB.getModules();
            expect(result).toEqual(modules);
        });

        test('filters by courseId when provided', async () => {
            const modules = [{ id: 1, title: 'M1', course_id: 2 }];
            mockQuery.eq.mockResolvedValue({ data: modules, error: null });
            const result = await DB.getModules(2);
            expect(result).toEqual(modules);
            expect(mockQuery.eq).toHaveBeenCalledWith('course_id', 2);
        });

        test('returns empty array on error', async () => {
            mockQuery.order.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.getModules();
            expect(result).toEqual([]);
        });
    });

    describe('createModule', () => {
        test('returns created module on success', async () => {
            const mod = { id: 1, course_id: 1, title: 'M1' };
            mockQuery.single.mockResolvedValue({ data: mod, error: null });
            const result = await DB.createModule(1, 'M1', 'Desc', 1);
            expect(result).toEqual(mod);
        });

        test('returns null on error', async () => {
            mockQuery.single.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.createModule(1, 'M1', 'Desc', 1);
            expect(result).toBeNull();
        });
    });

    describe('updateModule', () => {
        test('returns updated module on success', async () => {
            const mod = { id: 1, title: 'Updated' };
            mockQuery.single.mockResolvedValue({ data: mod, error: null });
            const result = await DB.updateModule(1, 'Updated', 'Desc', 2);
            expect(result).toEqual(mod);
        });

        test('returns null on error', async () => {
            mockQuery.single.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.updateModule(1, 'Updated', 'Desc', 2);
            expect(result).toBeNull();
        });
    });

    describe('deleteModule', () => {
        test('returns true on success', async () => {
            mockQuery.eq.mockResolvedValue({ error: null });
            const result = await DB.deleteModule(1);
            expect(result).toBe(true);
        });

        test('returns false on error', async () => {
            mockQuery.eq.mockResolvedValue({ error: new Error('fail') });
            const result = await DB.deleteModule(1);
            expect(result).toBe(false);
        });
    });

    describe('getVideos', () => {
        test('returns all videos when no moduleId given', async () => {
            const videos = [{ id: 1, title: 'V1' }];
            mockQuery.order.mockResolvedValue({ data: videos, error: null });
            const result = await DB.getVideos();
            expect(result).toEqual(videos);
        });

        test('filters by moduleId when provided', async () => {
            const videos = [{ id: 1, title: 'V1', module_id: 3 }];
            mockQuery.eq.mockResolvedValue({ data: videos, error: null });
            const result = await DB.getVideos(3);
            expect(result).toEqual(videos);
            expect(mockQuery.eq).toHaveBeenCalledWith('module_id', 3);
        });

        test('returns empty array on error', async () => {
            mockQuery.order.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.getVideos();
            expect(result).toEqual([]);
        });
    });

    describe('createVideo', () => {
        test('returns created video on success', async () => {
            const video = { id: 1, title: 'V1' };
            mockQuery.single.mockResolvedValue({ data: video, error: null });
            const result = await DB.createVideo(1, 'V1', 'http://url', 'Desc', 1);
            expect(result).toEqual(video);
        });

        test('returns null on error', async () => {
            mockQuery.single.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.createVideo(1, 'V1', 'http://url', 'Desc', 1);
            expect(result).toBeNull();
        });
    });

    describe('updateVideo', () => {
        test('returns updated video on success', async () => {
            const video = { id: 1, title: 'Updated' };
            mockQuery.single.mockResolvedValue({ data: video, error: null });
            const result = await DB.updateVideo(1, 'Updated', 'http://url', 'Desc', 2);
            expect(result).toEqual(video);
        });

        test('returns null on error', async () => {
            mockQuery.single.mockResolvedValue({ data: null, error: new Error('fail') });
            const result = await DB.updateVideo(1, 'Updated', 'http://url', 'Desc', 2);
            expect(result).toBeNull();
        });
    });

    describe('deleteVideo', () => {
        test('returns true on success', async () => {
            mockQuery.eq.mockResolvedValue({ error: null });
            const result = await DB.deleteVideo(1);
            expect(result).toBe(true);
        });

        test('returns false on error', async () => {
            mockQuery.eq.mockResolvedValue({ error: new Error('fail') });
            const result = await DB.deleteVideo(1);
            expect(result).toBe(false);
        });
    });
});
