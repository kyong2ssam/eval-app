import JSZip from 'jszip';

// hwpx 파일 내부 xml을 스캔하여 memo 태그가 있는지 검사합니다.
export const checkHwpxMemo = async (file) => {
  try {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    let hasMemo = false;

    // hwpx는 내부적으로 zip 구조이며 본문은 Contents/sectionN.xml 에 존재
    const fileNames = Object.keys(contents.files);
    for (const filename of fileNames) {
      if (filename.startsWith("Contents/section") && filename.endsWith(".xml")) {
        const xmlContent = await contents.files[filename].async("text");
        // <hp:memo> 또는 <memo> 태그 검색
        if (xmlContent.includes("<hp:memo") || xmlContent.includes("<memo")) {
          hasMemo = true;
          break;
        }
      }
    }
    return hasMemo;
  } catch (error) {
    console.error("HWPX 파싱 에러:", error);
    // 파싱 실패시 보안을 위해 차단할 수도 있으나, 여기서는 통과시킴
    return false; 
  }
};