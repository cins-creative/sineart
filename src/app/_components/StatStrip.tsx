type Props = {
  students: string;
  years: string;
  groups: string;
};

/**
 * Hàng stat card nổi bên dưới hero — 3 cell dashed divider.
 * CSS `.stat-strip` override trong `sineart-home-v2.css` để nổi bật theo design MHTML.
 */
export default function StatStrip({ students, years, groups }: Props) {
  return (
    <div className="stat-strip" role="list">
      <div className="stat-card" role="listitem">
        <div className="stat-n">{students}</div>
        <div className="stat-l">Học viên đã theo học</div>
        <div className="stat-s">Từ 2015 đến nay</div>
      </div>
      <div className="stat-card" role="listitem">
        <div className="stat-n">{years}</div>
        <div className="stat-l">Năm kinh nghiệm giảng dạy</div>
        <div className="stat-s">Đội ngũ giáo viên chuyên sâu</div>
      </div>
      <div className="stat-card" role="listitem">
        <div className="stat-n">{groups}</div>
        <div className="stat-l">Nhóm khoá học chuyên sâu</div>
        <div className="stat-s">Hình họa · Bố cục · Digital</div>
      </div>
    </div>
  );
}
