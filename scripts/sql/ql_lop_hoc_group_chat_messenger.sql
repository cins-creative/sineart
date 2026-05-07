-- Link nhóm Facebook Messenger theo lớp (TV/admin điền URL; học viên thấy trên trang cá nhân).
ALTER TABLE ql_lop_hoc
  ADD COLUMN IF NOT EXISTS group_chat_messenger text;

COMMENT ON COLUMN ql_lop_hoc.group_chat_messenger IS 'URL nhóm chat Messenger của lớp (m.me/join/… hoặc messenger.com).';
