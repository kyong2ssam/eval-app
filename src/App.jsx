import React, { useState, useEffect } from 'react';

const getAutoAcademicTerm = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 7) return { year: `${year}`, semester: '1학기' };
  if (month >= 8 && month <= 12) return { year: `${year}`, semester: '2학기' };
  return { year: `${year - 1}`, semester: '2학기' };
};

// 전문교과 학과 목록
const DEPARTMENTS = [
  "0. 공통교과",
  "1. 건축디자인과",
  "2. 제품디자인과",
  "3. 패션디자인과",
  "4. 시각디자인과",
  "5. 도예디자인과"
];

export default function App() {
  const [activeTab, setActiveTab] = useState('form');

  const GOOGLE_SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/1Xwjex3Bl6oo96G-tkvHV_gPxZkkA8QTvBQ1dPg4kYWs/edit?usp=sharing";
  const GOOGLE_DRIVE_FOLDER_URL = "https://drive.google.com/drive/u/0/folders/1jPgvQ6QmSAHVDk4xcASHX8i8SDsXJM9u";
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwJ7VMwNeK2LaZc2c5VSiWoO1bHZoUS0FO5br-5xRL0I2XAN27Chaza2m9CrsPNcKH8nw/exec";
  const ADMIN_PASSWORD = "0418";

  const [isAutoTerm, setIsAutoTerm] = useState(true);
  const [termInfo, setTermInfo] = useState(getAutoAcademicTerm());

  const [inputPassword, setInputPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // 동적 양식 상태값
  const [formData, setFormData] = useState({
    category: '보통교과',
    grade: '1학년',
    department: '',
    subject: '',
    file: null,
  });

  useEffect(() => {
    if (isAutoTerm) setTermInfo(getAutoAcademicTerm());
  }, [isAutoTerm]);

  // 교과 구분 변경 시 학년 및 학과 상태 자동 동기화
  const handleCategoryChange = (e) => {
    const category = e.target.value;
    let defaultGrade = '';
    let defaultDept = '';

    if (category === '보통교과' || category === '전문교과') {
      defaultGrade = '1학년';
    } else if (category === '학점제') {
      defaultGrade = '2학년';
    }

    if (category === '전문교과') {
      defaultDept = DEPARTMENTS[0];
    }

    setFormData(prev => ({
      ...prev,
      category,
      grade: defaultGrade,
      department: defaultDept
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.file) {
      alert("첨부할 .hwpx 파일을 선택해 주세요.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(formData.file);
    reader.onload = async () => {
      const payload = {
        year: termInfo.year,
        semester: termInfo.semester,
        category: formData.category,
        grade: formData.grade,
        department: formData.department,
        subject: formData.subject,
        fileName: formData.file.name,
        fileData: reader.result
      };

      try {
        const response = await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (result.result === 'success') {
          alert(`${termInfo.year}학년도 ${termInfo.semester} [${formData.category}] 폴더로 파일이 제출되었습니다!`);
        } else {
          alert("제출 실패: " + result.message);
        }
      } catch (err) {
        alert("전송 중 오류가 발생했습니다.");
      }
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-2 sm:p-6">
      <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        
        {/* 헤더 */}
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-white flex justify-between items-center">
          <div>
            <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
              {termInfo.year}학년도 {termInfo.semester} {isAutoTerm && "(자동인식)"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">평가계획 제출 시스템</h1>
          </div>
          {isAdminLoggedIn && activeTab === 'admin' && (
            <button
              onClick={() => setIsAdminLoggedIn(false)}
              className="text-xs font-bold text-slate-500 hover:text-red-600 bg-slate-100 px-3 py-2 rounded-xl transition-all"
            >
              🔒 관리자 잠금
            </button>
          )}
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 sm:px-8">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`py-4 px-2 mr-6 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'form' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📋 1. 평가계획 파일 제출
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`py-4 px-2 mr-6 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'sheet' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            ✍️ 2. 평가 비율 작성 (구글 시트)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`py-4 px-2 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'admin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            🔒 3. 관리자 전용
          </button>
        </div>

        {/* 메인 영역 */}
        <div className="p-6 sm:p-8">
          
          {/* TAB 1: 조건별 동적 제출 폼 */}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* 1. 교과 구분 */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">교과 구분</label>
                  <select
                    value={formData.category}
                    onChange={handleCategoryChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    <option value="보통교과">보통교과</option>
                    <option value="전문교과">전문교과</option>
                    <option value="학점제">학점제</option>
                    <option value="꿈두레">꿈두레</option>
                  </select>
                </div>

                {/* 2. 학년 선택 (꿈두레 제외) */}
                {formData.category !== '꿈두레' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">학년</label>
                    <select
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      {formData.category !== '학점제' && <option value="1학년">1학년</option>}
                      <option value="2학년">2학년</option>
                      <option value="3학년">3학년</option>
                    </select>
                  </div>
                )}

                {/* 3. 학과 선택 (전문교과 전용) */}
                {formData.category === '전문교과' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">학과 선택</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. 과목명 */}
                <div className={formData.category === '꿈두레' ? "sm:col-span-1" : "sm:col-span-2"}>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">과목명</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 프로그래밍"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* 5. 파일 업로드 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">파일 첨부 (.hwpx)</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 text-center transition-all bg-slate-50/50">
                  <input
                    type="file"
                    accept=".hwpx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center space-y-2">
                    <span className="text-2xl">☁️</span>
                    <span className="text-sm font-semibold text-slate-700">
                      {formData.file ? formData.file.name : "클릭하여 .hwpx 파일 첨부"}
                    </span>
                    <span className="text-xs text-slate-400">오직 .hwpx 파일만 지원합니다.</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
              >
                제출하기
              </button>
            </form>
          )}

          {/* TAB 2: 구글 시트 작성 */}
          {activeTab === 'sheet' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                <p className="text-xs sm:text-sm text-blue-800 font-medium">
                  💡 아래 구글 시트 화면에서 담당 교과목의 <strong>지필/수행 평가 비율</strong>을 직접 입력해 주세요.
                </p>
              </div>

              <div className="w-full h-[75vh] min-h-[650px] border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50">
                <iframe
                  src={GOOGLE_SHEET_EDIT_URL}
                  className="w-full h-full border-0"
                  title="평가 비율 작성 시트"
                />
              </div>
            </div>
          )}

          {/* TAB 3: 관리자 전용 */}
          {activeTab === 'admin' && (
            <div>
              {!isAdminLoggedIn ? (
                <div className="max-w-md mx-auto my-12 bg-slate-50 p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
                  <div className="text-4xl mb-3">🔐</div>
                  <h2 className="text-xl font-bold text-slate-900 mb-2">관리자 인증</h2>
                  <p className="text-xs text-slate-500 mb-6">비밀번호를 입력해 주세요.</p>
                  
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (inputPassword === ADMIN_PASSWORD) {
                      setIsAdminLoggedIn(true);
                      setPasswordError(false);
                      setInputPassword('');
                    } else setPasswordError(true);
                  }} className="space-y-4">
                    <input
                      type="password"
                      placeholder="비밀번호 입력"
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {passwordError && <p className="text-xs text-red-500 font-medium">비밀번호가 올바르지 않습니다.</p>}
                    <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all">
                      확인
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-100 border border-slate-200 rounded-2xl">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">⚙️ 학년도 및 학기 설정</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAutoTerm}
                          onChange={(e) => setIsAutoTerm(e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span>현재 날짜 기준 자동 인식 사용</span>
                      </label>

                      {!isAutoTerm && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={termInfo.year}
                            onChange={(e) => setTermInfo({ ...termInfo, year: e.target.value })}
                            className="w-20 bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium"
                          />
                          <span className="text-sm">학년도</span>
                          <select
                            value={termInfo.semester}
                            onChange={(e) => setTermInfo({ ...termInfo, semester: e.target.value })}
                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium"
                          >
                            <option value="1학기">1학기</option>
                            <option value="2학기">2학기</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold">관리자 컨트롤 센터</h2>
                      <p className="text-xs text-slate-400 mt-1">자동 생성 폴더 및 비율 제출 시트 관리</p>
                    </div>
                    <a
                      href={GOOGLE_DRIVE_FOLDER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-md"
                    >
                      <span>📁 취합 파일 드라이브 바로가기</span>
                      <span>↗</span>
                    </a>
                  </div>

                  <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
                    <h3 className="text-sm font-bold text-slate-800">📊 실시간 비율 작성 취합 현황</h3>
                    <div className="w-full h-[60vh] min-h-[500px] border border-slate-100 rounded-xl overflow-hidden">
                      <iframe
                        src={GOOGLE_SHEET_EDIT_URL}
                        className="w-full h-full border-0"
                        title="관리자 전용 시트"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}