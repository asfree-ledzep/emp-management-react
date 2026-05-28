/**
 * 한/영 번역 테이블
 * 사용법: const { t } = useLang();  →  t('logout')
 */
const translations = {
  /* ── 공통 ── */
  ko: {
    // 상단바
    admin:        '관리자',
    employee:     '사원',
    logout:       '로그아웃',
    adminSettings:'관리자 설정',
    lightMode:    '라이트 모드로 전환',
    darkMode:     '다크 모드로 전환',
    langToggle:   'English',

    // 사원 사이드바 메뉴
    menu_profile:    '내 프로필',
    menu_attendance: '출근 기록',
    menu_worklog:    '업무일지',
    menu_todo:       '내 할일',
    menu_leave:      '연차',
    menu_board:      '게시판',
    menu_message:    '쪽지함',
    menu_folder:     '공유 폴더',
    menu_notice:     '공지사항',
    menu_survey:     '설문',
    menu_expense:    '지출 신청',

    // 사원 사이드바 카드
    sidebarTitle:    '사원 메뉴',
    remainLeave:     '년 잔여 연차',
    leaveDay:        '일',
    leaveUsed:       '총 {total}일 중 사용 {used}일',
    airQuality:      '실시간 대기질',
    loading:         '조회 중...',
    maskWarn:        '😷 마스크 착용 권장',
    apiKeyNeeded:    '🔑 API 키 등록 필요',

    // 프로필 페이지
    myProfile:       '내 프로필',
    editProfile:     '정보 수정',
    saveEdit:        '저장',
    cancelEdit:      '취소',
    empno:           '사원번호',
    name:            '이름',
    dept:            '부서',
    position:        '직급',
    email:           '이메일',
    phone:           '연락처',
    hiredate:        '입사일',
    salary:          '급여',
    yearsOfService:  '근속기간',
    certificate:     '재직증명서',
    salarySlip:      '급여명세서',

    // 날씨
    weatherTitle:    '오늘 날씨',
    rainProb:        '강수확률',
    humidity:        '습도',
    windSpeed:       '풍속',
    wfhRecommend:    '☔ 오늘은 재택근무를 추천합니다!',
    weatherSource:   '📡 기상청 단기예보',
    citySelect:      '도시 선택',
    lat:             '위도',
    lng:             '경도',
    search:          '조회',

    // 뉴스 위젯
    newsTitle:       '업계 뉴스',
    newsKeyword:     '검색어',
    newsSearch:      '검색',
    newsLoading:     '뉴스 조회 중...',
    newsError:       '뉴스를 불러오지 못했습니다.',
    newsEmpty:       '검색 결과가 없습니다.',
    newsApiNotSet:   '네이버 뉴스 API 키가 설정되지 않았습니다.',
    newsMore:        '더보기',
    newsSource:      '출처',
    newsRefresh:     '새로고침',

    // 로그인
    loginTitle:      '직원 관리 시스템',
    loginId:         '아이디',
    loginPw:         '비밀번호',
    loginBtn:        '로그인',
    loginKakao:      '카카오로 로그인',
  },

  en: {
    // 상단바
    admin:        'Admin',
    employee:     'Employee',
    logout:       'Logout',
    adminSettings:'Admin Settings',
    lightMode:    'Switch to Light Mode',
    darkMode:     'Switch to Dark Mode',
    langToggle:   '한국어',

    // 사원 사이드바 메뉴
    menu_profile:    'My Profile',
    menu_attendance: 'Attendance',
    menu_worklog:    'Work Log',
    menu_todo:       'My Todo',
    menu_leave:      'Leave',
    menu_board:      'Board',
    menu_message:    'Messages',
    menu_folder:     'Shared Folder',
    menu_notice:     'Notice',
    menu_survey:     'Survey',
    menu_expense:    'Expense',

    // 사원 사이드바 카드
    sidebarTitle:    'Employee Menu',
    remainLeave:     'Remaining Leave',
    leaveDay:        'days',
    leaveUsed:       'Used {used} of {total} days',
    airQuality:      'Air Quality',
    loading:         'Loading...',
    maskWarn:        '😷 Mask recommended',
    apiKeyNeeded:    '🔑 API key required',

    // 프로필 페이지
    myProfile:       'My Profile',
    editProfile:     'Edit Profile',
    saveEdit:        'Save',
    cancelEdit:      'Cancel',
    empno:           'Employee No.',
    name:            'Name',
    dept:            'Department',
    position:        'Position',
    email:           'Email',
    phone:           'Phone',
    hiredate:        'Hire Date',
    salary:          'Salary',
    yearsOfService:  'Years of Service',
    certificate:     'Employment Certificate',
    salarySlip:      'Salary Slip',

    // 날씨
    weatherTitle:    "Today's Weather",
    rainProb:        'Rain Prob.',
    humidity:        'Humidity',
    windSpeed:       'Wind',
    wfhRecommend:    '☔ Work from Home recommended today!',
    weatherSource:   '📡 KMA Forecast',
    citySelect:      'City',
    lat:             'Lat',
    lng:             'Lng',
    search:          'Search',

    // 뉴스 위젯
    newsTitle:       'Industry News',
    newsKeyword:     'Keyword',
    newsSearch:      'Search',
    newsLoading:     'Loading news...',
    newsError:       'Failed to load news.',
    newsEmpty:       'No results found.',
    newsApiNotSet:   'Naver News API key is not configured.',
    newsMore:        'More',
    newsSource:      'Source',
    newsRefresh:     'Refresh',

    // 로그인
    loginTitle:      'Employee Management System',
    loginId:         'Username',
    loginPw:         'Password',
    loginBtn:        'Login',
    loginKakao:      'Login with Kakao',
  },
};

export default translations;
