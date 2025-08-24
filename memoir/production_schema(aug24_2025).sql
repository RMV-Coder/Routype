CREATE SCHEMA IF NOT EXISTS `routype_db`;
USE `routype_db`;

CREATE TABLE IF NOT EXISTS `user` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255),
    age INT,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at DATETIME NULL,
    password VARCHAR(255),
    image LONGTEXT DEFAULT NULL,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active TINYINT DEFAULT 1,
    last_login DATETIME,
    type ENUM('business', 'page', 'admin', 'default') DEFAULT 'default',
    fcm_token VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `account`(
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    provider_account_id VARCHAR(255) NOT NULL,
    user_id INT NOT NULL,
    account_type VARCHAR(255) NOT NULL,
    provider VARCHAR(255) NOT NULL,
    provider_type VARCHAR(255),
    refresh_token TEXT,
    access_token TEXT,
    expires_at INT,
    token_type VARCHAR(255),
    scope VARCHAR(255),
    id_token TEXT,
    session_state VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `session`(
    session_id VARCHAR(255) PRIMARY KEY,
    expires DATETIME NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `verification_token`(
    identifier VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires DATETIME NOT NULL
);

-- Journals (Books)
CREATE TABLE IF NOT EXISTS journal (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    visibility ENUM('public', 'private', 'friends') DEFAULT 'public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- Journal Entries (Markdown posts)
CREATE TABLE IF NOT EXISTS entry (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journal_id INT NOT NULL,
    title VARCHAR(255),
    content MEDIUMTEXT NOT NULL,
    status ENUM('draft', 'published', 'scheduled') DEFAULT 'draft',
    scheduled_at DATETIME NULL,
    published_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journal(id) ON DELETE CASCADE
);

-- Track what a user has read in a specific journal
CREATE TABLE IF NOT EXISTS journal_read_state (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    journal_id INT NOT NULL,
    last_seen_entry_id INT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, journal_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (journal_id) REFERENCES journal(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `friendship` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `streak` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    streak_count INT DEFAULT 0,
    last_post_date DATE,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE IF NOT EXISTS `typing_score` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    mode VARCHAR(255), -- e.g. "philosophy", "programming", etc.
    wpm FLOAT,
    accuracy FLOAT,
    duration_seconds INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- CORRECTED INDEXES
CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_account_user_id ON account(user_id);
CREATE UNIQUE INDEX idx_provider_account_unique ON account(provider, provider_account_id);
CREATE INDEX idx_session_token ON session(session_token);
CREATE INDEX idx_session_expires ON session(expires);
CREATE INDEX idx_verification_token ON verification_token(token);

-- App indexes (keep as-is)
CREATE INDEX idx_journal_user_id ON journal(user_id);
CREATE INDEX idx_entry_journal_id ON entry(journal_id);
CREATE INDEX idx_entry_published ON entry(published_at);
CREATE INDEX idx_friendship_users ON friendship(user_id, friend_id);
CREATE INDEX idx_typing_score_user ON typing_score(user_id, created_at);
CREATE INDEX idx_journal_visibility ON journal(visibility, created_at);
CREATE INDEX idx_entry_status ON entry(status, published_at);
CREATE INDEX idx_friendship_status ON friendship(status, user_id, friend_id);

-- Constraints (keep as-is)
ALTER TABLE friendship ADD CONSTRAINT chk_no_self_friend CHECK (user_id != friend_id);
ALTER TABLE streak ADD CONSTRAINT chk_positive_streak CHECK (streak_count >= 0);