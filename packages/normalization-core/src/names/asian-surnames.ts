/**
 * Comprehensive list of common Asian surnames for name order detection
 * 
 * In many Asian cultures (Chinese, Korean, Japanese, Vietnamese), the family name comes first.
 * This library helps detect when a name follows the family-name-first pattern.
 * 
 * Sources:
 * - Wikipedia lists of common surnames
 * - Government census data
 * - Academic research on naming patterns
 */

/**
 * Top 100 Chinese surnames (Pinyin romanization)
 * Covers ~85% of Chinese population
 */
export const CHINESE_SURNAMES = new Set([
  // Top 10 (covers ~40% of population)
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu',
  
  // 11-30
  'Xu', 'Sun', 'Zhu', 'Ma', 'Hu', 'Guo', 'Lin', 'He', 'Gao', 'Liang',
  'Zheng', 'Luo', 'Song', 'Xie', 'Tang', 'Han', 'Cao', 'Xu', 'Deng', 'Xiao',
  
  // 31-50
  'Feng', 'Zeng', 'Cheng', 'Cai', 'Peng', 'Pan', 'Yuan', 'Yu', 'Dong', 'Su',
  'Ye', 'Lu', 'Wei', 'Jiang', 'Tian', 'Du', 'Ding', 'Shen', 'Ren', 'Jiang',
  
  // 51-70
  'Fan', 'Cui', 'Liao', 'Shi', 'Fang', 'Zou', 'Xiong', 'Bai', 'Meng', 'Qin',
  'Qiu', 'Hou', 'Jiang', 'Yin', 'Xue', 'Yan', 'Duan', 'Lei', 'Long', 'Li',
  
  // 71-100
  'Tao', 'He', 'Mao', 'Shao', 'Wan', 'Gu', 'Lai', 'Kang', 'Jia', 'Qian',
  'Tang', 'Shi', 'Lian', 'Fu', 'Chang', 'Wen', 'Shi', 'Cong', 'Lai', 'Xiang',
  'Lu', 'Dai', 'Zhong', 'Xia', 'Gu', 'Fang', 'Shi', 'Xiong', 'Ji', 'Tan',
  
  // Additional common variants and Wade-Giles romanizations
  'Chang', 'Chao', 'Cheng', 'Chin', 'Chou', 'Chu', 'Chung', 'Fang', 'Feng',
  'Fu', 'Gao', 'Gong', 'Gu', 'Guan', 'Guo', 'Han', 'Hao', 'Hong', 'Hou',
  'Hsu', 'Hu', 'Hua', 'Huang', 'Hui', 'Huo', 'Ji', 'Jia', 'Jiang', 'Jin',
  'Kang', 'Kong', 'Lai', 'Lei', 'Leng', 'Liang', 'Liao', 'Lin', 'Ling', 'Liu',
  'Long', 'Lou', 'Lu', 'Luo', 'Ma', 'Mao', 'Mei', 'Meng', 'Mo', 'Mu',
  'Nie', 'Ning', 'Ouyang', 'Pan', 'Pang', 'Pei', 'Peng', 'Qi', 'Qian', 'Qiao',
  'Qin', 'Qiu', 'Qu', 'Quan', 'Rao', 'Ren', 'Rong', 'Ruan', 'Shang', 'Shao',
  'Shen', 'Sheng', 'Shi', 'Shu', 'Si', 'Song', 'Su', 'Sun', 'Tan', 'Tang',
  'Tao', 'Teng', 'Tian', 'Tong', 'Tu', 'Wan', 'Wang', 'Wei', 'Wen', 'Weng',
  'Wu', 'Xi', 'Xia', 'Xiang', 'Xiao', 'Xie', 'Xing', 'Xiong', 'Xu', 'Xue',
  'Yan', 'Yang', 'Yao', 'Ye', 'Yi', 'Yin', 'Ying', 'Yong', 'You', 'Yu',
  'Yuan', 'Yue', 'Yun', 'Zang', 'Zeng', 'Zhai', 'Zhang', 'Zhao', 'Zheng', 'Zhong',
  'Zhou', 'Zhu', 'Zhuge', 'Zou', 'Zuo',
]);

/**
 * Top Korean surnames
 * Covers ~70% of Korean population
 */
export const KOREAN_SURNAMES = new Set([
  // Top 3 (covers ~45% of population)
  'Kim', 'Lee', 'Park',
  
  // Top 10
  'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
  
  // Top 20
  'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Yoo', 'Hong',
  
  // Top 50
  'Jeon', 'Go', 'Moon', 'Yang', 'Son', 'Baek', 'Kwak', 'Heo', 'Yoo', 'Nam',
  'Shim', 'Noh', 'Ha', 'Joo', 'Bae', 'Kim', 'Chung', 'Ryu', 'Do', 'Pyo',
  'Ko', 'Seong', 'Cha', 'Chu', 'Woo', 'Koo', 'Min', 'Jin', 'Ji', 'Myung',
  
  // Common variants and alternative romanizations
  'Yi', 'Rhee', 'Chung', 'Jeong', 'Choe', 'Chung', 'Kang', 'Cho', 'Yun',
  'Chang', 'Lim', 'Im', 'Rim', 'Shim', 'Sim', 'Paik', 'Baik', 'Kwak', 'Gwak',
  'Huh', 'Hur', 'Heo', 'Nam', 'Roh', 'No', 'Noh', 'Joo', 'Ju', 'Bae', 'Pae',
  'Ryu', 'Ryoo', 'Yoo', 'Yu', 'Ko', 'Goh', 'Koh', 'Seong', 'Sung', 'Cha', 'Chah',
  'Choo', 'Joo', 'Woo', 'Ku', 'Gu', 'Goo', 'Min', 'Jin', 'Chi', 'Jee', 'Myeong',
]);

/**
 * Top Japanese surnames
 * Covers ~30% of Japanese population
 */
export const JAPANESE_SURNAMES = new Set([
  // Top 10 (covers ~10% of population)
  'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
  
  // Top 20
  'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Saito', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu',
  
  // Top 50
  'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hashimoto', 'Yamashita', 'Ishikawa', 'Nakajima', 'Maeda', 'Fujita',
  'Ogawa', 'Goto', 'Okada', 'Hasegawa', 'Murakami', 'Kondo', 'Ishii', 'Saito', 'Sakamoto', 'Endo',
  'Aoki', 'Fujii', 'Nishimura', 'Fukuda', 'Ota', 'Miura', 'Okamoto', 'Kaneko', 'Nakano', 'Harada',
  
  // Top 100
  'Fujiwara', 'Matsuda', 'Ueda', 'Nakagawa', 'Nakayama', 'Iwasaki', 'Takagi', 'Miyazaki', 'Watanabe', 'Uchida',
  'Takada', 'Hirano', 'Kojima', 'Kuroda', 'Sugiyama', 'Morita', 'Hara', 'Nomura', 'Kikuchi', 'Takeuchi',
  'Imai', 'Wada', 'Nakamura', 'Ishida', 'Ueno', 'Sakurai', 'Yokoyama', 'Miyamoto', 'Takano', 'Matsui',
  'Nakashima', 'Taniguchi', 'Otsuka', 'Maruyama', 'Imai', 'Takeda', 'Fujimoto', 'Kawaguchi', 'Kawasaki', 'Nakamura',
  
  // Common variants
  'Satoh', 'Saitoh', 'Itoh', 'Katoh', 'Gotoh', 'Endoh', 'Satou', 'Saitou', 'Itou', 'Katou',
]);

/**
 * Top Vietnamese surnames
 * Covers ~90% of Vietnamese population
 */
export const VIETNAMESE_SURNAMES = new Set([
  // Top 3 (covers ~60% of population)
  'Nguyen', 'Tran', 'Le',
  
  // Top 10
  'Pham', 'Hoang', 'Huynh', 'Vu', 'Vo', 'Phan', 'Truong',
  
  // Top 20
  'Bui', 'Do', 'Dang', 'Ngo', 'Duong', 'Ly', 'Dinh', 'Dao', 'Doan', 'Luong',
  
  // Additional common surnames
  'Trinh', 'Lam', 'Quach', 'Thai', 'Tong', 'To', 'Tran', 'Cao', 'Mac', 'Luu',
  'Phan', 'Ong', 'Tang', 'Khuu', 'Ha', 'Chu', 'Mai', 'Chau', 'Thach', 'Thao',
  
  // Common variants and alternative spellings
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Vũ', 'Võ', 'Phan', 'Trương',
  'Bùi', 'Đỗ', 'Đặng', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Đào', 'Đoàn', 'Lương',
]);

/**
 * Combined set of all Asian surnames for quick lookup
 */
export const ALL_ASIAN_SURNAMES = new Set([
  ...CHINESE_SURNAMES,
  ...KOREAN_SURNAMES,
  ...JAPANESE_SURNAMES,
  ...VIETNAMESE_SURNAMES,
]);

/**
 * Check if a name is a known Asian surname
 */
export function isAsianSurname(name: string): boolean {
  const normalized = name.trim();
  return ALL_ASIAN_SURNAMES.has(normalized);
}

/**
 * Detect which Asian culture a surname belongs to
 */
export function detectAsianCulture(surname: string): 'chinese' | 'korean' | 'japanese' | 'vietnamese' | null {
  const normalized = surname.trim();
  
  if (KOREAN_SURNAMES.has(normalized)) return 'korean';
  if (JAPANESE_SURNAMES.has(normalized)) return 'japanese';
  if (VIETNAMESE_SURNAMES.has(normalized)) return 'vietnamese';
  if (CHINESE_SURNAMES.has(normalized)) return 'chinese';
  
  return null;
}

/**
 * Get confidence score for Asian surname detection (0-100)
 * Higher score = more confident it's an Asian surname
 */
export function getAsianSurnameConfidence(surname: string): number {
  const normalized = surname.trim();
  
  // Very high confidence for top surnames
  const topSurnames = new Set([
    // Chinese top 10
    'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu',
    // Korean top 3
    'Kim', 'Lee', 'Park',
    // Japanese top 5
    'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe',
    // Vietnamese top 3
    'Nguyen', 'Tran', 'Le',
  ]);
  
  if (topSurnames.has(normalized)) return 95;
  if (ALL_ASIAN_SURNAMES.has(normalized)) return 85;
  
  return 0;
}
