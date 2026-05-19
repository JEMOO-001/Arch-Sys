-- backend/migrations/20260519_notifications_attachments.sql
-- Add notifications table to track unread alerts
CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    map_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'comment', 'status_change'
    message NVARCHAR(MAX) NOT NULL,
    is_read BIT DEFAULT 0,
    created_at DATETIME2 DEFAULT GETDATE(),
    tenant_id INT DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (map_id) REFERENCES Maps(map_id)
);

-- Add support for image attachments in chat
ALTER TABLE Map_Comments ADD attachment_path NVARCHAR(MAX) NULL;
