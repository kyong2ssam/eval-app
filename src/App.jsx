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

  const [isAutoTerm, setIsAutoTerm] = useState(true);
  const [termInfo, setTermInfo] = useState(getAutoAcademicTerm());
  const [adminQuery, setAdminQuery] = useState({ year: termInfo.year, semester: termInfo.semester });

  const [inputPassword, setInputPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // 파일 데이터 및 UI 상태
  const [submittedFiles, setSubmittedFiles] = useState([]);
  const [isZipping, setIsZipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    category: '보통교과', grade: '1학년', department: '', subject: '', file: null,
  });

  // 💡 커스텀 팝업(모달) 상태
  const [popup, setPopup] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const showPopup = (type, title, message) => setPopup({ isOpen: true, type, title, message });

  // F12 원천 차단
  useEffect(() => {
    const blockF12 = (e) => {
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('keydown', blockF12);
    return () => window.removeEventListener('keydown', blockF12);
  }, []);

  useEffect(() => {
    if (isAutoTerm) {
      const autoTerm = getAutoAcademicTerm();
      setTermInfo(autoTerm);
      setAdminQuery(autoTerm);
    }
  }, [isAutoTerm]);

  // 화면 전환 시 백그라운드에서 파일 목록 갱신 (중복 체크 및 관리자용)
  useEffect(() => {
    if (activeTab === 'form') fetchFiles(termInfo.year, termInfo.semester);
    if (activeTab === 'admin' && isAdminLoggedIn) fetchFiles(adminQuery.year, adminQuery.semester);
  }, [activeTab, isAdminLoggedIn, termInfo, adminQuery]);

  const fetchFiles = async (year, semester) => {
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'list', year, semester })
      });
      const result = await res.json();
      if (result.result === 'success') setSubmittedFiles(result.files);
    } catch (err) {
      console.error("목록 갱신 오류");
    }
  };

  const handleAdminSearch = () => fetchFiles(adminQuery.year, adminQuery.semester);

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
        showPopup('success', '압축 완료', '압축 파일이 새 창에서 다운로드됩니다.\n다운로드 후 드라이브에 남은 임시 zip 파일은 삭제해 주세요.');
      } else showPopup('error', '압축 실패', result.message);
    } catch (err) {
      showPopup('error', '오류 발생', '서버와 통신 중 오류가 발생했습니다.');
    }
    setIsZipping(false);
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`'${fileName}'을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'delete', fileId })
      });
      const result = await res.json();
      if (result.result === 'success') {
        showPopup('success', '삭제 완료', `'${fileName}' 파일이 삭제되었습니다.`);
        fetchFiles(adminQuery.year, adminQuery.semester);
      }
    } catch (err) {
      showPopup('error', '삭제 실패', '파일 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    let defaultGrade = ''; let defaultDept = '';
    if (category === '보통교과' || category === '전문교과') defaultGrade = '1학년';
    else if (category === '학점제') defaultGrade = '2학년';
    if (category === '전문교과') defaultDept = DEPARTMENTS[0];
    setFormData(prev => ({ ...prev, category, grade: defaultGrade, department: defaultDept }));
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.hwpx')) setFormData(prev => ({ ...prev, file: droppedFile }));
      else showPopup('error', '파일 형식 오류', '오직 .hwpx 확장자 파일만 지원합니다.');
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.file) return showPopup('error', '파일 누락', '평가계획(.hwpx) 파일을 첨부해 주세요.');

    // 💡 중복 제출 방지 로직 (GAS에서 만들어질 파일명 예상하여 비교)
    let expectedParts = [`${termInfo.year}학년도`, termInfo.semester];
    if (formData.grade) expectedParts.push(formData.grade);
    if (formData.category === '전문교과' && formData.department) expectedParts.push(stripNumber(formData.department));
    let subj = formData.subject;
    if (formData.category === '학점제' || formData.category === '꿈두레') subj += `(${formData.category})`;
    expectedParts.push(subj);
    expectedParts.push("교수학습 및 평가 운영 계획");
    const expectedPrefix = expectedParts.join(" ");

    const isDuplicate = submittedFiles.some(f => f.name.startsWith(expectedPrefix));
    if (isDuplicate) {
      return showPopup('info', '제출 차단 (중복)', `이미 '${expectedPrefix}' 파일이 서버에 존재합니다.\n수정이 필요하신 경우 관리자에게 문의하세요.`);
    }

    setIsSubmitting(true);
    const reader = new FileReader();
    reader.readAsDataURL(formData.file);
    reader.onload = async () => {
      const payload = {
        action: 'upload', year: termInfo.year, semester: termInfo.semester,
        category: formData.category, grade: formData.grade, department: formData.department,
        subject: formData.subject, fileName: formData.file.name, fileData: reader.result
      };
      try {
        const response = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.result === 'success') {
          showPopup('success', '제출 완료', '평가계획 파일이 성공적으로 제출되었습니다!');
          setFormData({ ...formData, file: null, subject: '' });
          document.getElementById('file-upload').value = '';
          fetchFiles(termInfo.year, termInfo.semester); // 즉시 갱신
        } else showPopup('error', '제출 실패', result.message);
      } catch (err) {
        showPopup('error', '통신 오류', '서버 전송 중 오류가 발생했습니다.');
      }
      setIsSubmitting(false);
    };
  };

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="min-h-screen bg-zinc-100 text-zinc-900 font-sans p-2 sm:p-6 flex flex-col relative">
      
      {/* 💡 커스텀 모달(팝업) 컴포넌트 */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-zinc-200 text-center animate-in fade-in zoom-in duration-200">
            <div className="text-4xl mb-4">
              {popup.type === 'error' ? '🚨' : popup.type === 'success' ? '✅' : '💡'}
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">{popup.title}</h3>
            <p className="text-sm text-zinc-600 font-bold whitespace-pre-wrap leading-relaxed">{popup.message}</p>
            <button 
              onClick={() => setPopup({ isOpen: false })} 
              className="mt-6 w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-lg transition-colors cursor-pointer"
            >
              확인
            </button>
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-2xl shadow-xl border border-zinc-300 overflow-hidden flex-1">
        {/* 헤더 */}
        <div className="p-6 sm:p-8 border-b border-zinc-200 bg-zinc-900 text-white flex justify-between items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">{termInfo.year}학년도 {termInfo.semester}</span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">평가계획 시스템</h1>
          </div>
          {isAdminLoggedIn && activeTab === 'admin' && (
            <button onClick={() => setIsAdminLoggedIn(false)} className="text-xs font-bold text-zinc-900 bg-white hover:bg-zinc-200 px-4 py-2 rounded-lg cursor-pointer transition-all">
              🔒 잠금
            </button>
          )}
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b border-zinc-300 bg-zinc-50 px-6 sm:px-8">
          <button onClick={() => setActiveTab('form')} className={`py-4 px-2 mr-6 text-sm font-bold cursor-pointer transition-all border-b-2 ${activeTab === 'form' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>01. 파일 제출</button>
          <button onClick={() => setActiveTab('sheet')} className={`py-4 px-2 mr-6 text-sm font-bold cursor-pointer transition-all border-b-2 ${activeTab === 'sheet' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>02. 평가 비율 작성</button>
          <button onClick={() => setActiveTab('admin')} className={`py-4 px-2 text-sm font-bold cursor-pointer transition-all border-b-2 ${activeTab === 'admin' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-800'}`}>03. 관리자 전용</button>
        </div>

        <div className="p-6 sm:p-8 bg-white">
          
          {/* TAB 1: 폼 (실시간 목록 제거 후 단일 폼 중앙 배치) */}
          {activeTab === 'form' && (
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-black text-zinc-900 mb-6 text-center">평가계획 파일 제출</h2>
              <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-50 p-6 sm:p-10 rounded-2xl border border-zinc-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">교과 구분</label>
                    <select value={formData.category} onChange={handleCategoryChange} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer">
                      <option value="보통교과">보통교과</option>
                      <option value="전문교과">전문교과</option>
                      <option value="학점제">학점제</option>
                      <option value="꿈두레">꿈두레</option>
                    </select>
                  </div>

                  {formData.category !== '꿈두레' && (
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 mb-2">학년</label>
                      <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer">
                        {formData.category !== '학점제' && <option value="1학년">1학년</option>}
                        <option value="2학년">2학년</option>
                        <option value="3학년">3학년</option>
                      </select>
                    </div>
                  )}

                  {formData.category === '전문교과' && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-zinc-700 mb-2">학과 선택</label>
                      <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer">
                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{stripNumber(dept)}</option>)}
                      </select>
                    </div>
                  )}

                  <div className={formData.category === '꿈두레' ? "sm:col-span-1" : "sm:col-span-2"}>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">과목명</label>
                    <input type="text" required placeholder="예: 프로그래밍" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-2">파일 첨부 (.hwpx)</label>
                  <div 
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${isDragging ? 'border-zinc-900 bg-zinc-200' : 'border-zinc-300 bg-white hover:border-zinc-900'}`}
                  >
                    <input type="file" accept=".hwpx" onChange={handleFileChange} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full">
                      <span className="text-3xl mb-3">{isDragging ? "📥" : "📄"}</span>
                      <span className="text-sm font-bold text-zinc-900">{formData.file ? formData.file.name : "클릭하거나 파일을 이곳에 드래그하세요"}</span>
                    </label>
                  </div>
                </div>
                
                <button type="submit" disabled={isSubmitting} className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-bold py-4 rounded-xl shadow-md transition-colors cursor-pointer">
                  {isSubmitting ? '제출 중...' : '제출 완료'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: 구글 시트 */}
          {activeTab === 'sheet' && (
            <div className="w-full h-[75vh] min-h-[650px] border border-zinc-300 rounded-xl overflow-hidden">
              <iframe src={GOOGLE_SHEET_EDIT_URL} className="w-full h-full border-0" title="시트" />
            </div>
          )}

          {/* TAB 3: 관리자 */}
          {activeTab === 'admin' && (
            <div>
              {!isAdminLoggedIn ? (
                <div className="max-w-sm mx-auto my-12 bg-white p-8 rounded-2xl border border-zinc-300 text-center shadow-lg">
                  <div className="w-12 h-12 bg-zinc-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl">🔒</div>
                  <h2 className="text-xl font-black text-zinc-900 mb-6">ADMIN</h2>
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    if (inputPassword === ADMIN_PASSWORD) { setIsAdminLoggedIn(true); setInputPassword(''); } 
                    else showPopup('error', '접속 실패', '비밀번호가 일치하지 않습니다.'); 
                  }} className="space-y-4">
                    <input type="password" placeholder="비밀번호" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-4 py-3 text-sm text-center focus:outline-none focus:ring-2 focus:ring-zinc-900 tracking-widest" />
                    <button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-lg text-sm cursor-pointer">접속하기</button>
                  </form>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex space-x-2 border-b border-zinc-300 pb-4 mb-6">
                    <button onClick={() => setAdminSubTab('files')} className={`px-6 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${adminSubTab === 'files' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>📂 현황 확인 및 다운로드</button>
                    <button onClick={() => setAdminSubTab('settings')} className={`px-6 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${adminSubTab === 'settings' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>⚙️ 시스템 환경 설정</button>
                  </div>

                  {/* 관리자 - 현황 및 파일 탭 */}
                  {adminSubTab === 'files' && (
                    <div className="bg-white border border-zinc-300 rounded-xl overflow-hidden">
                      <div className="bg-zinc-100 p-4 border-b border-zinc-300 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <input type="text" value={adminQuery.year} onChange={(e) => setAdminQuery({...adminQuery, year: e.target.value})} className="w-20 bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-bold text-center" />
                          <span className="text-sm font-bold text-zinc-900">학년도</span>
                          <select value={adminQuery.semester} onChange={(e) => setAdminQuery({...adminQuery, semester: e.target.value})} className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-bold cursor-pointer">
                            <option value="1학기">1학기</option><option value="2학기">2학기</option>
                          </select>
                          <button onClick={handleAdminSearch} className="bg-zinc-900 text-white px-4 py-1.5 rounded text-sm font-bold ml-2 cursor-pointer hover:bg-zinc-800">조회</button>
                        </div>
                        <button onClick={handleZipDownload} disabled={isZipping} className="bg-white border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white px-4 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors">
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
                                    <a href={file.downloadUrl} className="text-xs bg-zinc-900 text-white hover:bg-zinc-800 px-3 py-1.5 rounded font-bold cursor-pointer">저장</a>
                                    <button onClick={() => handleDeleteFile(file.id, file.name)} className="text-xs bg-white border border-zinc-900 text-zinc-900 hover:bg-zinc-200 px-3 py-1.5 rounded font-bold cursor-pointer">삭제</button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 관리자 - 설정 탭 */}
                  {adminSubTab === 'settings' && (
                    <div className="bg-white border border-zinc-300 rounded-xl p-8">
                      <h3 className="text-lg font-black text-zinc-900 mb-6">메인 화면 학년도/학기 제어</h3>
                      <div className="space-y-6">
                        <label className="flex items-center space-x-3 text-sm font-bold text-zinc-900 cursor-pointer p-4 bg-zinc-50 border border-zinc-300 rounded-lg">
                          <input type="checkbox" checked={isAutoTerm} onChange={(e) => setIsAutoTerm(e.target.checked)} className="w-5 h-5 text-zinc-900 rounded focus:ring-zinc-900 cursor-pointer" />
                          <span>날짜 기반 자동 학기 설정 사용</span>
                        </label>
                        {!isAutoTerm && (
                          <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-zinc-900">
                            <span className="text-sm font-bold text-zinc-900">강제 지정:</span>
                            <input type="text" value={termInfo.year} onChange={(e) => setTermInfo({ ...termInfo, year: e.target.value })} className="w-24 bg-white border border-zinc-400 rounded-lg px-3 py-2 text-sm font-bold text-center focus:ring-zinc-900" />
                            <span className="text-sm font-bold text-zinc-900">학년도</span>
                            <select value={termInfo.semester} onChange={(e) => setTermInfo({ ...termInfo, semester: e.target.value })} className="bg-white border border-zinc-400 rounded-lg px-4 py-2 text-sm font-bold focus:ring-zinc-900 cursor-pointer">
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