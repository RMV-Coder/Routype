CREATE SCHEMA IF NOT EXISTS `routype_db`;

USE `routype_db`;

CREATE TABLE IF NOT EXISTS `user` (
	id INT PRIMARY KEY AUTO_INCREMENT UNIQUE,
    name VARCHAR(255),
    age INT,
    email VARCHAR(255) UNIQUE,
    email_verified DATETIME,
    password VARCHAR(255),
    image LONGTEXT DEFAULT NULL,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active TINYINT,
    last_login DATETIME,
    type ENUM('business', 'page', 'admin', 'default') DEFAULT 'default', -- Add 'admin'
    fcm_token VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS `account`(
	provider_account_id VARCHAR(255) UNIQUE,
    user_id INT,
    account_type VARCHAR(255),
    provider VARCHAR(255),
    provider_type VARCHAR(255),
    refresh_token VARCHAR(255),
    access_token VARCHAR(255),
    expires_at INT,
    token_type VARCHAR(255),
    scope VARCHAR(255),
    id_token VARCHAR(255),
    session_state VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `session`(
	session_id VARCHAR(255),
    expires DATETIME,
    session_token VARCHAR(255) UNIQUE,
    user_id INT UNIQUE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS `verification_token`(
	identifier VARCHAR(255) UNIQUE,
    token VARCHAR(255) UNIQUE,
    expires DATETIME
);

-- CREATE TABLE IF NOT EXISTS `post` (
--     id INT PRIMARY KEY AUTO_INCREMENT,
--     user_id INT NOT NULL,
--     title VARCHAR(255),
--     content LONGTEXT,  -- Markdown supported
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--     is_private TINYINT DEFAULT 0,
--     FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
-- );

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

CREATE TABLE `streak` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    streak_count INT DEFAULT 0,
    last_post_date DATE,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

CREATE TABLE `typing_score` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    mode VARCHAR(255), -- e.g. "philosophy", "programming", etc.
    wpm FLOAT,
    accuracy FLOAT,
    duration_seconds INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id)
);



