import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Progress,
  Select,
  Tag,
  message,
} from 'antd';
import {
  LayoutDashboard,
  GraduationCap,
  Bus,
  Receipt,
  Settings,
  Plus,
  Search,
  Bell,
  ChevronDown,
  MapPin,
  Phone,
  Upload,
  Download,
  MoreHorizontal,
  CheckCircle2,
  ShieldCheck,
  Menu,
  X,
  Pencil,
  Trash2,
  CircleAlert,
  FileSpreadsheet,
  CloudUpload,
} from 'lucide-react';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { schools, quarters } from './types';
import type { Student, Vehicle } from './types';
import { useEduRideData } from './hooks';
import { addRecord, deleteRecord, updateRecord } from './service';
type Page = 'overview' | 'students' | 'vehicles' | 'payments' | 'settings';
const initials = (name: string) =>
  name
    .split(' ')
    .slice(-2)
    .map((x) => x[0])
    .join('')
    .toUpperCase();
const monthLabel = (m: string) => `T${Number(m.slice(5))}`;
const percentage = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0;
const getGreeting = () => {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 12
    ? 'Chào buổi sáng'
    : hour >= 12 && hour < 18
    ? 'Chào buổi chiều'
    : 'Chào buổi tối';
};
const parseCsvLine = (line: string) => {
  const result: string[] = [];
  let current = '';
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === ',' && !quoted) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
};
function App() {
  const data = useEduRideData();
  const [page, setPage] = useState<Page>('overview');
  const [mobile, setMobile] = useState(false);
  const [search, setSearch] = useState('');
  const [quarter, setQuarter] = useState('q1');
  const [drawer, setDrawer] = useState<Student | null>(null);
  const [modal, setModal] = useState<'student' | 'vehicle' | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [assignVehicle, setAssignVehicle] = useState<Vehicle | null>(null);
  const [editing, setEditing] = useState<Student | Vehicle | null>(null);
  const nav = [
    ['overview', 'Tổng quan', LayoutDashboard],
    ['students', 'Học sinh', GraduationCap],
    ['vehicles', 'Đội xe', Bus],
    ['payments', 'Học phí', Receipt],
    ['settings', 'Cài đặt', Settings],
  ] as const;
  const filtered = useMemo(
    () =>
      data.students.filter((s) =>
        [s.name, s.className, s.school, s.pickup, s.parentPhone]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [data.students, search],
  );
  const saveStudent = async (v: Student) => {
    const next = editing
      ? data.students.map((s) => (s.id === v.id ? v : s))
      : [...data.students, { ...v, id: `s${Date.now()}`, paymentHistory: v.paymentHistory || {} }];
    try {
      await (editing ? updateRecord('students', v.id, v) : addRecord('students', next[next.length - 1]));
      data.setStudents(next);
      setModal(null);
      setEditing(null);
      message.success('Đã lưu thông tin học sinh trên Firebase');
    } catch {
      message.error('Không thể lưu học sinh trên Firebase');
    }
  };
  const saveVehicle = async (v: Vehicle) => {
    const next = editing
      ? data.vehicles.map((x) => (x.id === v.id ? v : x))
      : [...data.vehicles, { ...v, id: `v${Date.now()}` }];
    try {
      await (editing ? updateRecord('vehicles', v.id, v) : addRecord('vehicles', next[next.length - 1]));
      data.setVehicles(next);
      setModal(null);
      setEditing(null);
      message.success('Đã lưu thông tin xe trên Firebase');
    } catch {
      message.error('Không thể lưu xe trên Firebase');
    }
  };
  const assignStudents = (vehicleId: string, studentIds: string[]) => {
    const selected = new Set(studentIds);
    const next = data.students.map((s) =>
      s.vehicleId === vehicleId || selected.has(s.id)
        ? { ...s, vehicleId: selected.has(s.id) ? vehicleId : undefined }
        : s,
    );
    data.setStudents(next);
    void Promise.all(
      next
        .filter((s) => s.vehicleId === vehicleId || selected.has(s.id))
        .map((s) => updateRecord('students', s.id, s)),
    );
    setAssignVehicle(null);
    message.success('Đã cập nhật phân công học sinh');
  };
  const importStudents = async (file: File): Promise<boolean> => {
    try {
      const text = (await file.text()).replace(/^\uFEFF/, '');
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        message.warning('File CSV chưa có dữ liệu');
        return false;
      }
      const imported = lines
        .slice(1)
        .map(parseCsvLine)
        .filter((row) => row[0])
        .map(
          (row, i) =>
            ({
              id: `s${Date.now()}-${i}`,
              name: row[0] || 'Chưa cập nhật',
              className: row[1] || 'Chưa cập nhật',
              school: schools.includes(row[2]) ? row[2] : 'Trường Tam Phước',
              pickup: row[3] || 'Chưa cập nhật',
              parentPhone: row[4] || 'Chưa cập nhật',
              startDate: row[5] || new Date().toISOString().slice(0, 10),
              vehicleId: data.vehicles.some((v) => v.id === row[6]) ? row[6] : undefined,
              status: row[7] === 'paused' ? 'paused' : 'active',
              paymentHistory: {},
            } as Student),
        );
      if (!imported.length) {
        message.warning('Không tìm thấy dòng học sinh hợp lệ trong file');
        return false;
      }
      const next = [...data.students, ...imported];
      data.setStudents(next);
      await Promise.all(imported.map((s) => addRecord('students', s)));
      data.setStudents(next);
      message.success(`Đã import ${imported.length} học sinh`);
      return true;
    } catch {
      message.error('Không thể đọc file CSV');
      return false;
    }
  };
  const remove = (kind: 'students' | 'vehicles', id: string) => {
    Modal.confirm({
      title: 'Xác nhận xóa dữ liệu?',
      content: 'Thao tác này không thể hoàn tác.',
      okText: 'Xóa',
      cancelText: 'Hủy',
      onOk: () => {
        if (kind === 'students') {
          const n = data.students.filter((x) => x.id !== id);
          data.setStudents(n);
        } else {
          const n = data.vehicles.filter((x) => x.id !== id);
          data.setVehicles(n);
        }
        void deleteRecord(kind, id).then(
          () => message.success('Đã xóa dữ liệu trên Firebase'),
          () => message.error('Không thể xóa dữ liệu trên Firebase'),
        );
      },
    });
  };
  return (
    <div className="app-shell">
      {mobile && <div className="mobile-overlay" onClick={() => setMobile(false)} />}
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <Bus size={22} />
          </div>
          <div>
            <b>
              Edu<span>Ride</span>
            </b>
            <small>QUẢN LÝ ĐƯA RƯỚC</small>
          </div>
          <X className="close-nav" onClick={() => setMobile(false)} />
        </div>
        <div className="org">
          <span>TH</span>
          <div>
            <small>Đơn vị quản lý</small>
            <b>EduRide Đồng Nai</b>
          </div>
          <ChevronDown size={16} />
        </div>
        <div className="nav-label">MENU CHÍNH</div>
        {nav.slice(0, 4).map(([key, label, Icon]) => (
          <button
            className={`nav-item ${page === key ? 'active' : ''}`}
            key={key}
            onClick={() => {
              setPage(key);
              setMobile(false);
            }}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
        <div className="nav-label system">HỆ THỐNG</div>
        <button
          className={`nav-item ${page === 'settings' ? 'active' : ''}`}
          onClick={() => setPage('settings')}
        >
          <Settings size={18} />
          Cài đặt
        </button>
        <div className="safe">
          <ShieldCheck size={22} />
          <div>
            <b>Dữ liệu an toàn</b>
            <small>Đã đồng bộ hôm nay</small>
          </div>
          <CheckCircle2 size={16} />
        </div>
        <div className="version">EduRide v1.0.0 · 2026</div>
      </aside>
      <main className="main">
        <header>
          <button className="mobile-menu" onClick={() => setMobile(true)}>
            <Menu />
          </button>
          <div>
            <div className="crumb">
              EDURIDE / {nav.find((x) => x[0] === page)?.[1].toUpperCase()}
            </div>
            <h2>{nav.find((x) => x[0] === page)?.[1]}</h2>
          </div>
          <div className="header-actions">
            <div className="global-search">
              <Search size={17} />
              <input
                placeholder="Tìm học sinh, lớp, điểm đón..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </div>
            <Bell size={19} className="bell" />
            <div className="profile">
              <span>NL</span>
              <div>
                <b>Nguyễn Lập</b>
                <small>Quản trị viên</small>
              </div>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>
        <div className="content">
          {page === 'overview' && (
            <Overview
              students={data.students}
              vehicles={data.vehicles}
              onAdd={() => {
                setEditing(null);
                setModal('student');
              }}
              onNavigate={setPage}
            />
          )}
          {page === 'students' && (
            <Students
              students={filtered}
              vehicles={data.vehicles}
              search={search}
              setSearch={setSearch}
              onAdd={() => {
                setEditing(null);
                setModal('student');
              }}
              onEdit={(s) => {
                setEditing(s);
                setModal('student');
              }}
              onDelete={(id) => remove('students', id)}
              onImport={() => setImportOpen(true)}
              onView={setDrawer}
            />
          )}{' '}
          {page === 'vehicles' && (
            <Vehicles
              students={data.students}
              vehicles={data.vehicles}
              onAdd={() => {
                setEditing(null);
                setModal('vehicle');
              }}
              onEdit={(v) => {
                setEditing(v);
                setModal('vehicle');
              }}
              onDelete={(id) => remove('vehicles', id)}
              onAssign={setAssignVehicle}
            />
          )}{' '}
          {page === 'payments' && (
            <Payments
              students={data.students}
              quarter={quarter}
              setQuarter={setQuarter}
              onUpdate={(s) => {
                const n = data.students.map((x) => (x.id === s.id ? s : x));
                data.setStudents(n);
                void updateRecord('students', s.id, s);
              }}
            />
          )}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
      {drawer && (
        <StudentDrawer
          student={drawer}
          vehicles={data.vehicles}
          onClose={() => setDrawer(null)}
          onSave={(s) => {
            const n = data.students.map((x) => (x.id === s.id ? s : x));
            data.setStudents(n);
            void updateRecord('students', s.id, s);
            setDrawer(null);
            message.success('Đã lưu thông tin học sinh');
          }}
        />
      )}
      {modal === 'student' && (
        <StudentModal
          value={editing as Student | null}
          vehicles={data.vehicles}
          open
          onClose={() => {
            setModal(null);
            setEditing(null);
          }}
          onSave={saveStudent}
        />
      )}{' '}
      {modal === 'vehicle' && (
        <VehicleModal
          value={editing as Vehicle | null}
          open
          onClose={() => {
            setModal(null);
            setEditing(null);
          }}
          onSave={saveVehicle}
        />
      )}{' '}
      {assignVehicle && (
        <AssignModal
          vehicle={assignVehicle}
          students={data.students}
          open
          onClose={() => setAssignVehicle(null)}
          onSave={(ids) => assignStudents(assignVehicle.id, ids)}
        />
      )}{' '}
      {importOpen && (
        <ImportModal open onClose={() => setImportOpen(false)} onImport={importStudents} />
      )}
    </div>
  );
}
function Overview({
  students,
  vehicles,
  onAdd,
  onNavigate,
}: {
  students: Student[];
  vehicles: Vehicle[];
  onAdd: () => void;
  onNavigate: (page: Page) => void;
}) {
  const complete = students.filter((s) =>
    quarters[0].months.every((m) => s.paymentHistory[m] === 'paid'),
  ).length;
  const pending = students.filter(
    (s) => !quarters[0].months.every((m) => s.paymentHistory[m] === 'paid'),
  );
  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow">THEO DÕI NĂM HỌC 2026–2027</div>
          <h1>{getGreeting()}, Nguyễn Lập</h1>
          <p>Đây là tình hình vận hành đưa rước và thu phí Quý 1.</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={onAdd}>
          Thêm học sinh
        </Button>
      </div>
      <div className="stats">
        <Stat
          icon={<GraduationCap />}
          value={students.length}
          label="Tổng học sinh"
          hint="học sinh đang quản lý"
        />
        <Stat
          icon={<Bus />}
          value={vehicles.filter((v) => v.status === 'active').length}
          label="Xe đang hoạt động"
          hint={`trên tổng số ${vehicles.length} xe`}
        />
        <Stat
          icon={<Receipt />}
          value={`${percentage(complete, students.length)}%`}
          label="Hoàn thành Quý 1"
          hint={`${complete}/${students.length} học sinh`}
        />
        <Stat
          icon={<MapPin />}
          value={`${percentage(students.filter((s) => s.vehicleId).length, students.length)}%`}
          label="Tỷ lệ lấp đầy"
          hint={`${students.filter((s) => s.vehicleId).length} học sinh đã xếp xe`}
        />
      </div>
      <div className="grid-2">
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Quý 1 · 2026–2027</h3>
              <p>Tiến độ thanh toán theo học sinh</p>
            </div>
            <button className="link" onClick={() => onNavigate('payments')}>
              Quản lý học phí →
            </button>
          </div>
          {quarters.map((q, i) => {
            const n = students.filter((s) =>
              q.months.every((m) => s.paymentHistory[m] === 'paid'),
            ).length;
            return (
              <div className="quarter-row" key={q.key}>
                <span className={`dot dot-${i}`} />
                <b>{q.label}</b>
                <small>
                  {q.display} · {n} học sinh hoàn thành
                </small>
                <Progress
                  percent={percentage(n, students.length)}
                  showInfo={false}
                  strokeColor={['#15ae82', '#7167e8', '#f0a84d'][i]}
                />
                <strong>{percentage(n, students.length)}%</strong>
              </div>
            );
          })}
          <div className="note">
            <Receipt size={16} /> Mỗi quý gồm <b>3 tháng</b>; học sinh đóng từng tháng sẽ tự hoàn
            thành quý khi đủ 3 tháng.
          </div>
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Tình hình đội xe</h3>
              <p>Phân bổ học sinh trên các tuyến</p>
            </div>
            <MoreHorizontal size={18} />
          </div>
          {vehicles.map((v) => {
            const count = students.filter((s) => s.vehicleId === v.id).length;
            return (
              <div className="vehicle-mini" key={v.id}>
                <span className="bus-icon">
                  <Bus size={17} />
                </span>
                <div>
                  <b>{v.name}</b>
                  <small>
                    {v.plate} · {v.driver}
                  </small>
                </div>
                <div className="mini-count">
                  {count}/{v.capacity}
                  <Progress percent={(count / v.capacity) * 100} showInfo={false} />
                </div>
              </div>
            );
          })}
          <button className="link bottom-link" onClick={() => onNavigate('vehicles')}>
            Quản lý đội xe →
          </button>
        </section>
      </div>
      <div className="grid-2 lower">
        <section className="card empty-card">
          <h3>Cần hoàn thành Quý 1</h3>
          <p>Kiểm tra sau ngày 10 hàng tháng</p>
          <div className="overview-reminders">
            {pending.length ? (
              pending.slice(0, 3).map((student) => (
                <div className="reminder-row" key={student.id}>
                  <span>{initials(student.name)}</span>
                  <div>
                    <b>{student.name}</b>
                    <small>
                      {student.school} · {student.parentPhone}
                    </small>
                  </div>
                  <Tag color="warning">
                    {quarters[0].months.filter((m) => student.paymentHistory[m] === 'paid').length}
                    /3 tháng
                  </Tag>
                </div>
              ))
            ) : (
              <div className="empty">
                <CheckCircle2 size={18} /> Chưa có học sinh cần nhắc phí hôm nay
              </div>
            )}
          </div>
          {pending.length > 3 && (
            <button className="link reminder-link" onClick={() => onNavigate('payments')}>
              Xem {pending.length} học sinh chưa hoàn thành →
            </button>
          )}
        </section>
        <section className="card fee-rules">
          <div className="section-head">
            <div>
              <h3>Quy định thu phí</h3>
              <p>Cấu trúc các quý trong năm học</p>
            </div>
            <Tag color="success">2026–2027</Tag>
          </div>
          <div className="fee-rules-list">
            {quarters.map((q, i) => (
              <div className={`fee-rule fee-rule-${i}`} key={q.key}>
                <span className="rule-number">{i + 1}</span>
                <div>
                  <b>{q.label}</b>
                  <small>{q.display}</small>
                </div>
                <span className="rule-status">
                  <CheckCircle2 size={14} /> Đủ 3 tháng
                </span>
              </div>
            ))}
          </div>
          <div className="fee-rule-note">
            <Receipt size={15} /> Đóng từng tháng, hệ thống tự hoàn thành quý khi đủ 3 tháng.
          </div>
        </section>
      </div>
    </>
  );
}
function Stat({
  icon,
  value,
  label,
  hint,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  hint: string;
}) {
  return (
    <div className="stat card">
      <span className="stat-icon">{icon}</span>
      <strong>{value}</strong>
      <b>{label}</b>
      <small>{hint}</small>
    </div>
  );
}
function Students({
  students,
  vehicles,
  search,
  setSearch,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onImport,
}: {
  students: Student[];
  vehicles: Vehicle[];
  search: string;
  setSearch: (x: string) => void;
  onAdd: () => void;
  onEdit: (s: Student) => void;
  onDelete: (id: string) => void;
  onView: (s: Student) => void;
  onImport: () => void;
}) {
  const [schoolFilter, setSchoolFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [current, setCurrent] = useState(1);
  const pageSize = 10;
  const visible = students.filter(
    (s) =>
      (!schoolFilter || s.school === schoolFilter) &&
      (!vehicleFilter || s.vehicleId === vehicleFilter) &&
      (!paymentFilter ||
        (paymentFilter === 'paid'
          ? quarters[0].months.every((m) => s.paymentHistory[m] === 'paid')
          : !quarters[0].months.every((m) => s.paymentHistory[m] === 'paid'))),
  ).sort((a, b) => a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' }));
  useEffect(() => setCurrent(1), [search, schoolFilter, vehicleFilter, paymentFilter]);
  const paged = visible.slice((current - 1) * pageSize, current * pageSize);
  const exportDocx = async () => {
    const headers = ['STT', 'Họ tên', 'Lớp', 'Điểm đón', 'SĐT phụ huynh'];
    const columnWidths = [700, 2300, 700, 3600, 1500];
    const cell = (text: string, bold = false, centered = false) =>
      new TableCell({
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [
          new Paragraph({
            alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({
                text,
                bold,
                font: 'Times New Roman',
                size: 24,
              }),
            ],
          }),
        ],
      });
    const table = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths,
      layout: TableLayoutType.FIXED,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      },
      rows: [
        new TableRow({
          children: headers.map((header, index) => cell(header, true, index === 0 || index === 2)),
        }),
        ...visible.map(
          (s, index) =>
            new TableRow({
              children: [
                cell(String(index + 1), false, true),
                cell(s.name),
                cell(s.className, false, true),
                cell(s.pickup),
                cell(s.parentPhone),
              ],
            }),
        ),
      ],
    });
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              children: [
                new TextRun({
                  text: `Danh sách ${schoolFilter || 'học sinh EduRide'}`,
                  bold: true,
                  color: '1D6FBF',
                  font: 'Times New Roman',
                  size: 28,
                }),
              ],
            }),
            table,
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const schoolFileName = schoolFilter
      ? schoolFilter.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
      : 'tat-ca-truong';
    a.download = `eduride-hoc-sinh-${schoolFileName}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">DANH SÁCH QUẢN LÝ</div>
          <h1>Danh sách học sinh</h1>
          <p>{visible.length} học sinh · cập nhật theo thời gian thực</p>
        </div>
        <div className="title-actions">
          <Button icon={<Download size={16} />} onClick={() => void exportDocx()}>
            Xuất file
          </Button>
          <Button icon={<Upload size={16} />} onClick={onImport}>
            Import
          </Button>
          <Button type="primary" icon={<Plus size={16} />} onClick={onAdd}>
            Thêm học sinh
          </Button>
        </div>
      </div>
      <div className="summary-strip">
        <b>{visible.filter((s) => s.status === 'active').length}</b> Đang đi xe <i />{' '}
        <b>
          {
            visible.filter((s) => !quarters[0].months.every((m) => s.paymentHistory[m] === 'paid'))
              .length
          }
        </b>{' '}
        Chưa hoàn thành Quý 1 <i /> <b>{visible.filter((s) => !s.vehicleId).length}</b> Chưa xếp xe{' '}
        <span>Quý 1 · 2026–2027</span>
      </div>
      <section className="card table-card">
        <div className="filters">
          <div className="filter-search">
            <Search size={17} />
            <input
              placeholder="Tìm theo tên, lớp, điểm đón..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            className="school-select"
            allowClear
            value={schoolFilter || undefined}
            placeholder="Tất cả trường"
            onChange={setSchoolFilter}
            options={schools.map((x) => ({ label: x, value: x }))}
          />
          <Select
            allowClear
            value={vehicleFilter || undefined}
            placeholder="Tất cả xe"
            onChange={setVehicleFilter}
            options={vehicles.map((x) => ({ label: x.name, value: x.id }))}
          />
          <Select
            allowClear
            value={paymentFilter || undefined}
            placeholder="Trạng thái học phí"
            onChange={setPaymentFilter}
            options={[
              { label: 'Hoàn thành quý', value: 'paid' },
              { label: 'Chưa hoàn thành', value: 'unpaid' },
            ]}
          />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>HỌC SINH</th>
                <th>TRƯỜNG / LỚP</th>
                <th>ĐIỂM ĐÓN</th>
                <th>XE ĐƯA RƯỚC</th>
                <th>PHÍ QUÝ 1</th>
                <th>BẮT ĐẦU</th>
                <th>TRẠNG THÁI</th>
                <th className="action-header">THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => {
                const paid = quarters[0].months.filter(
                  (m) => s.paymentHistory[m] === 'paid',
                ).length;
                return (
                  <tr key={s.id} onClick={() => onView(s)}>
                    <td>
                      <div className="person">
                        <span>{initials(s.name)}</span>
                        <div>
                          <b>{s.name}</b>
                          <small>{s.parentPhone}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <b>{s.school}</b>
                      <small>Lớp {s.className}</small>
                    </td>
                    <td>
                      <span className="cell-inline">
                        <MapPin size={15} />
                        {s.pickup}
                      </span>
                    </td>
                    <td>
                      {s.vehicleId ? (
                        <Tag color="success">
                          <Bus size={13} />{' '}
                          {vehicles.find((v) => v.id === s.vehicleId)?.name || 'Không tìm thấy xe'}
                        </Tag>
                      ) : (
                        <Tag>Chưa xếp xe</Tag>
                      )}
                    </td>
                    <td>
                      <Tag color={paid === 3 ? 'success' : 'warning'}>
                        {paid === 3 ? (
                          <>
                            <CheckCircle2 size={13} /> Hoàn thành quý
                          </>
                        ) : (
                          `${paid}/3 tháng`
                        )}
                      </Tag>
                    </td>
                    <td>{new Date(s.startDate).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <Tag color={s.status === 'active' ? 'success' : 'warning'}>
                        {s.status === 'active' ? 'Đang đi xe' : 'Tạm nghỉ'}
                      </Tag>
                    </td>
                    <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="row-actions">
                        <button
                          className="icon-button action-edit"
                          onClick={() => onEdit(s)}
                          title="Sửa học sinh"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button action-delete danger"
                          onClick={() => onDelete(s.id)}
                          title="Xóa học sinh"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          current={current}
          pageSize={pageSize}
          total={visible.length}
          showSizeChanger={false}
          onChange={(page) => setCurrent(page)}
        />
      </section>
    </>
  );
}
function Vehicles({
  students,
  vehicles,
  onAdd,
  onEdit,
  onDelete,
  onAssign,
}: {
  students: Student[];
  vehicles: Vehicle[];
  onAdd: () => void;
  onEdit: (v: Vehicle) => void;
  onDelete: (id: string) => void;
  onAssign: (v: Vehicle) => void;
}) {
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">VẬN HÀNH</div>
          <h1>Đội xe</h1>
          <p>Quản lý phương tiện, tài xế và phân công tuyến</p>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={onAdd}>
          Thêm xe
        </Button>
      </div>
      <div className="stats compact">
        <Stat
          icon={<Bus />}
          value={vehicles.filter((v) => v.status === 'active').length}
          label="Xe đang hoạt động"
          hint="đang vận hành"
        />
        <Stat
          icon={<GraduationCap />}
          value={students.filter((s) => s.vehicleId).length}
          label="Học sinh đã xếp xe"
          hint="trên các tuyến"
        />
        <Stat
          icon={<CircleAlert />}
          value={vehicles.filter((v) => v.status === 'maintenance').length}
          label="Xe cần bảo trì"
          hint="cần kiểm tra"
        />
      </div>
      <div className="vehicle-grid">
        {vehicles.map((v) => {
          const count = students.filter((s) => s.vehicleId === v.id).length;
          return (
            <section className="card vehicle-card" key={v.id}>
              <div className="vehicle-top">
                <span className="big-bus">
                  <Bus size={30} />
                </span>
                <Tag color={v.status === 'active' ? 'success' : 'warning'}>
                  {v.status === 'active' ? 'Đang chạy' : 'Bảo trì'}
                </Tag>
              </div>
              <div className="vehicle-name">
                <h3>{v.name}</h3>
                <span>{v.plate}</span>
              </div>
              <div className="driver">
                <span>{initials(v.driver)}</span>
                <div>
                  <b>{v.driver}</b>
                  <small>
                    <Phone size={12} /> {v.driverPhone}
                  </small>
                </div>
              </div>
              <div className="route">
                <MapPin size={17} /> {v.route}
              </div>
              <div className="capacity">
                <div>
                  <small>Số học sinh</small>
                  <b>
                    {count} <em>/ {v.capacity} chỗ</em>
                  </b>
                </div>
                <Progress percent={(count / v.capacity) * 100} showInfo={false} />
              </div>
              <div className="vehicle-footer">
                <div className="avatars">
                  {students
                    .filter((s) => s.vehicleId === v.id)
                    .slice(0, 4)
                    .map((s) => (
                      <span key={s.id}>{initials(s.name)}</span>
                    ))}
                </div>
                <div className="vehicle-actions">
                  <button className="link assign-link" onClick={() => onAssign(v)}>
                    Phân công <Plus size={14} />
                  </button>
                  <button
                    className="icon-button action-edit"
                    onClick={() => onEdit(v)}
                    title="Sửa xe"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button action-delete danger"
                    onClick={() => onDelete(v.id)}
                    title="Xóa xe"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
function Payments({
  students,
  quarter,
  setQuarter,
  onUpdate,
}: {
  students: Student[];
  quarter: string;
  setQuarter: (x: string) => void;
  onUpdate: (s: Student) => void;
}) {
  const [schoolFilter, setSchoolFilter] = useState('');
  const [current, setCurrent] = useState(1);
  const pageSize = 10;
  const filtered = students.filter((s) => !schoolFilter || s.school === schoolFilter);
  const q = quarters.find((x) => x.key === quarter) ?? quarters[0];
  const completed = filtered.filter((s) =>
    q.months.every((m) => s.paymentHistory[m] === 'paid'),
  ).length;
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);
  useEffect(() => setCurrent(1), [quarter, schoolFilter]);
  const togglePayment = (student: Student, month: string) => {
    const next = student.paymentHistory[month] !== 'paid';
    const amount = student.paymentAmounts?.[month] || 0;
    if (next && amount <= 0) {
      message.warning('Vui lòng nhập số tiền của tháng trước khi xác nhận đã đóng');
      return;
    }
    Modal.confirm({
      title: next ? 'Xác nhận đã đóng học phí?' : 'Bỏ xác nhận đã đóng?',
      content: next
        ? 'Khoản học phí tháng này sẽ được ghi nhận là đã đóng.'
        : 'Khoản học phí tháng này sẽ chuyển về chưa đóng.',
      okText: next ? 'Xác nhận đã đóng' : 'Bỏ xác nhận',
      cancelText: 'Hủy',
      onOk: () => {
        const paymentAmounts = { ...student.paymentAmounts };
        if (next) {
          paymentAmounts[month] = amount;
        } else {
          delete paymentAmounts[month];
        }
        onUpdate({
          ...student,
          paymentHistory: { ...student.paymentHistory, [month]: next ? 'paid' : 'unpaid' },
          paymentAmounts,
        });
      },
    });
  };
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">THEO DÕI THU PHÍ</div>
          <h1>Học phí {q.label} · 2026–2027</h1>
          <p>{q.display} · cập nhật từng tháng, hoàn thành khi đủ 3 tháng</p>
        </div>
        <div className="payment-actions">
          <Select
            className="school-select"
            allowClear
            value={schoolFilter || undefined}
            onChange={setSchoolFilter}
            placeholder="Tất cả trường"
            options={schools.map((x) => ({ label: x, value: x }))}
          />
          <Button icon={<Download size={16} />}>Xuất báo cáo phí</Button>
        </div>
      </div>
      <div className="quarter-tabs">
        {quarters.map((x) => (
          <button
            className={x.key === quarter ? 'selected' : ''}
            onClick={() => setQuarter(x.key)}
            key={x.key}
          >
            <b>{x.label}</b>
            <small>{x.display}</small>
          </button>
        ))}
      </div>
      <div className="payment-stats">
        <div className="card">
          <small>Hoàn thành {q.label}</small>
          <strong>{percentage(completed, filtered.length)}%</strong>
          <Progress percent={percentage(completed, filtered.length)} showInfo={false} />
          <p>
            {completed}/{filtered.length} học sinh đã đóng đủ 3 tháng
          </p>
        </div>
        <div className="card warning-box">
          <small>Chưa hoàn thành quý</small>
          <strong>{filtered.length - completed}</strong>
          <p>
            <CircleAlert size={15} /> Có thể đóng riêng từng tháng
          </p>
        </div>
        <div className="card">
          <small>Tiến độ theo tháng</small>
          <strong>
            {percentage(
              q.months.reduce(
                (a, m) => a + filtered.filter((s) => s.paymentHistory[m] === 'paid').length,
                0,
              ),
              filtered.length * 3,
            )}
            %
          </strong>
          <p> Tổng các tháng trong {q.label}</p>
        </div>
      </div>
      <section className="card payment-table">
        <h3>Chi tiết thu phí {q.label}</h3>
        <p>Bấm vào từng tháng để cập nhật đã đóng</p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>HỌC SINH</th>
                <th>TRƯỜNG / LỚP</th>
                <th>XE</th>
                <th>CÁC THÁNG TRONG QUÝ</th>
                <th>TRẠNG THÁI QUÝ</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((s) => {
                const paid = q.months.filter((m) => s.paymentHistory[m] === 'paid').length;
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="person">
                        <span>{initials(s.name)}</span>
                        <b>{s.name}</b>
                      </div>
                    </td>
                    <td>
                      <b>{s.school}</b>
                      <small>Lớp {s.className}</small>
                    </td>
                    <td>{s.vehicleId || 'Chưa xếp xe'}</td>
                    <td>
                      <div className="month-buttons">
                        {q.months.map((m) => (
                          <div className="month-payment" key={m}>
                            <button
                              className={s.paymentHistory[m] === 'paid' ? 'paid' : ''}
                              onClick={() => togglePayment(s, m)}
                            >
                              {s.paymentHistory[m] === 'paid' ? '✓ ' : ''}
                              {monthLabel(m)}
                            </button>
                            <InputNumber
                              className="payment-amount"
                              min={0}
                              controls={false}
                              value={s.paymentAmounts?.[m]}
                              placeholder="Số tiền"
                              formatter={(value) =>
                                value === undefined ? '' : Number(value).toLocaleString('vi-VN')
                              }
                              parser={(value) => Number((value || '').replace(/[^\d]/g, '')) || 0}
                              onChange={(amount) =>
                                onUpdate({
                                  ...s,
                                  paymentAmounts: { ...s.paymentAmounts, [m]: amount || 0 },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Tag color={paid === 3 ? 'success' : 'warning'}>
                        {paid === 3 ? '✓ Hoàn thành quý' : `${paid}/3 tháng`}
                      </Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="payment-pagination">
          <Pagination
            current={current}
            pageSize={pageSize}
            total={filtered.length}
            showSizeChanger={false}
            onChange={(page) => setCurrent(page)}
          />
        </div>
      </section>
    </>
  );
}
function ImportModal({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<boolean>;
}) {
  const [loading, setLoading] = useState(false);
  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      message.error('File vượt quá 5MB');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      message.error('Vui lòng chọn file CSV');
      return;
    }
    setLoading(true);
    const success = await onImport(file);
    setLoading(false);
    if (success) onClose();
  };
  return (
    <Modal
      className="form-modal import-modal"
      centered
      width={620}
      destroyOnClose
      title={
        <div className="modal-title">
          <span className="modal-title-icon">
            <FileSpreadsheet size={19} />
          </span>
          <div>
            <b>Import danh sách học sinh</b>
            <small>Thêm nhiều học sinh từ file CSV</small>
          </div>
        </div>
      }
      open={open}
      onCancel={loading ? undefined : onClose}
      closable={!loading}
      maskClosable={!loading}
      footer={null}
    >
      <label
        className={`csv-dropzone ${loading ? 'is-loading' : ''}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void handleFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          className="csv-input"
          type="file"
          accept=".csv,text/csv"
          disabled={loading}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
        <span className="csv-drop-icon">
          <CloudUpload size={34} />
        </span>
        <h3>{loading ? 'Đang xử lý file...' : 'Kéo thả file CSV vào đây'}</h3>
        <p>
          hoặc <b>chọn file từ máy tính</b>
        </p>
        <span className="csv-drop-hint">Định dạng hỗ trợ: .csv · Dung lượng tối đa 5MB</span>
      </label>
      <div className="import-help">
        <div>
          <b>Định dạng cột</b>
          <small>
            Họ tên, Lớp, Trường, Địa điểm đón, SĐT phụ huynh, Ngày bắt đầu, Mã xe, Trạng thái
          </small>
        </div>
        <button
          className="link"
          disabled={loading}
          onClick={() => {
            const blob = new Blob(
              [
                'Họ tên,Lớp,Trường,Địa điểm đón,SĐT phụ huynh,Ngày bắt đầu,Mã xe,Trạng thái\nNguyễn Văn A,1A1,Trường Tam Phước,Cổng trường,0900000000,2026-09-01,v1,active',
              ],
              { type: 'text/csv;charset=utf-8' },
            );
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'mau-import-eduride.csv';
            a.click();
          }}
        >
          Tải file mẫu
        </button>
      </div>
      <div className="modal-footer">
        <Button onClick={onClose} disabled={loading}>
          Đóng
        </Button>
      </div>
    </Modal>
  );
}
function AssignModal({
  vehicle,
  students,
  open,
  onClose,
  onSave,
}: {
  vehicle: Vehicle;
  students: Student[];
  open: boolean;
  onClose: () => void;
  onSave: (ids: string[]) => void;
}) {
  const current = students.filter((s) => s.vehicleId === vehicle.id);
  const [selected, setSelected] = useState<string[]>(current.map((s) => s.id));
  const choices = students.filter((s) => !s.vehicleId || s.vehicleId === vehicle.id);
  return (
    <Modal
      className="form-modal assign-modal"
      centered
      width={650}
      destroyOnClose
      title={
        <div className="modal-title">
          <span className="modal-title-icon">
            <Bus size={19} />
          </span>
          <div>
            <b>Phân công học sinh</b>
            <small>
              {vehicle.name} · {vehicle.route}
            </small>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <div className="assign-summary">
        <div>
          <strong>{selected.length}</strong>
          <span>học sinh đã chọn</span>
        </div>
        <div>
          <strong>{vehicle.capacity}</strong>
          <span>sức chứa xe</span>
        </div>
        <div>
          <strong>{Math.round((selected.length / vehicle.capacity) * 100)}%</strong>
          <span>tỷ lệ lấp đầy</span>
        </div>
      </div>
      <Form layout="vertical">
        <Form.Item label="Danh sách học sinh">
          <Select
            mode="multiple"
            showSearch
            optionFilterProp="label"
            value={selected}
            onChange={setSelected}
            placeholder="Chọn học sinh để phân công"
            maxTagCount="responsive"
            options={choices.map((s) => ({
              value: s.id,
              label: `${s.name} · Lớp ${s.className}`,
              school: s.school,
            }))}
          />
        </Form.Item>
      </Form>
      <div className="assigned-heading">
        <b>Đang phân công trên {vehicle.name}</b>
        <span>
          {selected.length}/{vehicle.capacity} chỗ
        </span>
      </div>
      <div className="assigned-list">
        {selected.length ? (
          selected.map((id) => {
            const student = students.find((s) => s.id === id);
            return student ? (
              <div className="assigned-student" key={id}>
                <span>{initials(student.name)}</span>
                <div>
                  <b>{student.name}</b>
                  <small>
                    {student.school} · Lớp {student.className}
                  </small>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setSelected(selected.filter((x) => x !== id))}
                >
                  <X size={15} />
                </button>
              </div>
            ) : null;
          })
        ) : (
          <div className="assigned-empty">Chưa có học sinh nào được phân công</div>
        )}
      </div>
      <div className="modal-footer">
        <Button onClick={onClose}>Hủy</Button>
        <Button type="primary" onClick={() => onSave(selected)}>
          Lưu phân công
        </Button>
      </div>
    </Modal>
  );
}
function StudentDrawer({
  student,
  vehicles,
  onClose,
  onSave,
}: {
  student: Student;
  vehicles: Vehicle[];
  onClose: () => void;
  onSave: (s: Student) => void;
}) {
  const [v, setV] = useState(student);
  return (
    <Drawer title="Thông tin học sinh" open onClose={onClose} width={420}>
      <div className="drawer-profile">
        <span>{initials(v.name)}</span>
        <h2>{v.name}</h2>
        <p>
          {v.school} · Lớp {v.className}
        </p>
      </div>
      <div className="detail-list">
        <p>
          <MapPin /> {v.pickup}
        </p>
        <p>
          <Phone /> {v.parentName || 'Chưa cập nhật'} · {v.parentPhone}
        </p>
        <p>
          <Bus /> {vehicles.find((x) => x.id === v.vehicleId)?.name || 'Chưa xếp xe'}
        </p>
        <p>Ngày bắt đầu: {new Date(v.startDate).toLocaleDateString('vi-VN')}</p>
      </div>
      <Form layout="vertical">
        <Form.Item label="Xe đưa rước">
          <Select
            value={v.vehicleId}
            allowClear
            onChange={(x) => setV({ ...v, vehicleId: x })}
            options={vehicles.map((x) => ({ label: x.name, value: x.id }))}
          />
        </Form.Item>
        <Form.Item label="Trạng thái">
          <Select
            value={v.status}
            onChange={(x) => setV({ ...v, status: x })}
            options={[
              { label: 'Đang đi xe', value: 'active' },
              { label: 'Tạm nghỉ', value: 'paused' },
            ]}
          />
        </Form.Item>
        <Button type="primary" block onClick={() => onSave(v)}>
          Lưu thay đổi
        </Button>
      </Form>
    </Drawer>
  );
}
function StudentModal({
  value,
  vehicles,
  open,
  onClose,
  onSave,
}: {
  value: Student | null;
  vehicles: Vehicle[];
  open: boolean;
  onClose: () => void;
  onSave: (v: Student) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      className="form-modal"
      centered
      width={650}
      destroyOnClose
      title={
        <div className="modal-title">
          <span className="modal-title-icon">
            <GraduationCap size={19} />
          </span>
          <div>
            <b>{value ? 'Sửa thông tin học sinh' : 'Thêm học sinh'}</b>
            <small>
              {value
                ? 'Cập nhật hồ sơ và phân công xe'
                : 'Nhập thông tin học sinh mới vào hệ thống'}
            </small>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={
          value || { status: 'active', startDate: new Date().toISOString().slice(0, 10) }
        }
        onFinish={(v) =>
          onSave({
            ...value,
            ...v,
            id: value?.id || '',
            status: v.status || value?.status || 'active',
            startDate: v.startDate || value?.startDate || new Date().toISOString().slice(0, 10),
            paymentHistory: value?.paymentHistory || {},
          } as Student)
        }
      >
        <div className="form-grid">
          <Form.Item
            name="name"
            label="Họ tên học sinh"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input placeholder="Ví dụ: Nguyễn Minh Anh" />
          </Form.Item>
          <Form.Item
            name="className"
            label="Lớp"
            rules={[{ required: true, message: 'Vui lòng nhập lớp' }]}
          >
            <Input placeholder="Ví dụ: 1A1" />
          </Form.Item>
          <Form.Item
            name="school"
            label="Trường"
            rules={[{ required: true, message: 'Vui lòng chọn trường' }]}
          >
            <Select
              placeholder="Chọn trường"
              options={schools.map((x) => ({ label: x, value: x }))}
            />
          </Form.Item>
          <Form.Item
            name="pickup"
            label="Địa điểm đón"
            rules={[{ required: true, message: 'Vui lòng nhập địa điểm đón' }]}
          >
            <Input prefix={<MapPin size={15} />} placeholder="Ví dụ: Cổng chợ Tam Phước" />
          </Form.Item>
          <Form.Item
            name="parentPhone"
            label="Số điện thoại phụ huynh"
            rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
          >
            <Input prefix={<Phone size={15} />} placeholder="0901 234 567" />
          </Form.Item>
          <Form.Item name="startDate" label="Ngày bắt đầu">
            <Input type="date" />
          </Form.Item>
          <Form.Item name="vehicleId" label="Xe đưa rước">
            <Select
              allowClear
              placeholder="Chưa xếp xe"
              options={vehicles.map((x) => ({ label: x.name, value: x.id }))}
            />
          </Form.Item>
        </div>
        <div className="modal-footer">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit">
            {value ? 'Lưu thay đổi' : 'Thêm học sinh'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
function VehicleModal({
  value,
  open,
  onClose,
  onSave,
}: {
  value: Vehicle | null;
  open: boolean;
  onClose: () => void;
  onSave: (v: Vehicle) => void;
}) {
  const [form] = Form.useForm();
  return (
    <Modal
      className="form-modal"
      centered
      width={650}
      destroyOnClose
      title={
        <div className="modal-title">
          <span className="modal-title-icon">
            <Bus size={19} />
          </span>
          <div>
            <b>{value ? 'Sửa thông tin xe' : 'Thêm xe'}</b>
            <small>
              {value ? 'Cập nhật thông tin vận hành' : 'Tạo phương tiện mới cho đội xe'}
            </small>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Form
        layout="vertical"
        form={form}
        initialValues={value || { status: 'active', capacity: 29 }}
        onFinish={(v) =>
          onSave({
            ...value,
            ...v,
            id: value?.id || '',
            capacity: Number(v.capacity) || 29,
            status: v.status || value?.status || 'active',
          } as Vehicle)
        }
      >
        <div className="form-grid">
          <Form.Item
            name="name"
            label="Tên xe"
            rules={[{ required: true, message: 'Vui lòng nhập tên xe' }]}
          >
            <Input placeholder="Ví dụ: Xe 26271" />
          </Form.Item>
          <Form.Item
            name="plate"
            label="Biển số / mã xe"
            rules={[{ required: true, message: 'Vui lòng nhập biển số hoặc mã xe' }]}
          >
            <Input placeholder="Ví dụ: 26271" />
          </Form.Item>
          <Form.Item
            name="driver"
            label="Tài xế"
            rules={[{ required: true, message: 'Vui lòng nhập tên tài xế' }]}
          >
            <Input placeholder="Nguyễn Văn Dũng" />
          </Form.Item>
          <Form.Item name="driverPhone" label="Số điện thoại tài xế">
            <Input prefix={<Phone size={15} />} placeholder="0903 452 118" />
          </Form.Item>
          <Form.Item name="route" label="Lộ trình">
            <Input prefix={<MapPin size={15} />} placeholder="Tam Phước → Biên Hòa" />
          </Form.Item>
          <Form.Item name="capacity" label="Sức chứa">
            <Input type="number" min={1} placeholder="29" />
          </Form.Item>
          <Form.Item name="status" label="Trạng thái">
            <Select
              options={[
                { label: 'Hoạt động', value: 'active' },
                { label: 'Bảo trì', value: 'maintenance' },
              ]}
            />
          </Form.Item>
        </div>
        <div className="modal-footer">
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" htmlType="submit">
            {value ? 'Lưu thay đổi' : 'Thêm xe'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
function SettingsPage() {
  return (
    <>
      <div className="page-title">
        <div>
          <div className="eyebrow">HỆ THỐNG</div>
          <h1>Cài đặt</h1>
          <p>Quản lý cấu hình cho EduRide</p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Kết nối dữ liệu</h3>
              <p>Trạng thái lưu trữ thông tin hệ thống</p>
            </div>
            <Tag color="success">● Firebase đã kết nối</Tag>
          </div>
          {[
            ['🛡️', 'Firestore Database', 'Dữ liệu đang đồng bộ theo thời gian thực.'],
            ['📄', 'Import danh sách', 'Hỗ trợ file CSV với 6 cột thông tin học sinh.'],
            [
              '☷',
              'Ngày nhắc phí',
              'Hệ thống tự động highlight học sinh chưa đóng phí từ ngày 10 hàng tháng.',
            ],
          ].map((x) => (
            <div className="setting-row" key={x[1]}>
              <span>{x[0]}</span>
              <div>
                <b>{x[1]}</b>
                <small>{x[2]}</small>
              </div>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="section-head">
            <div>
              <h3>Danh sách trường</h3>
              <p>Các trường đang được quản lý</p>
            </div>
            <Tag color="success">4 trường</Tag>
          </div>
          {schools.map((s, i) => (
            <div className="school-row" key={s}>
              <span>0{i + 1}</span>
              <b>{s}</b>
              <CheckCircle2 size={17} />
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
export default App;
