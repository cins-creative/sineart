type Props = {
  students: string;
  years: string;
  groups: string;
};

export default function StatStrip({ students, years, groups }: Props) {
  return (
    <div className="stat-strip">
      <div className="stat-card" style={{ background: "rgba(248,166,104,.1)" }}>
        <div className="stat-n">{students}</div>
        <div className="stat-l">học viên</div>
      </div>
      <div className="stat-card" style={{ background: "rgba(110,254,192,.15)" }}>
        <div className="stat-n">{years}</div>
        <div className="stat-l">
          năm
          <br />
          kinh nghiệm
        </div>
      </div>
      <div className="stat-card" style={{ background: "rgba(187,137,248,.12)" }}>
        <div className="stat-n">{groups}</div>
        <div className="stat-l">
          nhóm
          <br />
          khoá học
        </div>
      </div>
    </div>
  );
}
