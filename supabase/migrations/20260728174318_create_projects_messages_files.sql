/*
# Create core tables for AI code generation platform

## Overview
Creates the persistence layer for a Bolt.new-style AI code generation platform.
Users sign in with email/password (Supabase Auth). Each user owns projects,
each project has a chat history (messages) and a virtual file tree (files).

## 1. New Tables

### projects
- `id` (uuid, primary key)
- `user_id` (uuid, not null, defaults to authenticated user, references auth.users, cascading delete)
- `title` (text, not null) — project / workspace name
- `description` (text, nullable) — short description of what the project does
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now) — bumped on project changes

### messages
- `id` (uuid, primary key)
- `project_id` (uuid, not null, references projects, cascading delete)
- `role` (text, not null) — 'user' | 'assistant' | 'system'
- `content` (text, not null) — chat message body (for assistant this is the raw boltArtifact XML)
- `created_at` (timestamptz, default now)

### files
- `id` (uuid, primary key)
- `project_id` (uuid, not null, references projects, cascading delete)
- `path` (text, not null) — virtual file path inside the WebContainer (e.g. "src/App.tsx")
- `content` (text, not null) — full file contents
- `created_at` (timestamptz, default now)
- `updated_at` (timestamptz, default now)
- Unique constraint on (project_id, path) so a path maps to one file per project

## 2. Indexes
- `messages_project_id_idx` on messages(project_id) — chat history lookups
- `files_project_id_idx` on files(project_id) — file tree lookups
- `projects_user_id_idx` on projects(user_id) — sidebar project list

## 3. Security (Row Level Security)
All tables have RLS enabled. Policies are owner-scoped: a user can only
access rows of projects they own. Child tables (messages, files) check
ownership through the parent projects table via an EXISTS subquery.
All policies are scoped TO authenticated (this app requires sign-in).

### projects
- select_own_projects, insert_own_projects, update_own_projects, delete_own_projects

### messages
- select_own_messages, insert_own_messages, update_own_messages, delete_own_messages
  (ownership checked via EXISTS on projects where user_id = auth.uid())

### files
- select_own_files, insert_own_files, update_own_files, delete_own_files
  (ownership checked via EXISTS on projects where user_id = auth.uid())

## 4. Important Notes
1. projects.user_id has DEFAULT auth.uid() so frontend inserts that omit
   user_id still satisfy the INSERT WITH CHECK policy.
2. Child-table INSERT/UPDATE policies verify the parent project is owned by
   the caller via EXISTS — this prevents a user from writing messages/files
   into another user's project even if they know the project id.
3. updated_at is maintained by a trigger on projects so the sidebar can sort
   by recent activity without the frontend having to bump it manually.
*/

-- ===== projects =====
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== messages =====
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS messages_project_id_idx ON messages(project_id);

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = messages.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = messages.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = messages.project_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = messages.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_messages" ON messages;
CREATE POLICY "delete_own_messages" ON messages FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = messages.project_id AND p.user_id = auth.uid())
  );

-- ===== files =====
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS files_project_id_idx ON files(project_id);

DROP POLICY IF EXISTS "select_own_files" ON files;
CREATE POLICY "select_own_files" ON files FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = files.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_files" ON files;
CREATE POLICY "insert_own_files" ON files FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = files.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_files" ON files;
CREATE POLICY "update_own_files" ON files FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = files.project_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = files.project_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_files" ON files;
CREATE POLICY "delete_own_files" ON files FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = files.project_id AND p.user_id = auth.uid())
  );

-- ===== updated_at trigger for projects =====
CREATE OR REPLACE FUNCTION bump_project_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_updated_at_trigger ON projects;
CREATE TRIGGER projects_updated_at_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION bump_project_updated_at();