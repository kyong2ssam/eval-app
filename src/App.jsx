import React, { useState } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('form');

  // 👇 Step 1에서 복사한 구글 시트 주소를 아래 따옴표 안에 넣으세요.
  const GOOGLE_SHEET_EDIT_URL = "https://docs.google.com/spreadsheets/d/1Xwjex3Bl6oo96G-tkvHV_gPxZkkA8QTvBQ1dPg4kYWs/edit?usp=sharing";

  // 제출 폼 상태값
  const [formData, setFormData] = useState({
    category: '보통교과',
    department: '',
    subject: '',
    author: '',
    file: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("평가계획 파일 제출이 완료되었습니다.");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 sm:p-8">
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        
        {/* 헤더 */}
        <div className="p-6 sm:p-8 border-b border-slate-100 bg-white">
          <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">2026학년도 2학기</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">평가계획 제출 및 비율 작성</h1>
        </div>

        {/* 탭 버튼 */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 sm:px-8">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`py-4 px-2 mr-6 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'form'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📋 1. 평가계획 파일 제출
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`py-4 px-2 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'sheet'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            ✍️ 2. 평가 비율 작성 (구글 시트)
          </button>
        </div>

        {/* 메인 영역 */}
        <div className="p-6 sm:p-8">
          
          {/* TAB 1: hwp 파일 제출 */}
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">교과 구분</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  >
                    <option value="보통교과">보통교과</option>
                    <option value="전문교과">전문교과</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">학과 선택</label>
                  <input
                    type="text"
                    name="department"
                    placeholder="예: 공통, 정보통신과..."
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">과목명</label>
                  <input
                    type="text"
                    name="subject"
                    placeholder="예: 프로그래밍"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">제출자 성명</label>
                  <input
                    type="text"
                    name="author"
                    placeholder="홍길동"
                    value={formData.author}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

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

          {/* TAB 2: 선생님들이 직접 평가 비율을 입력하는 구글 시트 */}
          {activeTab === 'sheet' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                <p className="text-xs sm:text-sm text-blue-800 font-medium">
                  💡 아래 구글 시트 화면에서 담당 교과목의 <strong>지필/수행 평가 비율</strong>을 직접 입력해 주세요.
                </p>
              </div>

              {/* 입력 가능한 구글 시트 임베드 */}
              <div className="w-full h-[650px] border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-50">
                <iframe
                  src={GOOGLE_SHEET_EDIT_URL}
                  className="w-full h-full border-0"
                  title="평가 비율 작성 시트"
                />
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}