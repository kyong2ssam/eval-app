import React, { useState, useEffect } from 'react';
import JSZip from 'jszip'; 

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
  const [adminSubTab, setAdminSubTab] = useState('status'); 

  // 👇 주소 세팅 
const GOOGLE_SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/1Xwjex3Bl6oo96G-tkvHV_gPxZkkA8QTvBQ1dPg4kYWs/edit?usp=sharing";
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwJ7VMwNeK2LaZc2c5VSiWoO1bHZoUS0FO5br-5xRL0I2XAN27Chaza2m9CrsPNcKH8nw/exec";
  const ADMIN_PASSWORD = "0418";

  const [isAutoTerm, setIsAutoTerm] = useState(true);
  const [termInfo, setTermInfo] = useState(getAutoAcademicTerm());
  const [adminQuery, setAdminQuery] = useState({ year: termInfo.year, semester: termInfo.semester });

  const [inputPassword, setInputPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  const [submittedFiles, setSubmittedFiles] = useState([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]); // 💡 다중 선택 체크박스 상태

  const [isZipping, setIsZipping] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);

  // 내 제출 기록 (로컬 스토리지 연동)
  const [myFiles, setMyFiles] = useState([]);
  const [showMyFiles, setShowMyFiles] = useState(false);

  const [formData, setFormData] = useState({
    category: '보통교과', grade: '1학년', department: '', subject: '', file: null,
  });

  const [popup, setPopup] = useState({ isOpen: false, type: 'info', title: '', message: '', onConfirm: null });
  const showPopup = (type, title, message) => setPopup({ isOpen: true, type, title, message, onConfirm: null });
  
  // 💡 웹앱 전용 삭제 확인 커스텀 팝업
  const showConfirm = (title, message, onConfirm) => {
    setPopup({ isOpen: true, type: 'warning', title, message, onConfirm });
  };

  // F12 방지
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

  // 접속 시 내 제출 기록 불러오기
  useEffect(() => {
    const storedMyFiles = localStorage.getItem('mySubmittedFiles');
    if (storedMyFiles) {
      setMyFiles(JSON.parse(storedMyFiles));
    }
  }, []);

  useEffect(() => {
    if (isAutoTerm) {
      const autoTerm = getAutoAcademicTerm();
      setTermInfo(autoTerm);
      setAdminQuery(autoTerm);
    }
  }, [isAutoTerm]);

  useEffect(() => {
    if (activeTab === 'admin' && isAdminLoggedIn) fetchFiles(adminQuery.year, adminQuery.semester);
  }, [activeTab, isAdminLoggedIn, termInfo, adminQuery]);

  // 💡 서버 파일 목록 가져오기
  const fetchFiles = async (year, semester) => {
    setIsFetchingFiles(true);
    try {
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'list', year, semester })
      });
      const result = await res.json();
      if (result.result === 'success') {
        setSubmittedFiles(result.files);
        setSelectedFileIds([]); // 선택 초기화
        return result.files;
      }
    } catch (err) {
      console.error("목록 갱신 오류");
    } finally {
      setIsFetchingFiles(false);
    }
    return [];
  };

  // 💡 선생님 화면: 내 제출 내역과 서버 실시간 목록 비교하여 동기화
  const handleOpenMyFiles = async () => {
    setShowMyFiles(true);
    const latestServerFiles = await fetchFiles(termInfo.year, termInfo.semester);
    
    // 서버 목록에 여전히 존재하는 파일만 필터링
    const validMyFiles = myFiles.filter(myF => 
      latestServerFiles.some(sF => sF.name === myF.subject)
    );

    if (validMyFiles.length !== myFiles.length) {
      setMyFiles(validMyFiles);
      localStorage.setItem('mySubmittedFiles', JSON.stringify(validMyFiles));
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
// 💡 단일 삭제
  const handleDeleteFile = (fileId, fileName) => {
    showConfirm(
      '파일 삭제 확인',
      `'${fileName}'을(를) 정말로 삭제하시겠습니까?`,
      async () => {
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
      }
    );
  };

  // 💡 다중 선택 삭제
  const handleDeleteSelected = () => {
    if (selectedFileIds.length === 0) return showPopup('info', '선택 필요', '삭제할 파일을 선택해 주세요.');
    
    showConfirm(
      '선택 삭제 확인',
      `선택한 ${selectedFileIds.length}개 파일을 정말로 삭제하시겠습니까?`,
      async () => {
        try {
          const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteBatch', fileIds: selectedFileIds })
          });
          const result = await res.json();
          if (result.result === 'success') {
            showPopup('success', '일괄 삭제 완료', `선택한 ${selectedFileIds.length}개 파일이 삭제되었습니다.`);
            fetchFiles(adminQuery.year, adminQuery.semester);
          }
        } catch (err) {
          showPopup('error', '삭제 실패', '일괄 삭제 중 오류가 발생했습니다.');
        }
      }
    );
  };

  // 💡 모두 삭제
  const handleDeleteAll = () => {
    if (submittedFiles.length === 0) return showPopup('info', '삭제 불가', '삭제할 파일이 없습니다.');

    showConfirm(
      '전체 삭제 확인 ⚠️',
      `정말로 현재 조회된 전체 (${submittedFiles.length}개) 파일을 모두 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.`,
      async () => {
        const allIds = submittedFiles.map(f => f.id);
        try {
          const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'deleteBatch', fileIds: allIds })
          });
          const result = await res.json();
          if (result.result === 'success') {
            showPopup('success', '전체 삭제 완료', '모든 파일이 삭제되었습니다.');
            fetchFiles(adminQuery.year, adminQuery.semester);
          }
        } catch (err) {
          showPopup('error', '삭제 실패', '전체 삭제 중 오류가 발생했습니다.');
        }
      }
    );
  };

  // 체크박스 제어
  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedFileIds(submittedFiles.map(f => f.id));
    else setSelectedFileIds([]);
  };

  const handleSelectOne = (id) => {
    setSelectedFileIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
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

  // 💡 파일 제출 (순수 HWPX 메모 태그만 검출)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.file) return showPopup('error', '파일 누락', '평가계획(.hwpx) 파일을 첨부해 주세요.');

    setIsSubmitting(true);

   // 🚨 1. 파일 속 메모 정밀 검사 (진짜 본문 내용만 콕 집어서 검사)
    let hasMemo = false;
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(formData.file);

      for (const filename of Object.keys(loadedZip.files)) {
        // 💡 핵심: HWPX 파일 내부에서 '본문(section)'이 담긴 XML 파일만 검사합니다!
        // (설정 파일이나 스타일 파일에 영원히 남아있는 메모 껍데기는 완벽히 무시)
        if (filename.toLowerCase().includes('section') && filename.endsWith('.xml')) {
          const content = await loadedZip.files[filename].async('string');
          
          // 본문 안에 '메모 태그(<hp:memo>)' 또는 '메모 필드(type="MEMO")'가 실제로 존재할 때만 걸러냄
          const isMemoField = /type\s*=\s*["']MEMO["']/i.test(content);
          const isMemoTag = /<hp:memo[\s>]/i.test(content);

          if (isMemoField || isMemoTag) {
            hasMemo = true;
            break; // 진짜 메모 발견 시 검사 즉시 중단
          }
        }
      }
    } catch (err) {
      setIsSubmitting(false);
      return showPopup('error', '파일 분석 오류 🚨', '올바른 .hwpx (한글) 파일이 아니거나 파일이 손상되었습니다.\n\n한글 프로그램에서 [다른 이름으로 저장] -> [.hwpx] 형식으로 다시 저장한 파일을 첨부해 주세요.');
    }

    if (hasMemo) {
      setIsSubmitting(false);
      return showPopup('error', '메모 발견 🚨', '파일 내에 [메모]가 남아있습니다.\n\n한글 프로그램 상단의 [검토] 탭에서 "메모 모두 지우기"를 클릭하여 지운 후, 다시 저장해서 제출해 주세요!');
    }

    // 파일명 조합
    let expectedParts = [`${termInfo.year}학년도`, termInfo.semester];
    if (formData.grade) expectedParts.push(formData.grade);
    if (formData.category === '전문교과' && formData.department) expectedParts.push(stripNumber(formData.department));
    let subj = formData.subject;
    if (formData.category === '학점제' || formData.category === '꿈두레') subj += `(${formData.category})`;
    expectedParts.push(subj);
    expectedParts.push("교수학습 및 평가 운영 계획");
    const expectedPrefix = expectedParts.join(" ");

    // 내 제출 내역 중복 검사
    const isDuplicate = myFiles.some(f => f.subject.startsWith(expectedPrefix));
    if (isDuplicate) {
      setIsSubmitting(false);
      return showPopup('info', '제출 완료된 평가계획입니다.', `'${expectedPrefix}' 과목의 평가계획은 이미 제출이 완료되었습니다.\n\n파일을 수정하거나 다시 제출하셔야 한다면 관리자에게 문의해 주세요.`);
    }

    // 업로드
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
          
          const newRecord = {
            id: Date.now(),
            term: `${termInfo.year}학년도 ${termInfo.semester}`,
            subject: expectedPrefix + '.hwpx',
            date: new Date().toLocaleString(),
            fileUrl: result.fileUrl || result.downloadUrl || ''
          };
          const updatedMyFiles = [newRecord, ...myFiles];
          setMyFiles(updatedMyFiles);
          localStorage.setItem('mySubmittedFiles', JSON.stringify(updatedMyFiles));

          showPopup('success', '제출 완료', '평가계획 파일이 성공적으로 제출되었습니다!');
          setFormData({ ...formData, file: null, subject: '' });
          document.getElementById('file-upload').value = '';

        } else showPopup('error', '제출 실패', result.message);
      } catch (err) {
        showPopup('error', '통신 오류', '서버 전송 중 오류가 발생했습니다.');
      }
      setIsSubmitting(false);
    };
  };

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="min-h-screen bg-zinc-100 text-zinc-900 font-sans p-2 sm:p-6 flex flex-col relative">
      
      {/* 팝업(모달) */}
      {popup.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-zinc-200 text-center animate-in fade-in zoom-in duration-200">
            <div className="text-4xl mb-4">
              {popup.type === 'error' ? '🚨' : popup.type === 'warning' ? '⚠️' : popup.type === 'success' ? '✅' : '💡'}
            </div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">{popup.title}</h3>
            <p className="text-sm text-zinc-600 font-bold whitespace-pre-wrap leading-relaxed">{popup.message}</p>
            
            {popup.onConfirm ? (
              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setPopup({ ...popup, isOpen: false })} 
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3.5 rounded-lg transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button 
                  onClick={() => {
                    const action = popup.onConfirm;
                    setPopup({ ...popup, isOpen: false });
                    if (action) action();
                  }} 
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-lg transition-colors cursor-pointer"
                >
                  삭제
                </button>
              </div>
            ) : (
              <button onClick={() => setPopup({ ...popup, isOpen: false })} className="mt-6 w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3.5 rounded-lg transition-colors cursor-pointer">
                확인
              </button>
            )}
          </div>
        </div>
      )}

      {/* 내가 제출한 파일 확인 모달 */}
      {showMyFiles && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl max-w-2xl w-full border border-zinc-200 animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-zinc-900">👀 내가 제출한 파일 확인</h3>
              <button onClick={() => setShowMyFiles(false)} className="text-zinc-400 hover:text-zinc-900 font-bold text-2xl cursor-pointer">&times;</button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-3 pr-2">
              {myFiles.length === 0 ? (
  <p className="text-center text-zinc-500 py-10 text-sm font-bold">제출된 파일이 없습니다.</p>
) : (
                myFiles.map(file => (
                  <div key={file.id} className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl shadow-sm flex items-center justify-between gap-3">
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <span className="text-xs text-zinc-500 font-bold">{file.term} | {file.date}</span>
                      <span className="text-sm font-black text-zinc-900 truncate">{file.subject}</span>
                    </div>
                    {file.fileUrl && (
                      <a 
                        href={file.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs bg-zinc-900 text-white hover:bg-zinc-800 px-3.5 py-2 rounded-lg font-bold shrink-0 cursor-pointer transition-colors"
                      >
                        열기 / 다운로드
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
            
          
          </div>
        </div>
      )}

      <div className="w-full bg-white rounded-2xl shadow-xl border border-zinc-300 overflow-hidden flex-1">
        {/* 헤더 */}
        <div className="p-6 sm:p-8 border-b border-zinc-200 bg-zinc-900 text-white flex justify-between items-center">
          <div>
            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">{termInfo.year}학년도 {termInfo.semester}</span>
            <h1 className="text-2xl sm:text-3xl font-black mt-1 tracking-tight">평가계획 제출 시스템</h1>
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
          
          {/* TAB 1: 폼 */}
          {activeTab === 'form' && (
            <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-end mb-8">
                <h2 className="text-2xl font-black text-zinc-900">평가계획 파일 제출</h2>
                
                <button 
                  type="button" 
                  onClick={handleOpenMyFiles}
                  className="bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 text-zinc-700 font-bold px-4 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                >
                  👀 내가 제출한 파일 확인
                </button>
              </div>

              <form onSubmit={handleSubmit} className="bg-zinc-50 p-8 sm:p-12 rounded-3xl border border-zinc-200 shadow-sm space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">교과 구분</label>
                    <select value={formData.category} onChange={handleCategoryChange} className="w-full bg-white border border-zinc-300 rounded-xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer">
                      <option value="보통교과">보통교과</option>
                      <option value="전문교과">전문교과</option>
                      <option value="학점제">학점제</option>
                      <option value="꿈두레">꿈두레</option>
                    </select>
                  </div>

                  {formData.category !== '꿈두레' && (
                    <div>
                      <label className="block text-sm font-bold text-zinc-700 mb-2">학년</label>
                      <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer">
                        {formData.category !== '학점제' && <option value="1학년">1학년</option>}
                        <option value="2학년">2학년</option>
                        <option value="3학년">3학년</option>
                      </select>
                    </div>
                  )}

                  {formData.category === '전문교과' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-zinc-700 mb-2">학과 선택</label>
                      <select value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-zinc-900 cursor-pointer">
                        {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{stripNumber(dept)}</option>)}
                      </select>
                    </div>
                  )}

                  <div className={formData.category === '꿈두레' ? "md:col-span-1" : "md:col-span-2"}>
                    <label className="block text-sm font-bold text-zinc-700 mb-2">과목명</label>
                    <input type="text" required placeholder="예: 프로그래밍" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-xl px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-zinc-700 mb-2">파일 첨부 (.hwpx)</label>
                  <div 
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${isDragging ? 'border-zinc-900 bg-zinc-200' : 'border-zinc-300 bg-white hover:border-zinc-900'}`}
                  >
                    <input type="file" accept=".hwpx" onChange={handleFileChange} className="hidden" id="file-upload" />
                    
                    {formData.file ? (
                      <div className="flex flex-col items-center w-full animate-in fade-in zoom-in duration-200">
                        {/* 다른 파일로 바꿀 수 있도록 아이콘 부분은 클릭 가능하게 유지 */}
                        <label htmlFor="file-upload" className="cursor-pointer mb-4">
                          <span className="text-4xl hover:scale-110 transition-transform block">📄</span>
                        </label>
                        
                        {/* 첨부된 파일명과 삭제 버튼 */}
                        <div className="flex items-center gap-4 bg-zinc-100 px-5 py-3 rounded-xl border border-zinc-200 shadow-sm">
                          <span className="text-base font-bold text-zinc-900">{formData.file.name}</span>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.preventDefault();
                              setFormData({ ...formData, file: null });
                              document.getElementById('file-upload').value = '';
                            }}
                            className="text-sm hover:scale-125 transition-transform cursor-pointer bg-white rounded-full shadow-sm border border-zinc-200 w-8 h-8 flex items-center justify-center"
                            title="파일 첨부 취소"
                          >
                            ❌
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full">
                        <span className="text-4xl mb-4">{isDragging ? "📥" : "📄"}</span>
                        <span className="text-base font-bold text-zinc-900">이곳을 클릭하거나 파일을 드래그하여 놓아주세요.</span>
                      </label>
                    )}
                  </div>
                </div>
                
                <button type="submit" disabled={isSubmitting} className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-bold text-lg py-5 rounded-2xl shadow-md transition-colors cursor-pointer">
                  {isSubmitting ? '파일 검사 및 제출 중...' : '제출 완료하기'}
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
                  <div className="flex flex-wrap gap-2 border-b border-zinc-300 pb-4 mb-6">
                    <button onClick={() => setAdminSubTab('status')} className={`px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${adminSubTab === 'status' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>📊 실시간 제출 현황</button>
                    <button onClick={() => setAdminSubTab('files')} className={`px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${adminSubTab === 'files' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>📂 파일 리스트 및 관리</button>
                    <button onClick={() => setAdminSubTab('settings')} className={`px-5 py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all ${adminSubTab === 'settings' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>⚙️ 시스템 환경 설정</button>
                  </div>

                  {/* 현황 탭 */}
                  {adminSubTab === 'status' && (
                    <div className="bg-white border border-zinc-300 rounded-xl p-6 sm:p-8">
                      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                        <div className="flex items-center space-x-2">
                          <select value={adminQuery.year} onChange={(e) => setAdminQuery({...adminQuery, year: e.target.value})} className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900">
                            {Array.from({ length: 10 }, (_, i) => 2026 + i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <span className="text-sm font-bold text-zinc-900">학년도</span>
                          <select value={adminQuery.semester} onChange={(e) => setAdminQuery({...adminQuery, semester: e.target.value})} className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-bold cursor-pointer">
                            <option value="1학기">1학기</option><option value="2학기">2학기</option>
                          </select>
                          <button onClick={handleAdminSearch} className="bg-zinc-900 text-white px-4 py-1.5 rounded text-sm font-bold ml-2 cursor-pointer hover:bg-zinc-800">조회</button>
                        </div>
                      </div>

                      <div className="h-[450px] overflow-y-auto pr-2 space-y-8">
                        {isFetchingFiles ? <p className="text-center text-sm text-zinc-500 py-10">데이터를 불러오는 중...</p> : 
                         submittedFiles.length === 0 ? <p className="text-center text-sm text-zinc-500 py-10">조회된 제출 현황이 없습니다.</p> : (
                          ['보통교과', '전문교과', '학점제', '꿈두레'].map(categoryName => {
                            const categoryFiles = submittedFiles.filter(file => file.path.startsWith(categoryName));
                            if (categoryFiles.length === 0) return null; 
                            return (
                              <div key={categoryName}>
                                <h4 className="text-lg font-black text-zinc-900 mb-4 border-b-2 border-zinc-900 inline-block pr-4">
                                  📌 {categoryName} <span className="text-sm font-bold text-zinc-400 ml-1">({categoryFiles.length}건)</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {categoryFiles.map(file => (
                                    <div key={file.id} className="bg-zinc-50 border border-zinc-200 p-5 rounded-xl flex flex-col justify-center gap-2 shadow-sm">
                                      <span className="text-xs text-zinc-500 font-bold">{file.path.split(' > ').map(stripNumber).join(' > ')}</span>
                                      <span className="text-sm font-black text-zinc-900 leading-tight">{file.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* 💡 리스트 탭 (일괄 및 전체 삭제 버튼 추가) */}
                  {adminSubTab === 'files' && (
                    <div className="bg-white border border-zinc-300 rounded-xl overflow-hidden">
                      <div className="bg-zinc-100 p-4 border-b border-zinc-300 flex flex-wrap justify-between items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <select value={adminQuery.year} onChange={(e) => setAdminQuery({...adminQuery, year: e.target.value})} className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900">
                            {Array.from({ length: 10 }, (_, i) => 2026 + i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <span className="text-sm font-bold text-zinc-900">학년도</span>
                          <select value={adminQuery.semester} onChange={(e) => setAdminQuery({...adminQuery, semester: e.target.value})} className="bg-white border border-zinc-300 rounded px-2 py-1 text-sm font-bold cursor-pointer">
                            <option value="1학기">1학기</option><option value="2학기">2학기</option>
                          </select>
                          <button onClick={handleAdminSearch} className="bg-zinc-900 text-white px-4 py-1.5 rounded text-sm font-bold ml-2 cursor-pointer hover:bg-zinc-800">조회</button>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {/* 💡 삭제 관련 일괄 버튼 */}
                          {selectedFileIds.length > 0 && (
                            <button onClick={handleDeleteSelected} className="bg-zinc-900 text-white hover:bg-zinc-800 px-3.5 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors">
                              선택 삭제 ({selectedFileIds.length})
                            </button>
                          )}
                          {submittedFiles.length > 0 && (
                            <button onClick={handleDeleteAll} className="bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-200 px-3.5 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors">
                              전체 삭제
                            </button>
                          )}
                          <button onClick={handleZipDownload} disabled={isZipping} className="bg-white border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white px-4 py-1.5 rounded text-sm font-bold cursor-pointer transition-colors">
                            {isZipping ? "압축 중..." : "전체 압축(ZIP) 다운로드"}
                          </button>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto h-[500px]">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead className="sticky top-0 bg-white border-b-2 border-zinc-900 text-zinc-900 z-10">
                            <tr>
                              <th className="py-3 px-4 w-12 text-center">
                                <input 
                                  type="checkbox" 
                                  onChange={handleSelectAll} 
                                  checked={submittedFiles.length > 0 && selectedFileIds.length === submittedFiles.length} 
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </th>
                              <th className="py-3 px-4 font-black">분류 (폴더)</th>
                              <th className="py-3 px-4 font-black">파일명</th>
                              <th className="py-3 px-4 font-black w-32 text-center">관리</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200">
                            {isFetchingFiles ? <tr><td colSpan="4" className="py-12 text-center text-zinc-500 font-bold">로딩 중...</td></tr> : 
                             submittedFiles.length === 0 ? <tr><td colSpan="4" className="py-12 text-center text-zinc-500 font-bold">조회된 파일이 없습니다.</td></tr> : (
                              submittedFiles.map(file => (
                                <tr key={file.id} className="hover:bg-zinc-50">
                                  <td className="py-3 px-4 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={selectedFileIds.includes(file.id)} 
                                      onChange={() => handleSelectOne(file.id)} 
                                      className="w-4 h-4 cursor-pointer"
                                    />
                                  </td>
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

                  {/* 설정 탭 */}
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
                            <select value={termInfo.year} onChange={(e) => setTermInfo({ ...termInfo, year: e.target.value })} className="bg-white border border-zinc-400 rounded-lg px-4 py-2 text-sm font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-900">
                              {Array.from({ length: 10 }, (_, i) => 2026 + i).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
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