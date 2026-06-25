// Unit tests for auth.js

// Mock sessionStorage
const mockSessionStorage = (() => {
    let store = {};
    return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value; }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(global, 'sessionStorage', { value: mockSessionStorage });

// Mock window.location
const mockLocation = { href: '' };
delete global.window;
global.window = { location: mockLocation };

// Mock supabase
const mockSupabase = { from: jest.fn() };
global.supabase = mockSupabase;

const { AUTH } = require('../auth');

describe('AUTH', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSessionStorage.clear();
        mockLocation.href = '';
    });

    // ============================================================
    // getCurrentUser
    // ============================================================
    describe('getCurrentUser', () => {
        test('returns null when no session stored', () => {
            expect(AUTH.getCurrentUser()).toBeNull();
        });

        test('returns parsed user when valid session exists', () => {
            const user = { id: 1, username: 'admin', is_staff: true };
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(user));
            expect(AUTH.getCurrentUser()).toEqual(user);
        });

        test('returns null and removes item for invalid JSON', () => {
            mockSessionStorage.getItem.mockReturnValue('not valid json{');
            expect(AUTH.getCurrentUser()).toBeNull();
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('currentUser');
        });
    });

    // ============================================================
    // login
    // ============================================================
    describe('login', () => {
        let mockQuery;

        beforeEach(() => {
            mockQuery = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                maybeSingle: jest.fn()
            };
            mockSupabase.from.mockReturnValue(mockQuery);
        });

        test('returns success for valid username login', async () => {
            const user = { id: 1, username: 'admin', is_staff: true, is_validated: true };
            mockQuery.maybeSingle.mockResolvedValue({ data: user, error: null });

            const result = await AUTH.login('admin', 'password123');
            expect(result.success).toBe(true);
            expect(result.user).toEqual(user);
            expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
                'currentUser',
                JSON.stringify(user)
            );
        });

        test('falls back to email lookup when username not found', async () => {
            // First call (username lookup) returns null
            mockQuery.maybeSingle
                .mockResolvedValueOnce({ data: null, error: null })
                // Second call (email lookup) returns user
                .mockResolvedValueOnce({ data: { id: 2, username: 'user', email: 'user@test.com', is_staff: false, is_validated: true }, error: null });

            const result = await AUTH.login('user@test.com', 'pass');
            expect(result.success).toBe(true);
            expect(result.user.email).toBe('user@test.com');
        });

        test('returns failure for invalid credentials', async () => {
            mockQuery.maybeSingle
                .mockResolvedValueOnce({ data: null, error: null })
                .mockResolvedValueOnce({ data: null, error: null });

            const result = await AUTH.login('wrong', 'creds');
            expect(result.success).toBe(false);
            expect(result.message).toBe('Nombre de usuario o contrase\u00f1a incorrectos.');
        });

        test('returns pending for non-validated non-staff user', async () => {
            const user = { id: 3, username: 'newuser', is_staff: false, is_validated: false };
            mockQuery.maybeSingle.mockResolvedValue({ data: user, error: null });

            const result = await AUTH.login('newuser', 'pass');
            expect(result.success).toBe(false);
            expect(result.pending).toBe(true);
            expect(result.username).toBe('newuser');
        });

        test('returns error message on supabase error', async () => {
            mockQuery.maybeSingle.mockResolvedValue({ data: null, error: new Error('network fail') });

            const result = await AUTH.login('admin', 'pass');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Error al iniciar sesi\u00f3n');
        });

        test('trims username before searching', async () => {
            const user = { id: 1, username: 'admin', is_staff: true, is_validated: true };
            mockQuery.maybeSingle.mockResolvedValue({ data: user, error: null });

            await AUTH.login('  admin  ', 'pass');
            expect(mockQuery.eq).toHaveBeenCalledWith('username', 'admin');
        });
    });

    // ============================================================
    // register
    // ============================================================
    describe('register', () => {
        let mockQuery;

        beforeEach(() => {
            mockQuery = {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                insert: jest.fn().mockReturnThis(),
                single: jest.fn()
            };
            mockSupabase.from.mockReturnValue(mockQuery);
        });

        test('returns failure if username already exists', async () => {
            mockQuery.eq.mockResolvedValue({ data: [{ id: 1 }], error: null });

            const result = await AUTH.register('existinguser', 'new@mail.com', 'pass');
            expect(result.success).toBe(false);
            expect(result.message).toContain('nombre de usuario ya est\u00e1 registrado');
        });

        test('returns failure if email already exists', async () => {
            // First call: username check - not found
            mockQuery.eq
                .mockResolvedValueOnce({ data: [], error: null })
                // Second call: email check - found
                .mockResolvedValueOnce({ data: [{ id: 2 }], error: null });

            const result = await AUTH.register('newuser', 'existing@mail.com', 'pass');
            expect(result.success).toBe(false);
            expect(result.message).toContain('correo electr\u00f3nico ya est\u00e1 registrado');
        });

        test('returns success for new user registration', async () => {
            const newUser = { id: 5, username: 'newuser', email: 'new@mail.com', is_staff: false, is_validated: false };
            // Username check - not found
            mockQuery.eq
                .mockResolvedValueOnce({ data: [], error: null })
                // Email check - not found
                .mockResolvedValueOnce({ data: [], error: null });
            // Insert result
            mockQuery.single.mockResolvedValue({ data: newUser, error: null });

            const result = await AUTH.register('newuser', 'new@mail.com', 'pass');
            expect(result.success).toBe(true);
            expect(result.user).toEqual(newUser);
        });

        test('returns error message on insert failure', async () => {
            mockQuery.eq
                .mockResolvedValueOnce({ data: [], error: null })
                .mockResolvedValueOnce({ data: [], error: null });
            mockQuery.single.mockResolvedValue({ data: null, error: new Error('insert fail') });

            const result = await AUTH.register('newuser', 'new@mail.com', 'pass');
            expect(result.success).toBe(false);
            expect(result.message).toContain('Error al registrarse');
        });
    });

    // ============================================================
    // logout
    // ============================================================
    describe('logout', () => {
        test('removes session and redirects to login', () => {
            AUTH.logout();
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('currentUser');
            expect(mockLocation.href).toBe('login.html');
        });
    });

    // ============================================================
    // checkAuth
    // ============================================================
    describe('checkAuth', () => {
        test('redirects to login when no user session', () => {
            mockSessionStorage.getItem.mockReturnValue(null);
            const result = AUTH.checkAuth();
            expect(result).toBeNull();
            expect(mockLocation.href).toBe('login.html');
        });

        test('redirects to login with pending param for non-validated user', () => {
            const user = { id: 1, username: 'pending_user', is_staff: false, is_validated: false };
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(user));
            const result = AUTH.checkAuth();
            expect(result).toBeNull();
            expect(mockLocation.href).toContain('login.html?pending=pending_user');
            expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('currentUser');
        });

        test('redirects to dashboard when non-admin tries admin page', () => {
            const user = { id: 2, username: 'student', is_staff: false, is_validated: true };
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(user));
            const result = AUTH.checkAuth('admin');
            expect(result).toBeNull();
            expect(mockLocation.href).toBe('dashboard.html');
        });

        test('returns user for valid admin accessing admin page', () => {
            const user = { id: 1, username: 'admin', is_staff: true, is_validated: true };
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(user));
            const result = AUTH.checkAuth('admin');
            expect(result).toEqual(user);
        });

        test('returns user for valid non-admin without role requirement', () => {
            const user = { id: 2, username: 'student', is_staff: false, is_validated: true };
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(user));
            const result = AUTH.checkAuth();
            expect(result).toEqual(user);
        });
    });

    // ============================================================
    // redirectIfLoggedIn
    // ============================================================
    describe('redirectIfLoggedIn', () => {
        test('does nothing when no user logged in', () => {
            mockSessionStorage.getItem.mockReturnValue(null);
            AUTH.redirectIfLoggedIn();
            expect(mockLocation.href).toBe('');
        });

        test('redirects to dashboard for validated user', () => {
            const user = { id: 2, username: 'student', is_staff: false, is_validated: true };
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(user));
            AUTH.redirectIfLoggedIn();
            expect(mockLocation.href).toBe('dashboard.html');
        });

        test('redirects to dashboard for staff user', () => {
            const user = { id: 1, username: 'admin', is_staff: true, is_validated: true };
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(user));
            AUTH.redirectIfLoggedIn();
            expect(mockLocation.href).toBe('dashboard.html');
        });

        test('does not redirect for non-validated non-staff user', () => {
            const user = { id: 3, username: 'pending', is_staff: false, is_validated: false };
            mockSessionStorage.getItem.mockReturnValue(JSON.stringify(user));
            AUTH.redirectIfLoggedIn();
            expect(mockLocation.href).toBe('');
        });
    });
});
