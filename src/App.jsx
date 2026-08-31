import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { UploadCloud, FileWarning, CheckCircle2, Archive, Loader2 } from 'lucide-react';
import { checkHwpxMemo } from './utils/hwpxUtils';

// === 환경변수에 GAS_URL을 설정하세요 ===
// .env 파일에 VITE_GAS_URL=당신의_가스_URL 추가
const GAS_URL = import.meta.env.https://script.google.com/macros/s/AKfycbwJ7VMwNeK2LaZc2c5VSiWoO1bHZoUS0FO5br-5xRL0I2XAN27Chaza2m9CrsPNcKH8nw/exec;

// API 호출 헬퍼
const fetchGas = async (action, payload = {}) => {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // GAS CORS 회피 트릭
    body: JSON.stringify({ action, ...payload })
  });
  return await res.json();
};

/* --- 1. 공통 UI 컴포넌트 --- */
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`}>{children}</div>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-brand-100 text-brand-900">
    {children}
  </span>
);

const Modal = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
        {children}
      </div>
    </div>
  );
};

/* --- 2. 메인 사용자 화면 --- */
const Home = () => {
  const [config, setConfig] = useState({ year: '', semester: '' });
  const [statusList, setStatusList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 폼 상태
  const [form, setForm] = useState({ subjectType: '보통교과', department: '', subjectName: '', submitter: '' });
  const [file, setFile] = useState(null);
  
  // UI 상태
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memoError, setMemoError] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    try {
      const configRes = await fetchGas('getConfig');
      if (configRes.success) {
        setConfig(configRes.data);
        const statusRes = await fetchGas('getStatus', configRes.data);
        if (statusRes.success) setStatusList(statusRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.hwpx')) {
      alert("⚠️ HWPX 파일만 업로드 가능합니다.");
      e.target.value = '';
      return;
    }
    setFile(selectedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("파일을 첨부해주세요.");
    
    setIsSubmitting(true);
    
    // 1. 클라이언트단 HWPX 메모 검증
    const hasMemo = await checkHwpxMemo(file);
    if (hasMemo) {
      setMemoError(true);
      setIsSubmitting(false);
      return;
    }

    // 2. Base64 변환 후 업로드
    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileData = event.target.result;
      const payload = {
        ...config, ...form, fileName: file.name, fileData
      };
      
      const res = await fetchGas('upload', payload);
      if (res.success) {
        setSuccess(true);
        setFile(null);
        setForm({ ...form, subjectName: '', submitter: '' });
        loadInitData(); // 현황판 갱신
      } else {
        alert("업로드 중 오류가 발생했습니다.");
      }
      setIsSubmitting(false);
    };
    reader.readAsDataURL(file);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div className="min-h-screen bg-brand-50 p-6 md:p-12 font-sans text-brand-900">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 헤더 */}
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">평가계획 파일 취합</h1>
          {config.year && <Badge>{config.year}학년도 {config.semester}</Badge>}
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* 섹션 1: 폼 영역 */}
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">교과 구분</label>
                  <select 
                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-gray-900 transition-shadow"
                    value={form.subjectType} onChange={e => setForm({...form, subjectType: e.target.value})} required>
                    <option>보통교과</option>
                    <option>전문교과</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">학과 선택</label>
                  <input type="text" placeholder="예: 공통, 정보통신과..." required
                    className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-gray-900"
                    value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">과목명</label>
                    <input type="text" placeholder="프로그래밍" required
                      className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-gray-900"
                      value={form.subjectName} onChange={e => setForm({...form, subjectName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">제출자 성명</label>
                    <input type="text" placeholder="홍길동" required
                      className="w-full border border-gray-200 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-gray-900"
                      value={form.submitter} onChange={e => setForm({...form, submitter: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* 드래그앤드롭 파일 업로드 (디자인만) */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors">
                <UploadCloud className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium">{file ? file.name : "클릭하여 .hwpx 파일 첨부"}</p>
                <p className="text-xs mt-1 text-gray-400">오직 hwpx 파일만 지원합니다.</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".hwpx" className="hidden" />
              </div>

              <button disabled={isSubmitting} type="submit" 
                className="w-full bg-gray-900 text-white rounded-lg py-3 font-medium hover:bg-gray-800 transition-colors disabled:bg-gray-300 flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : "제출하기"}
              </button>
            </form>
          </Card>

          {/* 섹션 2: 현황판 */}
          <Card className="flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-4">현재 학기 제출 현황</h2>
            <div className="flex-1 overflow-auto border rounded-lg border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">학과</th>
                    <th className="px-4 py-3 font-medium">과목명</th>
                    <th className="px-4 py-3 font-medium">제출자</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {statusList.length === 0 ? (
                    <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-400">아직 제출된 내역이 없습니다.</td></tr>
                  ) : (
                    statusList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{item.department}</td>
                        <td className="px-4 py-3">{item.subjectName}</td>
                        <td className="px-4 py-3">{item.submitter}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* 모달: 메모 에러 */}
      <Modal isOpen={memoError} onClose={() => setMemoError(false)}>
        <div className="text-center">
          <div className="mx-auto bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <FileWarning className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold mb-2">메모가 감지되었습니다</h3>
          <p className="text-sm text-gray-600 mb-6">
            HWPX 파일 내부에 삭제되지 않은 메모(주석)가 존재합니다. 메모를 모두 삭제한 후 다시 제출해주세요.
          </p>
          <button onClick={() => setMemoError(false)} className="w-full bg-gray-900 text-white rounded-lg py-2.5 font-medium">
            확인
          </button>
        </div>
      </Modal>

      {/* 모달: 성공 */}
      <Modal isOpen={success} onClose={() => setSuccess(false)}>
         <div className="text-center">
          <div className="mx-auto bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-lg font-bold mb-2">제출 완료</h3>
          <p className="text-sm text-gray-600 mb-6">성공적으로 구글 드라이브에 저장되었습니다.</p>
          <button onClick={() => setSuccess(false)} className="w-full bg-gray-900 text-white rounded-lg py-2.5 font-medium">
            닫기
          </button>
        </div>
      </Modal>
    </div>
  );
};

/* --- 3. 관리자 화면 (/admin) --- */
const Admin = () => {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState("");
  
  const [config, setConfig] = useState({ year: '', semester: '' });
  const [isZipping, setIsZipping] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (pw === import.meta.env.VITE_ADMIN_PASSWORD) {
      setAuth(true);
      fetchGas('getConfig').then(res => setConfig(res.data));
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const handleSaveConfig = async () => {
    const res = await fetchGas('updateConfig', config);
    if(res.success) alert("학기 설정이 변경되었습니다.");
  };

  const handleZipDownload = async () => {
    setIsZipping(true);
    try {
      const res = await fetchGas('downloadZip', config);
      if (res.success && res.data.downloadUrl) {
        window.open(res.data.downloadUrl, "_blank");
      } else {
        alert("압축 실패: " + (res.error || "파일이 없거나 오류 발생"));
      }
    } finally {
      setIsZipping(false);
    }
  };

  if (!auth) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-center mb-6">관리자 로그인</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" placeholder="비밀번호 입력" className="w-full border rounded-lg p-2.5 outline-none" 
              value={pw} onChange={e => setPw(e.target.value)} />
            <button type="submit" className="w-full bg-gray-900 text-white rounded-lg py-2.5">접속</button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50 p-6 md:p-12 text-brand-900">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">관리자 대시보드</h1>
        
        <Card className="space-y-4">
          <h2 className="font-semibold text-lg">학기 강제 제어</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm mb-1">연도</label>
              <input type="number" className="w-full border rounded-lg p-2.5" value={config.year} onChange={e => setConfig({...config, year: e.target.value})} />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1">학기</label>
              <input type="text" className="w-full border rounded-lg p-2.5" value={config.semester} onChange={e => setConfig({...config, semester: e.target.value})} />
            </div>
            <button onClick={handleSaveConfig} className="bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-lg font-medium transition-colors">
              저장
            </button>
          </div>
        </Card>

        <Card className="space-y-4 bg-gray-900 text-white border-transparent">
          <div>
            <h2 className="font-semibold text-lg">일괄 다운로드</h2>
            <p className="text-sm text-gray-400 mt-1">현재 설정된 학기({config.year} {config.semester})의 모든 제출 파일을 압축하여 다운로드합니다.</p>
          </div>
          <button onClick={handleZipDownload} disabled={isZipping}
            className="w-full bg-white text-gray-900 flex items-center justify-center gap-2 py-3 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-75">
            {isZipping ? <Loader2 className="animate-spin" /> : <Archive />}
            ZIP으로 내려받기
          </button>
        </Card>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter basename="/eval-app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}