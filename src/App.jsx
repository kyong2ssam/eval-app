import React, { useState, useEffect } from 'react';

// 학기 계산
const getAutoAcademicTerm = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 3 && month <= 7) return { year: `${year}`, semester: '1학기' };
  if (month >= 8 && month <= 12) return { year: `${year}`, semester: '2학기' };
  return { year: `${year - 1}`, semester: '2학기' };
};

const DEPARTMENTS = [
  "0. 공통교과", "1. 건축디자인과", "2. 제품디자인과", 
  "3. 패션디자인과", "4. 시각디자인과", "5. 도예디자인과"
];

// 화면 표기 시 숫자 및 기호 제거
const stripNumber = (str) => {
  if (!str) return '';
  return str.replace(/^[0-9]+\.\s*/, ''); 
};

export default function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [adminSubTab, setAdminSubTab] = useState('files'); 

  // 👇 주소 세팅 (새로 배포한 GAS 주소 필수!)
  const GOOGLE_SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/1Xwjex3Bl6oo96G-tkvHV_gPxZkkA8QTvBQ1dPg4kYWs/edit?usp=sharing";
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwJ7VMwNeK2LaZc2c5VSiWoO1bHZoUS0FO5br-5xRL0I2XAN27Chaza2m9CrsPNcKH8nw/exec";
  const ADMIN_PASSWORD = "0418";

  // 현재 시스템이 바라보는 학기 정보 (탭 1 사용)
  const [isAutoTerm, setIsAutoTerm] = useState(true);
  const [termInfo, setTermInfo] = useState(getAutoAcademicTerm());

  // 💡 관리자 화면 전용 학기 조회 필터
  const [adminQuery, setAdminQuery] = useState({ year: termInfo.year, semester: termInfo.semester });

  const [inputPassword, setInputPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // 제출된 파일 목록
  const [submittedFiles, setSubmittedFiles] = useState([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const [formData, setFormData] = useState({
    category: '보통교과', grade: '1학년', department: '', subject: '', file: null,
  });

  useEffect(() => {
    if (isAutoTerm) {
      const autoTerm = getAutoAcademicTerm();
      setTermInfo(autoTerm);
      setAdminQuery(autoTerm);
    }
  }, [isAutoTerm]);

  // 탭 변경 시 목록 로드
  useEffect(() => {
    if (activeTab === 'form') fetchFiles(termInfo.year, termInfo.semester);
    if (activeTab === 'admin' && isAdminLoggedIn) fetchFiles(adminQuery.year, adminQuery.semester);
  }, [activeTab, isAdminLoggedIn]);

  // 지정한 연도/학기의 파일 목록 불러오기
  const fetchFiles = async (year, semester) => {
    setIsFetchingFiles(true);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'list', year, semester })
      });
      const result = await res.json();
      if (result.result === 'success') setSubmittedFiles(result.files);
    } catch (err) {
      console.error("파일 목록 오류:", err);
    }
    setIsFetchingFiles(false);
  };

  // 관리자 파일 조회 버튼
  const handleAdminSearch = () => {
    fetchFiles(adminQuery.year, adminQuery.semester);
  };

  // 전체 압축 다운로드
  const handleZipDownload = async () => {
    setIsZipping(true);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'zip', year: adminQuery.year, semester: adminQuery.semester })
      });
      const result = await res.json();
      if (result.result === 'success') {
        window.open(result.downloadUrl, '_blank');
        alert("압축 파일이 새 창에서 열려 다운로드됩니다.\n(다운로드 후 구글 드라이브 최상단에 남은 임시 zip 파일을 삭제해주세요)");
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("압축 중 오류가 발생했습니다.");
    }
    setIsZipping(false);
  };

  // 파일 삭제
  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`'${fileName}'을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', fileId })
      });
      const result = await res.json();
      if (result.result === 'success') {
        alert("삭제되었습니다.");
        fetchFiles(adminQuery.year, adminQuery.semester);
      }
    } catch (err) {
      alert("삭제 오류 발생");
    }
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    let defaultGrade = '';
    let defaultDept = '';
    if (category === '보통교과' || category === '전문교과') defaultGrade = '1학년';
    else if (category === '학점제') defaultGrade = '2학년';
    if (category === '전문교과') defaultDept = DEPARTMENTS[0];
    setFormData(prev => ({ ...prev, category, grade: defaultGrade, department: defaultDept }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.file) return alert("파일을 선택해 주세요.");

    const reader = new FileReader();
    reader.readAsDataURL(formData.file);
    reader.onload = async () => {
      const payload = {
        action: 'upload',
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
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.result === 'success') {
          alert("성공적으로 제출되었습니다!");
          setFormData({ ...formData, file: null, subject: '' });
          document.getElementById('file-upload').value = '';
          fetchFiles(termInfo.year, termInfo.semester);
        } else alert("제출 실패: " + result.message);
      } catch (err) {
        alert("오류가 발생했습니다.");
      }
    };
  };

  return (
    
    return (
    <div 
      onContextMenu={(e) => e.preventDefault()} 
      className="min-h-screen bg-zinc-100 text-zinc-900 font-sans p-2 sm:p-6 flex flex-col">
      <div className="w-full bg-white rounded-2xl shadow-xl border border-zinc-300 overflow-hidden flex-1">
        
        {/* 헤더 (완벽한 블랙) */}
        <div className="p-6 sm:p-8 border-b border-zinc-200 bg-zinc-900 text-white flex justify-between items-center">
          <div>
            {/* 💡 요청하신 '(자동인식)' 표기 완벽 삭제 */}
            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
              {termInfo.year}학년도 {termInfo.semester}
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

        {/* 탭 버튼 (그레이 스케일) */}
        <div className="flex border-b border-zinc-300 bg-zinc-50 px-6 sm:px-8">
          <button onClick={() => setActiveTab('form')} className={`py-4 px-2 mr-6 text-sm font-bold transition-all border-b-2 ${activeTab === 'form' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>01. 파일 제출</button>
          <button onClick={() => setActiveTab('sheet')} className={`py-4 px-2 mr-6 text-sm font-bold transition-all border-b-2 ${activeTab === 'sheet' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>02. 평가 비율 작성</button>
          <button onClick={() => setActiveTab('admin')} className={`py-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'admin' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>03. 관리자 전용</button>
        </div>

        {/* 메인 영역 */}
        <div className="p-6 sm:p-8 bg-white">
          
          {/* TAB 1: 폼(좌) + 현황(우) */}
          {activeTab === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* 좌: 제출 폼 */}
              <div>
                <h2 className="text-xl font-black text-zinc-900 mb-6">파일 제출하기</h2>
                <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-50 p-6 rounded-xl border border-zinc-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-2">교과 구분</label>
                      <select value={formData.category} onChange={handleCategoryChange} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
                        <option value="보통교과">보통교과</option>
                        <option value="전문교과">전문교과</option>
                        <option value="학점제">학점제</option>
                        <option value="꿈두레">꿈두레</option>
                      </select>
                    </div>

                    {formData.category !== '꿈두레' && (
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-2">학년</label>
                        <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
                          {formData.category !== '학점제' && <option value="1학년">1학년</option>}
                          <option value="2학년">2학년</option>
                          <option value="3학년">3학년</option>
                        </select>
                      </div>
                    )}

                    {formData.category === '전문교과' && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-zinc-700 mb-2">학과 선택</label>
                        <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{stripNumber(dept)}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={formData.category === '꿈두레' ? "sm:col-span-1" : "sm:col-span-2"}>
                      <label className="block text-xs font-bold text-zinc-700 mb-2">과목명</label>
                      <input type="text" required placeholder="과목명" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">파일 첨부 (.hwpx)</label>
                    <div className="border-2 border-dashed border-zinc-300 hover:border-zinc-900 rounded-lg p-6 text-center bg-white cursor-pointer transition-colors">
                      <input type="file" accept=".hwpx" onChange={handleFileChange} className="hidden" id="file-upload" />
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <span className="text-2xl mb-2">📄</span>
                        <span className="text-sm font-bold text-zinc-900">{formData.file ? formData.file.name : "클릭하여 파일 선택"}</span>
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-4 rounded-lg shadow-md transition-colors">제출 완료</button>
                </form>
              </div>

              {/* 우: 제출 현황 */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-black text-zinc-900">제출 완료 현황</h2>
                  <button onClick={() => fetchFiles(termInfo.year, termInfo.semester)} className="text-xs bg-zinc-200 hover:bg-zinc-300 text-zinc-900 px-3 py-1.5 rounded font-bold transition">새로고침</button>
                </div>
                
                <div className="h-[450px] overflow-y-auto pr-2 space-y-3 bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                  {isFetchingFiles ? <p className="text-center text-sm text-zinc-500 py-10">목록을 불러오는 중...</p> : submittedFiles.length === 0 ? <p className="text-center text-sm text-zinc-500 py-10">제출된 파일이 없습니다.</p> : (
                    submittedFiles.map(file => (
                      <div key={file.id} className="bg-white border border-zinc-300 p-4 rounded-lg flex flex-col gap-1">
                        <span className="text-xs text-zinc-600 font-bold">{file.path.split(' > ').map(stripNumber).join(' > ')}</span>
                        <span className="text-sm font-bold text-zinc-900">{file.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 구글 시트 */}
          {activeTab === 'sheet' && (
            <div className="w-full h-[75vh] min-h-[650px] border border-zinc-300 rounded-xl overflow-hidden">
              <iframe src={GOOGLE_SHEET_EDIT_URL} className="w-full h-full border-0" title="시트" />
            </div>
          )}

          {/* TAB 3: 관리자 (블랙 앤 화이트) */}
          {activeTab === 'admin' && (
            <div>
              {!isAdminLoggedIn ? (
                <div className="max-w-sm mx-auto my-12 bg-white p-8 rounded-2xl border border-zinc-300 text-center shadow-lg">
                  <div className="w-12 h-12 bg-zinc-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl">🔒</div>
                  <h2 className="text-xl font-black text-zinc-900 mb-6">ADMIN</h2>
                  <form onSubmit={(e) => { e.preventDefault(); if (inputPassword === ADMIN_PASSWORD) { setIsAdminLoggedIn(true); setPasswordError(false); setInputPassword(''); } else setPasswordError(true); }} className="space-y-4">
                    <input type="password" placeholder="비밀번호" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-zinc-900 tracking-widest" />
                    {passwordError && <p className="text-xs text-zinc-900 font-bold">비밀번호 오류</p>}
                    <button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-lg text-sm">접속하기</button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* 관리자 2단 탭 */}
                  <div className="flex space-x-2 border-b border-zinc-300 pb-4 mb-6">
                    <button onClick={() => setAdminSubTab('files')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${adminSubTab === 'files' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>📂 파일 관리 및 다운로드</button>
                    <button onClick={() => setAdminSubTab('settings')} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${adminSubTab === 'settings' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>⚙️ 시스템 환경 설정</button>
                  </div>

                  {/* 파일 관리 탭 */}
                  {adminSubTab === 'files' && (
                    <div className="bg-white border border-zinc-300 rounded-xl overflow-hidden">
                      
                      {/* 💡 특정 연도/학기 조회 및 전체 압축 다운로드 영역 */}
                      <div className="bg-zinc-100 p-4 border-b border-zinc-300 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <input type="text" value={adminQuery.year} onChange={(e) => setAdminQuery({...adminQuery, year: e.target.value})} className="w-20 bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-bold text-center" />
                          <span className="text-sm font-bold text-zinc-900">학년도</span>
                          <select value={adminQuery.semester} onChange={(e) => setAdminQuery({...adminQuery, semester: e.target.value})} className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-bold">
                            <option value="1학기">1학기</option><option value="2학기">2학기</option>
                          </select>
                          <button onClick={handleAdminSearch} className="bg-zinc-900 text-white px-4 py-1.5 rounded text-sm font-bold ml-2">조회</button>
                        </div>
                        <button onClick={handleZipDownload} disabled={isZipping} className="bg-white border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white px-4 py-1.5 rounded text-sm font-bold transition-colors">
                          {isZipping ? "압축 중..." : "전체 압축(ZIP) 다운로드"}
                        </button>
                      </div>
                      
                      <div className="overflow-x-auto h-[500px]">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="sticky top-0 bg-white border-b-2 border-zinc-900 text-zinc-900">
                            <tr>
                              <th className="py-3 px-4 font-black">분류 (폴더)</th>
                              <th className="py-3 px-4 font-black">파일명</th>
                              <th className="py-3 px-4 font-black w-40 text-center">관리</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {submittedFiles.length === 0 ? <tr><td colSpan="3" className="py-12 text-center text-zinc-500 font-bold">조회된 파일이 없습니다.</td></tr> : (
                              submittedFiles.map(file => (
                                <tr key={file.id} className="hover:bg-zinc-50">
                                  <td className="py-3 px-4 text-xs text-zinc-600 font-bold">{file.path.split(' > ').map(stripNumber).join(' > ')}</td>
                                  <td className="py-3 px-4 font-bold text-zinc-900">{file.name}</td>
                                  <td className="py-3 px-4 flex justify-center gap-2">
                                    {/* 💡 개별 파일 다운로드 버튼 */}
                                    <a href={file.downloadUrl} className="text-xs bg-zinc-900 text-white hover:bg-zinc-800 px-3 py-1.5 rounded font-bold">저장</a>
                                    <button onClick={() => handleDeleteFile(file.id, file.name)} className="text-xs bg-white border border-zinc-900 text-zinc-900 hover:bg-zinc-200 px-3 py-1.5 rounded font-bold">삭제</button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 시스템 환경 설정 탭 */}
                  {adminSubTab === 'settings' && (
                    <div className="bg-white border border-zinc-300 rounded-xl p-8">
                      <h3 className="text-lg font-black text-zinc-900 mb-6">메인 화면 학년도/학기 제어</h3>
                      <div className="space-y-6">
                        <label className="flex items-center space-x-3 text-sm font-bold text-zinc-900 cursor-pointer p-4 bg-zinc-50 border border-zinc-300 rounded-lg">
                          <input type="checkbox" checked={isAutoTerm} onChange={(e) => setIsAutoTerm(e.target.checked)} className="w-5 h-5 text-zinc-900 rounded focus:ring-zinc-900" />
                          <span>날짜 기반 자동 학기 설정 사용</span>
                        </label>
                        {!isAutoTerm && (
                          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-zinc-900">
                            <span className="text-sm font-bold text-zinc-900">강제 지정:</span>
                            <input type="text" value={termInfo.year} onChange={(e) => setTermInfo({ ...termInfo, year: e.target.value })} className="w-24 bg-white border border-zinc-400 rounded-lg px-3 py-2 text-sm font-bold text-center focus:ring-zinc-900" />
                            <span className="text-sm font-bold text-zinc-900">학년도</span>
                            <select value={termInfo.semester} onChange={(e) => setTermInfo({ ...termInfo, semester: e.target.value })} className="bg-white border border-zinc-400 rounded-lg px-4 py-2 text-sm font-bold focus:ring-zinc-900">
                              <option value="1학기">1학기</option>
                              <option value="2학기">2학기</option>
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

        </div>
      </div>
      <div className="mt-6 mb-2 text-center text-sm font-bold text-zinc-400 tracking-widest select-none">
        created by. 쿙쌤
      </div>
    </div>
  );
}