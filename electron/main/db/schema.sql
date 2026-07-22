-- Agentic Persona local database schema.
-- SQLite, applied idempotently on every app start (see database.ts).

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id                        TEXT PRIMARY KEY,
  name                      TEXT NOT NULL,
  description               TEXT NOT NULL DEFAULT '',
  persona_mode              TEXT NOT NULL CHECK (persona_mode IN ('project', 'trial')) DEFAULT 'project',
  persona_count             INTEGER NOT NULL DEFAULT 5,
  variance                  INTEGER NOT NULL DEFAULT 50,
  generation_instructions   TEXT NOT NULL DEFAULT '',
  default_countries         TEXT NOT NULL DEFAULT '[]', -- JSON string[]
  default_languages         TEXT NOT NULL DEFAULT '[]', -- JSON string[]
  default_audience          TEXT NOT NULL DEFAULT '',
  model                     TEXT NOT NULL,
  budget_tokens             INTEGER NOT NULL DEFAULT 0,
  chat_token_limit          INTEGER NOT NULL DEFAULT 0,
  cooldown_seconds          INTEGER NOT NULL DEFAULT 2,
  default_feedback_schema   TEXT, -- JSON FeedbackSchema, nullable until drafted
  created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status                    TEXT NOT NULL CHECK (status IN ('active', 'archived')) DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS personas (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trial_id         TEXT REFERENCES trials(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  persona_json     TEXT NOT NULL, -- JSON: full structured persona record
  one_line_summary TEXT NOT NULL DEFAULT '',
  order_index      INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS trials (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  explanation     TEXT NOT NULL DEFAULT '',
  feedback_schema TEXT, -- JSON FeedbackSchema, nullable until drafted/confirmed
  summary_json    TEXT, -- JSON aggregate summary, nullable until run completes
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status          TEXT NOT NULL CHECK (status IN ('draft', 'running', 'complete')) DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS trial_documents (
  id          TEXT PRIMARY KEY,
  trial_id    TEXT NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  size        INTEGER NOT NULL,
  tokens_est  INTEGER NOT NULL DEFAULT 0,
  stored_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id            TEXT PRIMARY KEY,
  trial_id      TEXT NOT NULL REFERENCES trials(id) ON DELETE CASCADE,
  persona_id    TEXT NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  structured_json TEXT NOT NULL DEFAULT '{}',
  freeform_text TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tokens_in     INTEGER NOT NULL DEFAULT 0,
  tokens_out    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chats (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trial_id   TEXT REFERENCES trials(id) ON DELETE CASCADE,
  persona_id TEXT REFERENCES personas(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  chat_id    TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'model', 'system')),
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tokens_in  INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  model      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS panel_summaries (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trial_id   TEXT REFERENCES trials(id) ON DELETE CASCADE,
  summary    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS usage_log (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  trial_id       TEXT REFERENCES trials(id) ON DELETE CASCADE,
  operation      TEXT NOT NULL,
  model          TEXT NOT NULL,
  tokens_in      INTEGER NOT NULL DEFAULT 0,
  tokens_out     INTEGER NOT NULL DEFAULT 0,
  cost_estimate  REAL NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_personas_project ON personas(project_id);
CREATE INDEX IF NOT EXISTS idx_personas_trial ON personas(trial_id);
CREATE INDEX IF NOT EXISTS idx_trials_project ON trials(project_id);
CREATE INDEX IF NOT EXISTS idx_trial_documents_trial ON trial_documents(trial_id);
CREATE INDEX IF NOT EXISTS idx_panel_summaries_project ON panel_summaries(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_trial ON feedback(trial_id);
CREATE INDEX IF NOT EXISTS idx_feedback_persona ON feedback(persona_id);
CREATE INDEX IF NOT EXISTS idx_chats_project ON chats(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_usage_log_project ON usage_log(project_id);
