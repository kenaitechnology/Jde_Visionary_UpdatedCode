-- Create alert resolutions table in MSSQL
CREATE TABLE [dbo].[alert_resolutions] (
    [id] INT IDENTITY(1,1) PRIMARY KEY,
    [alert_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [action_taken] NVARCHAR(MAX),
    [resolved_at] DATETIME2 DEFAULT GETDATE(),
    [created_at] DATETIME2 DEFAULT GETDATE(),
    [updated_at] DATETIME2 DEFAULT GETDATE()
);

-- Create index for faster lookups
CREATE INDEX IX_alert_resolutions_alert_id ON [dbo].[alert_resolutions] ([alert_id]);
CREATE INDEX IX_alert_resolutions_user_id ON [dbo].[alert_resolutions] ([user_id]);

-- Create unique constraint to prevent duplicate resolutions
ALTER TABLE [dbo].[alert_resolutions]
ADD CONSTRAINT UQ_alert_resolutions_alert_user UNIQUE ([alert_id], [user_id]);