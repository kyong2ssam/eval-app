import React, { useState, useEffect } from 'react';

// 자동 학기 인식
const getAutoAcademicTerm = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 7) return { year: `${year}`, semester: '1학기' };
  if (month >= 8 && month <= 12) return { year: `${year}`, semester: '2학기' };
  return { year: `${year - 1}`, semester: '2학기' };
};

// 드라이브 폴더 정렬을 위해 숫자가 포함된 원본 데이터
const DEPARTMENTS = [
  "0. 공통교과",
  "1. 건축디자인과",
  "2. 제품디자인과",
  "3. 패션디자인과",
  "4. 시각디자인과",
  "5. 도예디자인과"
];

// 💡 [핵심] 화면에 보여줄 때만 앞의 숫자와 마침표를 지워주는 마법의 함수
const stripNumber = (str) => {
  if (!str) return '';
  return str.replace(/^[0-9]+\.\s*/, ''); 
};

export default function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [adminSubTab, setAdminSubTab] = useState('files'); // 'files' or 'settings'

  // 👇 백엔드 주소들을 넣어주세요!
  const GOOGLE_SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/1Xwjex3Bl6oo96G-tkvHV_gPxZkkA8QTvBQ1dPg4kYWs/edit?usp=sharing";
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwJ7VMwNeK2LaZc2c5VSiWoO1bHZoUS0FO5br-5xRL0I2XAN27Chaza2m9CrsPNcKH8nw/exec";
  const ADMIN_PASSWORD = "0418";

  const [isAutoTerm, setIsAutoTerm] = useState(true);
  const [termInfo, setTermInfo] = useState(getAutoAcademicTerm());

  const [inputPassword, setInputPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // 제출된 파일 목록
  const [submittedFiles, setSubmittedFiles] = useState([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);

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

  // 제출 폼이나 관리자 탭을 열 때마다 파일 목록 갱신
  useEffect(() => {
    if (activeTab === 'form' || activeTab === 'admin') {
      fetchSubmittedFiles();
    }
  }, [termInfo, activeTab]);

  const fetchSubmittedFiles = async () => {
    setIsFetchingFiles(true);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'list', year: termInfo.year, semester: termInfo.semester })
      });
      const result = await res.json();
      if (result.result === 'success') setSubmittedFiles(result.files);
    } catch (err) {
      console.error("파일 목록 불러오기 실패:", err);
    }
    setIsFetchingFiles(false);
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`정말 '${fileName}' 파일을 삭제하시겠습니까?\n(구글 드라이브 휴지통으로 이동됩니다)`)) return;
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', fileId })
      });
      const result = await res.json();
      if (result.result === 'success') {
        alert("삭제되었습니다.");
        fetchSubmittedFiles();
      }
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    let defaultGrade = '';
    let defaultDept = '';
    if (category === '보통교과' || category === '전문교과') defaultGrade = '1학년';
    else if (category === '학점제') defaultGrade = '2학년';
    if (category === '전문교과') defaultDept = DEPARTMENTS[0]; // 데이터는 "0. 공통교과" 로 저장
    
    setFormData(prev => ({ ...prev, category, grade: defaultGrade, department: defaultDept }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.file) return alert("첨부할 .hwpx 파일을 선택해 주세요.");

    const reader = new FileReader();
    reader.readAsDataURL(formData.file);
    reader.onload = async () => {
      const payload = {
        action: 'upload',
        year: termInfo.year,
        semester: termInfo.semester,
        category: formData.category,
        grade: formData.grade,
        department: formData.department, // 드라이브에는 "0. 공통교과" 로 전송하여 폴더명 유지
        subject: formData.subject,
        fileName: formData.file.name,
        fileData: reader.result
      };

      try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.result === 'success') {
          alert("파일이 성공적으로 제출되었습니다!");
          setFormData({ ...formData, file: null, subject: '' });
          document.getElementById('file-upload').value = '';
          fetchSubmittedFiles();
        } else {
          alert("제출 실패: " + result.message);
        }
      } catch (err) {
        alert("전송 중 오류가 발생했습니다.");
      }
    };
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 font-sans p-2 sm:p-6">
      <div className="w-full bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
        
        {/* 헤더 (모노톤 시크 스타일) */}
        <div className="p-6 sm:p-8 border-b border-zinc-200 bg-zinc-900 text-white flex justify-between items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
              {termInfo.year}학년도 {termInfo.semester} {isAutoTerm && "(자동)"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">평가계획 시스템</h1>
          </div>
          {isAdminLoggedIn && activeTab === 'admin' && (
            <button
              onClick={() => setIsAdminLoggedIn(false)}
              className="text-xs font-bold text-zinc-900 bg-white hover:bg-zinc-200 px-4 py-2 rounded-lg transition-all"
            >
              🔒 잠금
            </button>
          )}
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b border-zinc-200 bg-zinc-50 px-6 sm:px-8">
          <button
            onClick={() => setActiveTab('form')}
            className={`py-4 px-2 mr-6 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'form' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            01. 파일 제출
          </button>
          <button
            onClick={() => setActiveTab('sheet')}
            className={`py-4 px-2 mr-6 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'sheet' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            02. 평가 비율 작성
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-4 px-2 text-sm font-bold transition-all border-b-2 ${
              activeTab === 'admin' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            03. 시스템 관리
          </button>
        </div>

        {/* 메인 영역 */}
        <div className="p-6 sm:p-8 bg-white">
          
          {/* TAB 1: 파일 제출 폼 (좌) + 제출 현황 (우) */}
          {activeTab === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              {/* 좌측: 제출 폼 */}
              <div>
                <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                  <span className="w-2 h-6 bg-zinc-900 inline-block"></span>
                  평가계획 파일 제출
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-50 p-6 rounded-xl border border-zinc-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 mb-2">교과 구분</label>
                      <select value={formData.category} onChange={handleCategoryChange} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
                        <option value="보통교과">보통교과</option>
                        <option value="전문교과">전문교과</option>
                        <option value="학점제">학점제</option>
                        <option value="꿈두레">꿈두레</option>
                      </select>
                    </div>

                    {formData.category !== '꿈두레' && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-600 mb-2">학년</label>
                        <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
                          {formData.category !== '학점제' && <option value="1학년">1학년</option>}
                          <option value="2학년">2학년</option>
                          <option value="3학년">3학년</option>
                        </select>
                      </div>
                    )}

                    {formData.category === '전문교과' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-zinc-600 mb-2">학과 선택</label>
                        <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
                          {DEPARTMENTS.map((dept) => (
                            /* 💡 학과에서 숫자 제거하여 표기 (예: "0. 공통교과" -> "공통교과") */
                            <option key={dept} value={dept}>{stripNumber(dept)}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={formData.category === '꿈두레' ? "sm:col-span-1" : "sm:col-span-2"}>
                      <label className="block text-xs font-bold text-zinc-600 mb-2">과목명</label>
                      <input type="text" required placeholder="예: 프로그래밍" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-2">파일 첨부 (.hwpx)</label>
                    <div className="border-2 border-dashed border-zinc-300 hover:border-zinc-500 rounded-lg p-6 text-center bg-white transition-all cursor-pointer">
                      <input type="file" accept=".hwpx" onChange={handleFileChange} className="hidden" id="file-upload" />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <span className="text-2xl mb-2">📄</span>
                        <span className="text-sm font-bold text-zinc-800">{formData.file ? formData.file.name : "여기를 클릭하여 파일 선택"}</span>
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-4 rounded-lg shadow-md transition-all">
                    제출 완료하기
                  </button>
                </form>
              </div>

              {/* 우측: 현재 제출 현황 (파일 목록) */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                    <span className="w-2 h-6 bg-zinc-400 inline-block"></span>
                    제출 완료 과목 현황
                  </h2>
                  <button onClick={fetchSubmittedFiles} className="text-xs bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded font-bold transition">
                    새로고침
                  </button>
                </div>
                
                <div className="h-[450px] overflow-y-auto pr-2 space-y-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  {isFetchingFiles ? (
                    <p className="text-center text-sm text-zinc-400 py-10">파일 목록을 불러오는 중...</p>
                  ) : submittedFiles.length === 0 ? (
                    <p className="text-center text-sm text-zinc-400 py-10">아직 제출된 과목이 없습니다.</p>
                  ) : (
                    submittedFiles.map(file => (
                      <div key={file.id} className="bg-white border border-zinc-200 p-4 rounded-lg shadow-sm flex flex-col gap-1">
                        <span className="text-xs text-zinc-500 font-medium">
                          {/* 💡 폴더 경로에 섞인 학과 숫자 제거 (예: "전문교과 > 1학년 > 0. 공통교과" -> "전문교과 > 1학년 > 공통교과") */}
                          {file.path.split(' > ').map(stripNumber).join(' > ')}
                        </span>
                        <span className="text-sm font-bold text-zinc-900">
                          {file.name}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: 구글 시트 작성 */}
          {activeTab === 'sheet' && (
            <div className="space-y-4">
              <div className="w-full h-[75vh] min-h-[650px] border border-zinc-300 rounded-xl overflow-hidden bg-zinc-50">
                <iframe src={GOOGLE_SHEET_EDIT_URL} className="w-full h-full border-0" title="평가 비율 작성 시트" />
              </div>
            </div>
          )}

          {/* TAB 3: 관리자 전용 */}
          {activeTab === 'admin' && (
            <div>
              {!isAdminLoggedIn ? (
                /* 관리자 로그인 (블랙 시크 디자인) */
                <div className="max-w-sm mx-auto my-12 bg-white p-8 rounded-2xl border border-zinc-200 text-center shadow-lg">
                  <div className="w-12 h-12 bg-zinc-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl">🔒</div>
                  <h2 className="text-xl font-black text-zinc-900 mb-6">ADMINISTRATOR</h2>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (inputPassword === ADMIN_PASSWORD) { setIsAdminLoggedIn(true); setPasswordError(false); setInputPassword(''); }
                    else setPasswordError(true);
                  }} className="space-y-4">
                    <input type="password" placeholder="비밀번호" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-zinc-900 tracking-widest" />
                    {passwordError && <p className="text-xs text-red-500 font-bold">비밀번호 오류</p>}
                    <button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-lg text-sm transition-all">접속하기</button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* 관리자 내부 2단 탭 메뉴 분리 */}
                  <div className="flex space-x-2 border-b border-zinc-200 pb-4 mb-6">
                    <button onClick={() => setAdminSubTab('files')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${adminSubTab === 'files' ? 'bg-zinc-900 text-white shadow-md' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                      📂 파일 목록 및 관리
                    </button>
                    <button onClick={() => setAdminSubTab('settings')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${adminSubTab === 'settings' ? 'bg-zinc-900 text-white shadow-md' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                      ⚙️ 환경 설정 (학기지정)
                    </button>
                  </div>

                  {/* 3-1. 파일 목록 및 관리 탭 */}
                  {adminSubTab === 'files' && (
                    <div className="bg-white border border-zinc-300 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-zinc-50 p-4 border-b border-zinc-200 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-zinc-900">제출된 평가계획 파일 관리 (삭제 가능)</h3>
                        <button onClick={fetchSubmittedFiles} className="text-xs bg-white border border-zinc-300 hover:bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded font-bold">새로고침</button>
                      </div>
                      
                      <div className="overflow-x-auto h-[500px]">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="sticky top-0 bg-zinc-100 border-b border-zinc-300 text-zinc-600">
                            <tr>
                              <th className="py-3 px-4 font-bold">분류 (폴더 경로)</th>
                              <th className="py-3 px-4 font-bold">파일명</th>
                              <th className="py-3 px-4 font-bold w-24 text-center">관리</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {submittedFiles.length === 0 ? (
                              <tr><td colSpan="3" className="py-12 text-center text-zinc-400">데이터가 없습니다.</td></tr>
                            ) : (
                              submittedFiles.map(file => (
                                <tr key={file.id} className="hover:bg-zinc-50 transition-colors">
                                  <td className="py-3 px-4 text-xs text-zinc-500 font-medium">
                                    {/* 여기도 숫자 떼고 예쁘게 출력 */}
                                    {file.path.split(' > ').map(stripNumber).join(' > ')}
                                  </td>
                                  <td className="py-3 px-4 font-bold text-zinc-800">
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{file.name}</a>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button onClick={() => handleDeleteFile(file.id, file.name)} className="text-xs bg-zinc-900 text-white hover:bg-red-600 px-3 py-1.5 rounded font-bold transition-colors">
                                      삭제
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 3-2. 시스템 환경 설정 탭 */}
                  {adminSubTab === 'settings' && (
                    <div className="bg-white border border-zinc-300 rounded-xl p-8 shadow-sm">
                      <h3 className="text-lg font-bold text-zinc-900 mb-6">학년도 및 학기 수동 제어</h3>
                      <div className="space-y-6">
                        <label className="flex items-center space-x-3 text-sm font-bold text-zinc-700 cursor-pointer p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                          <input type="checkbox" checked={isAutoTerm} onChange={(e) => setIsAutoTerm(e.target.checked)} className="w-5 h-5 text-zinc-900 rounded focus:ring-zinc-900" />
                          <span>현재 날짜 기준 자동 학기 계산 켜기 (권장)</span>
                        </label>
                        
                        {!isAutoTerm && (
                          <div className="flex items-center space-x-3 p-4 bg-zinc-100 rounded-lg border border-zinc-300">
                            <span className="text-sm font-bold text-zinc-700">강제 지정:</span>
                            <input type="text" value={termInfo.year} onChange={(e) => setTermInfo({ ...termInfo, year: e.target.value })} className="w-24 bg-white border border-zinc-300 rounded-lg px-3 py-2 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                            <span className="text-sm font-bold text-zinc-700">학년도</span>
                            <select value={termInfo.semester} onChange={(e) => setTermInfo({ ...termInfo, semester: e.target.value })} className="bg-white border border-zinc-300 rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-zinc-900">
                              <option value="1학기">1학기</option>
                              <option value="2학기">2학기</option>
                            </select>
                          </div>
                        )}
                        <p className="text-xs text-zinc-500 mt-4">
                          * 강제로 지정한 학기는 웹앱 좌측 상단 헤더에 즉시 반영되며, 제출되는 파일도 해당 폴더명으로 생성됩니다.
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}