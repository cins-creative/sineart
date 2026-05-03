/** Re-export — logic trong `lib` để API + client dùng chung (fallback FK / cột select). */
export {
  hvChatboxInsert,
  hvChatboxSelectByLop,
  isSelectableColumnMissingError,
  isWrongLopFkColumnError,
  type HvChatLopColumn,
} from "@/lib/phong-hoc/hv-chatbox-db";
