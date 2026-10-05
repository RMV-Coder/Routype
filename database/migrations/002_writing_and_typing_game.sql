-- 002: writing pieces, privacy, typing game (scores, matches, achievements) and messaging.
-- Run after 001_initial_schema.sql (MySQL 8.0+).
USE `routype_db`;

-- ---------------------------------------------------------------------------
-- Profiles: privacy, bio and gamification progress
-- ---------------------------------------------------------------------------
ALTER TABLE `user`
    ADD COLUMN bio VARCHAR(500) NULL AFTER image,
    ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 0 AFTER bio,
    ADD COLUMN xp INT NOT NULL DEFAULT 0 AFTER is_private;

-- ---------------------------------------------------------------------------
-- Entries become "pieces": typed (story, poem, ...), with their own visibility
-- and an opt-in flag that lets other people type them in TypeArena.
-- ---------------------------------------------------------------------------
ALTER TABLE entry
    ADD COLUMN kind ENUM('story', 'poetry', 'riddle', 'novel', 'phrase', 'thought', 'article', 'blog', 'diary')
        NOT NULL DEFAULT 'thought' AFTER title,
    ADD COLUMN visibility ENUM('public', 'friends', 'private') NOT NULL DEFAULT 'public' AFTER content,
    ADD COLUMN allow_typing TINYINT(1) NOT NULL DEFAULT 0 AFTER visibility;

CREATE INDEX idx_entry_typing ON entry(allow_typing, visibility, status);
CREATE INDEX idx_entry_kind ON entry(kind, published_at);

-- ---------------------------------------------------------------------------
-- Typing results: richer stats, which piece was typed and multiplayer placement
-- ---------------------------------------------------------------------------
ALTER TABLE typing_score
    ADD COLUMN mode_value INT NULL AFTER mode,               -- e.g. 30 (seconds) or 50 (words)
    ADD COLUMN raw_wpm FLOAT NULL AFTER wpm,
    ADD COLUMN consistency FLOAT NULL AFTER accuracy,
    ADD COLUMN chars_correct INT NULL AFTER consistency,
    ADD COLUMN chars_incorrect INT NULL AFTER chars_correct,
    ADD COLUMN entry_id INT NULL AFTER chars_incorrect,       -- piece that was typed (if any)
    ADD COLUMN match_id VARCHAR(32) NULL AFTER entry_id,      -- multiplayer match (if any)
    ADD COLUMN placement INT NULL AFTER match_id,             -- 1 = winner
    ADD CONSTRAINT fk_typing_score_entry FOREIGN KEY (entry_id) REFERENCES entry(id) ON DELETE SET NULL;

CREATE INDEX idx_typing_score_board ON typing_score(mode, mode_value, wpm);
CREATE INDEX idx_typing_score_entry ON typing_score(entry_id);

-- ---------------------------------------------------------------------------
-- Achievements (definitions live in code: src/lib/game/achievements.ts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_achievement (
    user_id INT NOT NULL,
    achievement_code VARCHAR(64) NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, achievement_code),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Messaging (used by /api/messages*)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS message_room (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_type ENUM('dm', 'group') NOT NULL DEFAULT 'dm',
    title VARCHAR(255) NULL,
    created_by INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_room_member (
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES message_room(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    sender_id INT NOT NULL,
    text_content TEXT NULL,
    e2ee_nonce VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES message_room(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS message_encrypted_payload (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    recipient_id INT NOT NULL,
    cipher MEDIUMTEXT NOT NULL,
    nonce VARCHAR(255) NULL,
    version INT NOT NULL DEFAULT 1,
    FOREIGN KEY (message_id) REFERENCES message(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX idx_message_room_created ON message(room_id, created_at);
CREATE INDEX idx_room_member_user ON message_room_member(user_id);
