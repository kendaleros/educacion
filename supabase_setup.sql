-- =============================================
-- EJECUTAR ESTO EN SUPABASE SQL EDITOR
-- =============================================

-- Tabla de usuarios
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_staff BOOLEAN DEFAULT FALSE,
    is_validated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de cursos
CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de módulos
CREATE TABLE modules (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de videos
CREATE TABLE videos (
    id BIGSERIAL PRIMARY KEY,
    module_id BIGINT REFERENCES modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT,
    description TEXT,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Usuario admin por defecto
INSERT INTO users (username, email, password, is_staff, is_validated)
VALUES ('admin', 'admin@curso.com', 'adminpassword', TRUE, TRUE);

-- Cursos de ejemplo
INSERT INTO courses (title, description) VALUES
('Curso de Git & GitHub', 'Aprende el sistema de control de versiones líder en el mundo.'),
('JavaScript Moderno (ES6+)', 'Domina las bases sólidas de JS y las características más recientes.');

-- Módulos de ejemplo
INSERT INTO modules (course_id, title, description, "order") VALUES
(1, 'Fundamentos de Git', 'Configuración inicial y flujo básico de Git.', 1),
(1, 'Trabajando con Ramas', 'Creación, fusión y resolución de conflictos.', 2),
(2, 'Sintaxis Moderna y ES6+', 'Variables let/const, arrow functions.', 1),
(2, 'Programación Asíncrona', 'Callbacks, Promesas y Async/Await.', 2);

-- Videos de ejemplo
INSERT INTO videos (module_id, title, video_url, description, "order") VALUES
(1, 'Instalación y Git Config', 'https://www.youtube.com/watch?v=OSEKO-D3i1E', 'Instalación de Git paso a paso.', 1),
(1, 'Mi primer Commit', 'https://www.youtube.com/watch?v=JelS11sTsmI', 'Cómo inicializar un repositorio.', 2),
(2, 'Creación y Fusión de Ramas', 'https://www.youtube.com/watch?v=O129s5r2h0w', 'Uso básico de git branch y git merge.', 1),
(3, 'Arrow Functions & Templates', 'https://www.youtube.com/watch?v=2nqp870G5bE', 'Sintaxis compacta de funciones.', 1);

-- =============================================
-- PERMISOS (RLS - Row Level Security)
-- =============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Permitir todo al anon key (para tu app HTML estática)
CREATE POLICY "Allow all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON videos FOR ALL USING (true) WITH CHECK (true);
